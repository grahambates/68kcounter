export type Token = [number, string];

const separators = [" ", "\t", ",", ":"];

/**
 * Split text into tokens
 */
export default function tokenize(text: string): Token[] {
  let parenLevel = 0;
  let inDoubleQuotes = false;
  let inSingleQuotes = false;
  let started = false;
  let startIndex = 0;

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
        tokens.push([startIndex, text.slice(startIndex, i)]);
      }
      // Push rest of text as comment and done
      tokens.push([i, text.slice(i)]);
      return tokens;
    }

    if (char === "=") {
      if (started) {
        tokens.push([startIndex, text.slice(startIndex, i)]);
      }
      tokens.push([i, char]);
      started = false;
      continue;
    }

    if (separators.includes(char)) {
      if (started) {
        // End of token
        tokens.push([startIndex, text.slice(startIndex, i)]);
        started = false;
      }
    } else if (!started) {
      // First non-separator value - start new token
      started = true;
      startIndex = i;
    }
  }

  // Finish any token in progress
  if (started) {
    tokens.push([startIndex, text.slice(startIndex)]);
  }

  return tokens;
}
