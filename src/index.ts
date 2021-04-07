import { lookupTiming, Timing } from "./timings";
import { Operand, parseOperandsText } from "./operands";
import { Mnemonic, parseMnemonicText, Size } from "./mnemonics";
import { getWords } from "./words";

/** Parsed line of code */
export interface Line {
  text: string;
  label?: string;
  instruction?: Instruction;
  timings?: Timing | Timing[] | null;
  words?: number;
}

/** Logical statement from code */
export interface Instruction {
  mnemonic: Mnemonic;
  size: Size;
  source?: Operand;
  dest?: Operand;
}

/**
 * Variables to substitute in immediate expressions
 */
export type Vars = Record<string, number>;

export default function parse(input: string): Line[] {
  // TODO: extract and pass variables
  return input.split("\n").map((l) => parseLine(l));
}

/**
 * Parse line of code to extract any operation or label
 */
export function parseLine(text: string, vars: Vars = {}): Line {
  // Remove comments and split line on whitespace
  const [labelText, mnemText, opText] = text.split(";")[0].split(/\s+/);

  const label = labelText.replace(/:$/, "") || undefined;

  let instruction = mnemText && parseMnemonicText(mnemText);
  if (!instruction) {
    return { text, label };
  }

  if (opText) {
    instruction = {
      ...instruction,
      ...parseOperandsText(opText, vars),
    };
  }

  return {
    text,
    label,
    instruction,
    timings: lookupTiming(instruction),
    words: getWords(instruction),
  };
}
