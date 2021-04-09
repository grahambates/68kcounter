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

/**
 * Convert timing to string per the 68000 documentation
 *
 * clock(read/write)
 */
export const formatTiming = (timing: Timing): string =>
  `${timing.clock}(${timing.read}/${timing.write})`;

/**
 * Warning level timing/length display
 */
export enum Level {
  VHigh = "vhigh",
  High = "high",
  Med = "med",
  Low = "low",
}

/**
 * Get warning level for timing
 */
export function timingLevel(timing: Timing): Level {
  if (timing.clock > 30) {
    return Level.VHigh;
  }
  if (timing.clock > 20) {
    return Level.High;
  }
  if (timing.clock >= 12) {
    return Level.Med;
  }
  return Level.Low;
}

/**
 * Get warning level for word length
 */
export function lengthLevel(words: number): Level {
  if (words > 3) {
    return Level.VHigh;
  }
  if (words > 2) {
    return Level.High;
  }
  if (words === 2) {
    return Level.Med;
  }
  return Level.Low;
}

export interface Totals {
  /**
   * Does this show a range of values based on whether branches are followed or not?
   * i.e. are max and min different?
   */
  isRange: boolean;
  /** Maximum total times */
  max: Timing;
  /** Minimum total times */
  min: Timing;
  /** Total word length */
  words: number;
}

/**
 * Total timings and lengths across a range of lines
 */
export function calculateTotals(lines: Line[]): Totals {
  let words = 0;
  const min: Timing = { clock: 0, read: 0, write: 0 };
  const max: Timing = { clock: 0, read: 0, write: 0 };

  for (const line of lines) {
    if (line.words) {
      words += line.words;
    }
    const timing = line.timings;
    if (!timing) {
      continue;
    }

    const timings = Array.isArray(timing) ? timing : [timing];

    const clocks = timings.map((n) => n.clock);
    const reads = timings.map((n) => n.read);
    const writes = timings.map((n) => n.write);
    min.clock += Math.min(...clocks);
    min.read += Math.min(...reads);
    min.write += Math.min(...writes);
    max.clock += Math.max(...clocks);
    max.read += Math.max(...reads);
    max.write += Math.max(...writes);
  }

  const isRange =
    min.clock !== max.clock || min.read !== max.read || min.write !== max.write;

  return { min, max, isRange, words };
}
