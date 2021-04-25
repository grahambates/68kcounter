import {
  AddressingMode,
  AddressingModes,
  Directive,
  Directives,
  isDirective,
  isMnemonic,
  isQualifier,
  Mnemonic,
  Mnemonics,
  Qualifier,
  Qualifiers,
} from "./syntax";

export interface Token {
  text: string;
  type:
    | "Comment"
    | "Label"
    | "Mnemonic"
    | "Qualifier"
    | "Operand"
    | "Directive"
    | "String";
  start: number;
  end: number;
}

export interface MnemonicToken extends Token {
  type: "Mnemonic";
  value: Mnemonic;
}

export interface QualifierToken extends Token {
  type: "Qualifier";
  value: Qualifier;
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

export interface StringToken extends Token {
  type: "String";
  value: string;
}

/**
 * Map alternate to canonical mnemonics used in our mappings.
 */
const aliases: Record<string, string> = {
  // Non-standard mnemonics
  BLO: Mnemonics.BCS,
  DBLO: Mnemonics.DBCS,
  DBRA: Mnemonics.DBF,
  // Short qualifier => B
  S: Qualifiers.B,

  BLK: Directives.DCB,
};

const separators = [" ", "\t", ",", ":"];

/**
 * Split text into tokens
 */
export function tokenize(text: string): Token[] {
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

function getToken(text: string, start: number, separator = ""): Token {
  const end = start + text.length;
  const props = { text, start, end };
  let normalized = text.toUpperCase();
  if (aliases[normalized]) {
    normalized = aliases[normalized];
  }

  // Comment
  if (text[0] === ";" || text[0] === "*") {
    return { type: "Comment", ...props };
  }

  // Label
  if (start === 0) {
    return { type: "Label", ...props };
  }

  // Mnemonic
  if (isMnemonic(normalized)) {
    const token: MnemonicToken = {
      type: "Mnemonic",
      value: normalized,
      ...props,
    };
    return token;
  }

  // Directive
  if (isDirective(normalized)) {
    const token: DirectiveToken = {
      type: "Directive",
      value: normalized,
      ...props,
    };
    return token;
  }

  // Qualifier
  if (separator === "." && isQualifier(normalized)) {
    const token: QualifierToken = {
      type: "Qualifier",
      value: normalized,
      ...props,
    };
    return token;
  }

  // String
  if (
    (text[0] === "'" && text[text.length - 1] === "'") ||
    (text[0] === '"' && text[text.length - 1] === '"')
  ) {
    const token: StringToken = {
      type: "String",
      value: text.slice(1, text.length - 1),
      ...props,
    };
    return token;
  }

  // Operand
  const addressingMode = lookupAddressingMode(text);
  const token: OperandToken = {
    type: "Operand",
    addressingMode,
    ...props,
  };
  return token;
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
 * Look up type of an operand string
 */
export function lookupAddressingMode(operand: string): AddressingMode {
  const match = addressingModePatterns.find((t) => t.exp.exec(operand));
  return match ? match.type : AddressingModes.AbsL;
}

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
