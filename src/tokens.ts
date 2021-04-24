import {
  AddressingMode,
  Directive,
  Directives,
  isDirective,
  isMnemonic,
  isSize,
  Mnemonic,
  Mnemonics,
  Size,
  Sizes,
} from "./syntax";

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
