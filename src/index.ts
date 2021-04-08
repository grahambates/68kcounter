import { lookupTiming, Timing } from "./timings";
import { Operand, parseOperandsText } from "./operands";
import { Mnemonic, parseMnemonicText, mnemonicSizes, Size } from "./mnemonics";
import { getWords } from "./words";

/** Parsed line of code */
export interface Line {
  text: string;
  label?: string;
  instruction?: Instruction;
  timings?: Timing | Timing[] | null;
  words?: number;
}

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

  let timings = lookupTiming(instruction);

  if (!timings) {
    // Timing not found - try other possible sizes for this mnemonic
    for (const size of mnemonicSizes[instruction.mnemonic]) {
      timings = lookupTiming({ ...instruction, size });
      if (timings) {
        instruction.size = size;
        break;
      }
    }
  }

  if (!timings) {
    console.warn("Timing not found for instruction", instruction);
  }

  return {
    text,
    label,
    instruction,
    timings,
    words: getWords(instruction),
  };
}
