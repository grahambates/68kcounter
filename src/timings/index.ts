import { baseTimes, lookupTimes } from "./tables";
import {
  Qualifiers,
  AddressingMode,
  AddressingModes,
  Mnemonics,
  mnemonicGroups,
} from "../syntax";
import instructionQualifier from "../parse/instructionQualifier";
import { EffectiveAddressNode, InstructionStatement } from "../parse/nodes";
import evaluate, { Variables } from "../parse/evaluate";

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
  /** Known number or range */
  n?: number | [number, number];
}

/**
 * Look up timing information for a parsed instruction statement
 */
export function instructionTimings(
  statement: InstructionStatement,
  vars: Variables
): InstructionTiming | null {
  const key = buildKey(statement);
  if (!key || !timingMap.has(key)) {
    return null;
  }
  const calculation = { ...(timingMap.get(key) as Calculation) };
  const timings: Timing[] = [...calculation.base];

  const {
    opcode: { op },
    operands,
  } = statement;
  const source = operands[0];

  // Calculate n multiplier:
  if (calculation.multiplier) {
    // Shift
    if (mnemonicGroups.SHIFT.includes(op.name)) {
      if (source.mode === AddressingModes.Imm) {
        calculation.n = evaluate(source.text, vars) || [1, 8];
      } else {
        // Range for register
        calculation.n = [0, 63];
      }
    }
    // MULU
    else if (op.name === Mnemonics.MULU) {
      // n = the number of ones in the <ea>
      const value = evaluate(source.text, vars);
      if (source.mode === AddressingModes.Imm && value !== undefined) {
        calculation.n = 0;
        for (let i = 0; i < 16; i++) {
          if (value & (1 << i)) {
            calculation.n++;
          }
        }
      } else {
        calculation.n = [0, 16];
      }
    }
    // MULS
    else if (op.name === Mnemonics.MULS) {
      // n = concatenate the <ea> with a zero as the LSB;
      // n is the resultant number of 10 or 01 patterns in the 17-bit source;
      // i.e. worst case happens when the source is $5555
      const value = evaluate(source.text, vars);
      if (source.mode === AddressingModes.Imm && value !== undefined) {
        const binStr = "0" + (value << 1).toString(2);
        calculation.n =
          (binStr.match(/10/g)?.length ?? 0) +
          (binStr.match(/01/g)?.length ?? 0);
      } else {
        calculation.n = [0, 16];
      }
    }
    // MOVEM
    else if (op.name === Mnemonics.MOVEM) {
      const operand = operands.find((o) => o.mode === AddressingModes.RegList);
      calculation.n = operand && rangeN(operand.text);
    }

    // Apply multiplier:
    if (calculation.n) {
      // Range
      if (Array.isArray(calculation.n)) {
        for (const i in calculation.n) {
          const m = multiplyTiming(calculation.multiplier, calculation.n[i]);
          timings[i] = addTimings(calculation.base[0], m);
        }
      }
      // Single value
      else {
        const m = multiplyTiming(calculation.multiplier, calculation.n);
        for (const i in timings) {
          timings[i] = addTimings(timings[i], m);
        }
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
 * Build string key for map lookup
 */
function buildKey(statement: InstructionStatement): string | null {
  const { opcode, operands } = statement;
  if (!opcode) {
    return null;
  }
  let key = opcode.op.name;
  const qualifier = instructionQualifier(statement);
  if (qualifier) {
    key += "." + qualifier;
  }
  if (operands.length) {
    key +=
      " " + (operands as EffectiveAddressNode[]).map((o) => o.mode).join(",");
  }
  return key;
}

// Flatten table into key/value for simple lookup by instruction string
// e.g.
// "MOVE.L Dn,Dn": [4, 1, 0]

const timingMap = new Map<string, Calculation>();

for (const row of baseTimes) {
  const [mnemonics, qualifiers, operands, base, multiplier] = row;
  for (const mnemonic of mnemonics) {
    for (const qualifier of qualifiers) {
      let key = String(mnemonic);
      if (qualifier) {
        key += "." + qualifier;
      }
      const eaSize = qualifier === Qualifiers.L ? 1 : 0;
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