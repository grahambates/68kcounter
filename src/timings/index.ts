import { baseTimes, lookupTimes } from "./tables";
import {
  Qualifiers,
  AddressingMode,
  AddressingModes,
  Mnemonics,
  mnemonicGroups,
  Mnemonic,
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
  values: Timing[];
  labels: string[];
  calculation?: Calculation;
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

export function popCount(x: number): number {
  x -= (x >> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >> 2) & 0x33333333);
  x = (x + (x >> 4)) & 0x0f0f0f0f;
  x += x >> 8;
  x += x >> 16;
  return x & 0x7f;
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
        calculation.n = popCount(value);
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
        calculation.n = popCount((value ^ (value << 1)) & 0xffff);
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

  // Add labels for multiple values
  const labels = timings.length > 1 ? timingLabels(op.name) : [];

  return { values: timings, labels, calculation };
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
 * Get text labels for multiple timings
 */
export function timingLabels(op: Mnemonic): string[] {
  if ([...mnemonicGroups.SCC, ...mnemonicGroups.BCC].includes(op)) {
    return ["Taken", "Not taken"];
  }
  if (mnemonicGroups.DBCC.includes(op)) {
    return ["Taken", "Not taken", "Expired"];
  }
  if (op === Mnemonics.CHK) {
    return ["No trap", "Trap >", "Trap <"];
  }
  if (op === Mnemonics.TRAPV) {
    return ["No trap", "Trap"];
  }
  // Default
  return ["Min", "Max"];
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
          let ea = lookupTimes[o][eaSize];
          // Special cases:
          if (mnemonic === Mnemonics.TAS && o === AddressingModes.AbsW) {
            ea = [8, 1, 0];
          }
          if (
            (mnemonic === Mnemonics.TAS ||
              mnemonic === Mnemonics.CHK ||
              mnemonic === Mnemonics.MULS ||
              mnemonic === Mnemonics.MULU) &&
            o === AddressingModes.AbsL
          ) {
            ea = [12, 2, 0];
          }
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
