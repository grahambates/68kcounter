import { Parser } from "expr-eval";
import { Calculation, instructionTimings, Timing } from "./timings";
import instructionLength from "./instructionLength";
import {
  isMnemonic,
  isSize,
  Mnemonics,
  Mnemonic,
  AddressingModes,
  AddressingMode,
  Sizes,
  Size,
} from "./syntax";

export interface Line {
  text: string;
  label?: Token;
  comment?: Token;
  instruction?: Instruction;
  timings?: Timing[] | null;
  calculation?: Calculation;
  words?: number;
}

export interface Instruction {
  mnemonic: MnemonicToken;
  size?: SizeToken;
  operands: OperandToken[];
}

export interface Token {
  text: string;
  type: TokenType;
  start: number;
  end: number;
}

export type TokenType =
  | "Unknown"
  | "Comment"
  | "Label"
  | "Mnemonic"
  | "Size"
  | "Operand";

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

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  input = input.replace(/\r\n/, "\n");
  input = input.replace(/\r/, "\n");
  return input.split("\n").map((l) => parseLine(l));
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
  if (mnemonic) {
    const size = tokens.find((t) => t.type === "Size") as SizeToken;

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

    const timingResult = instructionTimings(line.instruction);
    if (timingResult) {
      line.timings = timingResult.timings;
      line.calculation = timingResult.calculation;
    }

    line.words = instructionLength(line.instruction);
  }

  return line;
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
  } else if (separator === "." && isSize(normalized)) {
    const token: SizeToken = { type: "Size", value: normalized, ...props };
    return token;
  }

  return { type: "Unknown", ...props };
}

function tokenize(text: string): Token[] {
  let parenLevel = 0;
  let started = false;
  let startIndex = 0;
  let separator = "";

  const tokens: Token[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    // Comment start:
    if (!parenLevel && (char === ";" || (char === "*" && !started))) {
      // Finish any token in progress
      if (started) {
        tokens.push(getToken(text.slice(startIndex, i), startIndex, separator));
      }
      // Push rest of text as comment and done
      tokens.push(getToken(text.slice(i), i));
      return tokens;
    }

    // Update parenthesis nesting level
    if (char === "(") {
      parenLevel++;
    } else if (char === ")") {
      parenLevel--;
    }

    const isSeparator =
      char === " " ||
      char === "\t" ||
      char === "," ||
      (char === "." &&
        // Don't treat '.' as a separator on the first char - it will be part of a local label
        startIndex &&
        // '.' Is only a valid separator for Mnemonic. Ignore once we've found one.
        !tokens.find((t) => t.type === "Mnemonic"));

    if (!parenLevel && isSeparator) {
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
