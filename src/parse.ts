import { Parser } from "expr-eval";
import { Calculation, instructionTimings, Timing } from "./timings";
import instructionLength from "./instructionLength";
import {
  isMnemonic,
  isSize,
  isDirective,
  Mnemonics,
  Mnemonic,
  AddressingModes,
  AddressingMode,
  Sizes,
  Size,
  Directives,
  Directive,
  mnemonicGroups,
  sizeBytes,
} from "./syntax";

export interface Line {
  text: string;
  label?: Token;
  comment?: Token;

  instruction?: Instruction;
  directive?: {
    directive: DirectiveToken;
    size?: SizeToken;
    args?: Token[];
  };

  timings?: Timing[] | null;
  calculation?: Calculation;
  words?: number;
  bytes?: number;
}

export interface Instruction {
  mnemonic: MnemonicToken;
  size?: SizeToken;
  operands: OperandToken[];
}

export interface Token {
  text: string;
  type: string;
  start: number;
  end: number;
}

export interface MnemonicToken extends Token {
  type: "Mnemonic";
  value: Mnemonic;
}

export interface SizeToken extends Token {
  type: "Size";
  value: Size;
}

export interface OperandToken extends Token {
  type: "Operand";
  addressingMode: AddressingMode;
  value?: number;
}

export interface DirectiveToken extends Token {
  type: "Directive";
  value: Directive;
}

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  input = input.replace(/\r\n/, "\n");
  input = input.replace(/\r/, "\n");
  const lines = input.split("\n").map((l) => parseLine(l));
  const vars: Record<string, number> = {};
  const assignments: Directive[] = [
    Directives["="],
    Directives.EQU,
    Directives.FEQU,
  ];
  for (const i in lines) {
    const line = lines[i];

    if (line.directive) {
      const { directive, size, args } = line.directive;
      // Assignment:
      if (
        line.label &&
        assignments.includes(directive.value) &&
        args &&
        args[0]
      ) {
        const value = evalImmediate(args[0].text, vars);
        if (value) {
          vars[line.label.text] = value;
        }
        continue;
      }

      // Memory:
      // TODO:
      // don't add bytes if in BSS?
      // DX
      // DR

      // DC:
      if (directive.value === Directives.DC && size && args) {
        if (size.value === Sizes.B) {
          line.bytes = byteCount(args);
        } else {
          line.bytes = args.length * sizeBytes[size.value];
        }
      } else if (directive.value === Directives.DB && args) {
        line.bytes = byteCount(args);
      } else if (directive.value === Directives.DW && args) {
        line.bytes = args.length * 2;
      } else if (directive.value === Directives.DL && args) {
        line.bytes = args.length * 4;
      }
      // DCB / DS:
      else if (
        (directive.value === Directives.DCB ||
          directive.value === Directives.DS) &&
        size &&
        args &&
        args[0]
      ) {
        const n = evalImmediate(args[0].text, vars);
        if (n) {
          const bytes = sizeBytes[size.value];
          line.bytes = bytes * n;
        }
      }
    }

    // Instruction:
    if (line.instruction) {
      const { mnemonic, operands } = line.instruction;

      // Evaluate immediate values where required using variables
      if (mnemonicGroups.SHIFT.includes(mnemonic.value)) {
        const mode = operands[0].addressingMode;
        if (mode === AddressingModes.Imm) {
          operands[0].value = evalImmediate(operands[0].text, vars);
        }
      }

      const timingResult = instructionTimings(line.instruction);
      if (timingResult) {
        line.timings = timingResult.timings;
        line.calculation = timingResult.calculation;
      }

      line.words = instructionLength(line.instruction);
      line.bytes = line.words * 2;
    }
  }
  return lines;
}

/**
 * Parse a single line of ASM code
 */
export function parseLine(text: string): Line {
  const line: Line = { text };

  const tokens = tokenize(text);
  if (!tokens.length) {
    return line;
  }

  line.comment = tokens.find((t) => t.type === "Comment");
  line.label = tokens.find((t) => t.type === "Label");

  // Check if instruction:
  const mnemonic = tokens.find((t) => t.type === "Mnemonic") as MnemonicToken;
  const size = tokens.find((t) => t.type === "Size") as SizeToken;
  if (mnemonic) {
    const operands = tokens
      .filter((t) => t.type === "Unknown")
      .map((t) => {
        const token: OperandToken = {
          ...t,
          type: "Operand",
          addressingMode: lookupAddressingMode(t.text),
        };
        return token;
      });

    line.instruction = { mnemonic, size, operands };
    return line;
  }

  const directive = tokens.find(
    (t) => t.type === "Directive"
  ) as DirectiveToken;
  if (directive) {
    const args = tokens.filter((t) => t.type === "Unknown");
    line.directive = {
      directive,
      size,
      args,
    };
  }

  return line;
}

/**
 * Get byte count for a list of args on dc.b / db
 *
 * Handles quoted strings as well as individual byte values.
 */
function byteCount(args: Token[]): number {
  let count = 0;
  for (const arg of args) {
    if (arg.text.match(/^['"].*['"]$/)) {
      count += arg.text.length - 2;
    } else {
      count++;
    }
  }
  return count;
}

function getToken(text: string, start: number, separator = ""): Token {
  const end = start + text.length;
  const props = { text, start, end };
  let normalized = text.toUpperCase();
  if (aliases[normalized]) {
    normalized = aliases[normalized];
  }

  // Identify know token types
  if (text[0] === ";" || text[0] === "*") {
    return { type: "Comment", ...props };
  } else if (start === 0) {
    return { type: "Label", ...props };
  } else if (isMnemonic(normalized)) {
    const token: MnemonicToken = {
      type: "Mnemonic",
      value: normalized,
      ...props,
    };
    return token;
  } else if (isDirective(normalized)) {
    const token: DirectiveToken = {
      type: "Directive",
      value: normalized,
      ...props,
    };
    return token;
  } else if (separator === "." && isSize(normalized)) {
    const token: SizeToken = { type: "Size", value: normalized, ...props };
    return token;
  }

  return { type: "Unknown", ...props };
}

const separators = [" ", "\t", ",", ":"];

function tokenize(text: string): Token[] {
  let parenLevel = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let started = false;
  let startIndex = 0;
  let separator = "";

  const tokens: Token[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Toggle quoting
    if (!inSingleQuotes && char === '"') {
      inDoubleQuotes = !inDoubleQuotes;
    }
    if (!inDoubleQuotes && char === "'") {
      inSingleQuotes = !inSingleQuotes;
    }
    const inQuotes = inDoubleQuotes || inSingleQuotes;

    // Update parenthesis nesting level
    if (!inQuotes) {
      if (char === "(") {
        parenLevel++;
      } else if (char === ")") {
        parenLevel--;
      }
    }

    if (inQuotes || parenLevel) {
      if (!started) {
        started = true;
        startIndex = i;
      }
      continue;
    }

    // Comment start:
    if (char === ";" || (char === "*" && !started)) {
      // Finish any token in progress
      if (started) {
        tokens.push(getToken(text.slice(startIndex, i), startIndex, separator));
      }
      // Push rest of text as comment and done
      tokens.push(getToken(text.slice(i), i));
      return tokens;
    }

    if (char === "=") {
      if (started) {
        tokens.push(getToken(text.slice(startIndex, i), startIndex, separator));
      }
      tokens.push(getToken("=", i));
      started = false;
      continue;
    }

    const isSeparator =
      separators.includes(char) ||
      (char === "." &&
        // Don't treat '.' as a separator on the first char - it will be part of a local label
        startIndex &&
        // '.' Is only a valid separator for Mnemonic. Ignore once we've found one.
        !tokens.find((t) => t.type === "Mnemonic"));

    if (isSeparator) {
      if (started) {
        // End of token
        tokens.push(getToken(text.slice(startIndex, i), startIndex, separator));
        started = false;
      }
      separator = char;
    } else if (!started) {
      // First non-separator value - start new token
      started = true;
      startIndex = i;
    }
  }

  // Finish any token in progress
  if (started) {
    tokens.push(getToken(text.slice(startIndex), startIndex, separator));
  }

  return tokens;
}

/**
 * Map alternate to canonical mnemonics used in our mappings.
 */
const aliases: Record<string, string> = {
  // Non-standard mnemonics
  BLO: Mnemonics.BCS,
  DBLO: Mnemonics.DBCS,
  DBRA: Mnemonics.DBF,
  // Short size => B
  S: Sizes.B,

  BLK: Directives.DCB,
};

/**
 * Calculate timing n value from register range used in MOVEM
 */
export function rangeN(range: string): number {
  return range.split("/").reduce((acc, v) => {
    const [from, to] = v.split("-").map((n) => {
      const t = n[0].toUpperCase();
      return parseInt(n.substr(1), 10) + (t === "A" ? 8 : 0);
    });
    return acc + (to ? to - from + 1 : 1);
  }, 0);
}

/**
 * Try to evaluate immediate operand text to a number
 *
 * @param val Text value
 * @param vars Optional variables to substitute in expression
 */
export function evalImmediate(
  val: string,
  vars: Record<string, number> = {}
): number | undefined {
  val = val.replace(/^#/, "").replace("$", "0x").replace("%", "0b");
  // TODO: support octal
  // .replace("@", "0");
  // TODO: support binary ops
  try {
    return Parser.evaluate(val, vars);
  } catch (e) {
    // ignore
  }
}

/**
 * Look up type of an operand string
 */
export function lookupAddressingMode(operand: string): AddressingMode {
  const match = addressingModePatterns.find((t) => t.exp.exec(operand));
  return match ? match.type : AddressingModes.AbsL;
}

// Common regex components
const dn = "(d[0-7])";
const an = "(a[0-7]|sp)";
const rn = "([ad][0-7]|sp)";
const pc = "pc";
const op = "\\(\\s*";
const cp = "\\s*\\)";
const comma = "\\s*,\\s*";
const idx = `${rn}(\\.(w|l))?`;

/**
 * Regular expressions to identify operand type from text.
 */
const addressingModePatterns: { type: AddressingMode; exp: RegExp }[] = [
  { type: AddressingModes.Dn, exp: new RegExp(`^${dn}$`, "i") },
  { type: AddressingModes.An, exp: new RegExp(`^${an}$`, "i") },
  {
    type: AddressingModes.AnIndir,
    exp: new RegExp(`^${op + an + cp}$`, "i"),
  },
  {
    type: AddressingModes.AnPostInc,
    // (An)+
    exp: new RegExp(`^${op + an + cp}\\+$`, "i"),
  },
  {
    type: AddressingModes.AnPreDec,
    // -(An)
    exp: new RegExp(`^-${op + an + cp}$`, "i"),
  },
  {
    type: AddressingModes.AnDispIx,
    // An,Idx)
    exp: new RegExp(an + comma + idx + cp, "i"),
  },
  {
    type: AddressingModes.AnDisp,
    exp: new RegExp(
      // d(An) | (d,An)
      `(\\w${op + an}|${op}\\w+${comma + an + cp}$)`,
      "i"
    ),
  },
  {
    type: AddressingModes.PcDispIx,
    // PC,Idx)
    exp: new RegExp(pc + comma + idx + cp, "i"),
  },
  {
    type: AddressingModes.PcDisp,
    exp: new RegExp(
      // d(PC) | (d,PC)
      `(\\w${op + pc}|${op}\\w+${comma + pc + cp}$)`,
      "i"
    ),
  },
  { type: AddressingModes.Imm, exp: /^#./i },
  {
    type: AddressingModes.RegList,
    // Rn[/-]Rn
    exp: new RegExp(`${rn}[\\/-]${rn}`, "i"),
  },
  { type: AddressingModes.AbsW, exp: /\.W$/i },
];
