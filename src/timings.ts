import { Instruction, evalImmediate, rangeN } from "./parse";
import { baseTimes, lookupTimes } from "./timingTables";
import {
  Sizes,
  AddressingMode,
  AddressingModes,
  Mnemonics,
  mnemonicGroups,
} from "./syntax";
import instructionSize from "./instructionSize";

/**
 * Timing vector:
 * cycles, reads, writes
 */
export type Timing = [number, number, number];

/**
 * Result of timing lookup for an instruction
 */
export interface InstructionTiming {
  timings: Timing[];
  calculation: Calculation;
}

/**
 * Describes how the timings are calculated
 */
export interface Calculation {
  base: Timing[];
  ea?: Timing;
  multiplier?: Timing;
  n?: number;
}

/**
 * Look up timing information for a parsed instruction
 */
export function instructionTimings(
  instruction: Instruction
): InstructionTiming | null {
  const key = buildKey(instruction);
  if (!key || !timingMap.has(key)) {
    return null;
  }
  const calculation = { ...(timingMap.get(key) as Calculation) };
  const timings: Timing[] = [...calculation.base];

  // Apply n multiplier
  if (calculation.multiplier) {
    const { mnemonic, operands } = instruction;

    if (mnemonicGroups.SHIFT.includes(mnemonic.value)) {
      const mode = operands[0].addressingMode;
      if (mode === AddressingModes.Imm) {
        calculation.n = evalImmediate(operands[0].text) || 8; // Default to maximum for immediate
      } else {
        calculation.n = 63; // Maximum value for register
      }
    } else if (mnemonic.value === Mnemonics.MOVEM) {
      calculation.n = rangeN(operands[0].text);
    }

    if (calculation.n) {
      const m = multiplyTiming(calculation.multiplier, calculation.n);
      for (const i in timings) {
        timings[i] = addTimings(timings[i], m);
      }
    }
  }

  // Add effective address lookup
  if (calculation.ea) {
    for (const i in timings) {
      timings[i] = addTimings(timings[i], calculation.ea);
    }
  }

  return { timings, calculation };
}

/**
 * Convert timing to string per the 68000 documentation
 *
 * clock(read/write)
 */
export const formatTiming = (timing: Timing): string =>
  `${timing[0]}(${timing[1]}/${timing[2]})`;

/**
 * Add two timing vectors
 */
export function addTimings(a: Timing, b: Timing): Timing {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Multiply a timing vector by a scalar value
 */
export function multiplyTiming(t: Timing, scalar: number): Timing {
  return [t[0] * scalar, t[1] * scalar, t[2] * scalar];
}

/**
 * Build string key for map lookup
 */
function buildKey(instruction: Instruction): string | null {
  const { mnemonic, operands } = instruction;
  let key = mnemonic.value;
  const size = instructionSize(instruction);
  if (size) {
    key += "." + size;
  }
  if (operands.length) {
    key += " " + operands.map((o) => o.addressingMode).join(",");
  }
  return key;
}

// Flatten table into key/value for simple lookup by instruction string
// e.g.
// "MOVE.L Dn,Dn": [4, 1, 0]

const timingMap = new Map<string, Calculation>();

for (const row of baseTimes) {
  const [mnemonics, sizes, operands, base, multiplier] = row;
  for (const mnemonic of mnemonics) {
    for (const size of sizes) {
      let key = String(mnemonic);
      if (size) {
        key += "." + size;
      }
      const eaSize = size === Sizes.L ? 1 : 0;
      let o: AddressingMode;

      if (Array.isArray(operands[0])) {
        // EA lookup in source
        for (o of operands[0]) {
          const ea = lookupTimes[o][eaSize];
          let k = key + " " + o;
          if (operands[1]) {
            k += "," + operands[1];
          }
          timingMap.set(k, { base, ea, multiplier });
        }
      } else if (Array.isArray(operands[1])) {
        // EA lookup in dest
        for (o of operands[1]) {
          const ea = lookupTimes[o][eaSize];
          const k = key + " " + operands[0] + "," + o;
          timingMap.set(k, { base, ea, multiplier });
        }
      } else {
        // Regular operands
        if (operands.length) {
          key += " " + operands.join(",");
        }
        timingMap.set(key, { base: base, multiplier });
      }
    }
  }
}
