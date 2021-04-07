import { lookupTiming, Timing } from "./timings";
import { Operand, parseOperandsText } from "./operands";
import { Instruction, parseInstructionText, Size } from "./instructions";
import { getWords } from "./words";

/** Parsed line of code */
export interface Line {
  text: string;
  label?: string;
  statement?: Statement;
  timings?: Timing | Timing[] | null;
  words?: number;
}

/** Logical statement from code */
export interface Statement {
  instruction: Instruction;
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
  const [labelText, instText, opText] = text.split(";")[0].split(/\s+/);

  const label = labelText.replace(/:$/, "") || undefined;

  let statement = instText && parseInstructionText(instText);
  if (!statement) {
    return { text, label };
  }

  if (opText) {
    statement = {
      ...statement,
      ...parseOperandsText(opText, vars),
    };
  }

  return {
    text,
    label,
    statement,
    timings: lookupTiming(statement),
    words: getWords(statement),
  };
}
