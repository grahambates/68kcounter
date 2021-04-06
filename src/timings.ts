import { Statement } from ".";
import { OperandType } from "./operands";
import { Instruction, InstructionSize } from "./instructions";

/**
 * Describes timing information for a given instruction
 */
export interface Timing {
  clock: number;
  read: number;
  write: number;
}

/**
 * Look up timing information for a parsed operation
 */
export function lookupTiming(op: Statement): Timing | Timing[] | null {
  const { instruction, size, source, dest } = op;
  const instructionTiming = instructionTimings[instruction];

  // Convert operands list to string for use as key
  const key =
    [source, dest]
      .map((o) => o && o.type)
      .filter(Boolean)
      .join(",") || NONE;

  // Try specified / default size:
  const sizeTiming = instructionTiming[size];
  if (sizeTiming && sizeTiming[key]) {
    return applyNMultiple(sizeTiming[key], op.n);
  }

  // Use first matching size if specified size/operands aren't found in table:
  for (const s in instructionTiming) {
    const sizeTiming = instructionTiming[s as InstructionSize];
    if (sizeTiming && sizeTiming[key]) {
      return applyNMultiple(sizeTiming[key], op.n);
    }
  }
  return null;
}

export function formatTiming(timing: Timing): string {
  return `${timing.clock}(${timing.read}/${timing.write})`;
}

/**
 * Extend Timing internally to include info about n multipliers
 */
type TimingN = Timing & TimingNOpts;

/** Optional n multiplier properties */
type TimingNOpts = {
  /** clock += n*x */
  nClock?: number;
  /** read += n*x */
  nRead?: number;
  /** write += n*x */
  nWrite?: number;
};

/**
 * Apply n multipliers to return a simple timing object
 *
 * @param timing timing object with optional n multipliers
 * @param n Value from operands which can influence the total timings
 */
export function applyN(timing: TimingN, n: number): Timing {
  let { clock, read, write } = timing;
  if (timing.nClock) {
    clock += n * timing.nClock;
  }
  if (timing.nRead) {
    read += n * timing.nRead;
  }
  if (timing.nWrite) {
    write += n * timing.nWrite;
  }
  return { clock, read, write };
}

function applyNMultiple(
  timing: Timing | Timing[],
  n?: number
): Timing | Timing[] {
  if (!n) {
    return timing;
  }
  return Array.isArray(timing)
    ? timing.map((t) => applyN(t, n))
    : applyN(timing, n);
}

/**
 * Maps comma separated ArgTypes to Timing(s)
 *
 * e.g. `"#xxx,Dn": { clock: 3, read: 1, write: 0 }`
 * Can be array of timings in case of branch followed true/false
 */
type TimingMap = Record<string, TimingN | TimingN[]>;

// Value to use for key in TimingMap for instructions with no operands
const NONE = "<none>";

/**
 * Factory function for timing info
 */
const timing = (
  clock: number,
  read: number,
  write: number,
  opts: TimingNOpts = {}
): TimingN => ({
  clock,
  read,
  write,
  ...opts,
});

/**
 * Add together two timing objects
 */
function addTimings(a: TimingN, b: TimingN): TimingN {
  return {
    clock: a.clock + b.clock,
    read: a.read + b.read,
    write: a.write + b.write,
    // Only one of the timings will have options set
    nClock: a.nClock || b.nClock,
    nRead: a.nRead || b.nRead,
    nWrite: a.nWrite || b.nWrite,
  };
}

// Effective Address Calculation Times:

type EaTimings = Record<EaSize, Timing>;
enum EaSize {
  WordByte = "wordByte",
  Long = "long",
}

const eaMem: Record<string, EaTimings> = {
  [OperandType.Indirect]: {
    wordByte: timing(4, 1, 0),
    long: timing(8, 2, 0),
  },
  [OperandType.IndirectPost]: {
    wordByte: timing(4, 1, 0),
    long: timing(8, 2, 0),
  },
  [OperandType.IndirectPre]: {
    wordByte: timing(6, 1, 0),
    long: timing(10, 2, 0),
  },
  [OperandType.IndirectDisp]: {
    wordByte: timing(8, 2, 0),
    long: timing(12, 3, 0),
  },
  [OperandType.IndirectIx]: {
    wordByte: timing(10, 2, 0),
    long: timing(14, 3, 0),
  },
  [OperandType.IndirectPcDisp]: {
    wordByte: timing(8, 2, 0),
    long: timing(12, 3, 0),
  },
  [OperandType.IndirectPcIx]: {
    wordByte: timing(10, 2, 0),
    long: timing(14, 3, 0),
  },
  [OperandType.AbsoluteW]: {
    wordByte: timing(8, 2, 0),
    long: timing(12, 3, 0),
  },
  [OperandType.AbsoluteL]: {
    wordByte: timing(12, 3, 0),
    long: timing(16, 4, 0),
  },
};

const eaDirectImmediate: Record<string, EaTimings> = {
  [OperandType.DirectData]: {
    wordByte: timing(0, 0, 0),
    long: timing(0, 0, 0),
  },
  [OperandType.DirectAddr]: {
    wordByte: timing(0, 0, 0),
    long: timing(0, 0, 0),
  },
  [OperandType.Immediate]: {
    wordByte: timing(4, 1, 0),
    long: timing(8, 2, 0),
  },
};

const eaAll: Record<string, EaTimings> = {
  ...eaDirectImmediate,
  ...eaMem,
};

// TimingMap builders to iterate over EA types and add to a base timing:
// Multiple versions depending on whether EA is first, second or only param and separate
// groups for Memory vs. Direct or Immediate types as these can have a different
// base value.

const unaryMem = (base: Timing, size: EaSize = EaSize.WordByte): TimingMap =>
  Object.keys(eaMem).reduce((acc, k) => {
    acc[k] = addTimings(eaMem[k][size], base);
    return acc;
  }, {} as TimingMap);

const sourceEa = (
  base: Timing,
  dest: OperandType,
  size: EaSize = EaSize.WordByte
): TimingMap =>
  Object.keys(eaAll).reduce((acc, k) => {
    acc[k + "," + dest] = addTimings(eaAll[k][size], base);
    return acc;
  }, {} as TimingMap);

const sourceMem = (
  base: Timing,
  dest: OperandType,
  size: EaSize = EaSize.WordByte
) =>
  Object.keys(eaMem).reduce((acc, k) => {
    acc[k + "," + dest] = addTimings(eaMem[k][size], base);
    return acc;
  }, {} as TimingMap);

const sourceDirectImmediate = (
  base: Timing,
  dest: OperandType,
  size: EaSize = EaSize.WordByte
) =>
  Object.keys(eaDirectImmediate).reduce((acc, k) => {
    acc[k + "," + dest] = addTimings(eaDirectImmediate[k][size], base);
    return acc;
  }, {} as TimingMap);

const destMem = (
  base: Timing,
  source: OperandType,
  size: EaSize = EaSize.WordByte
) =>
  Object.keys(eaMem).reduce((acc, k) => {
    acc[source + "," + k] = addTimings(eaMem[k][size], base);
    return acc;
  }, {} as TimingMap);

// Build maps for each instruction / size:

const moveBW: TimingMap = {
  "Dn,Dn": timing(4, 1, 0),
  "Dn,An": timing(4, 1, 0),
  "Dn,(An)": timing(8, 1, 1),
  "Dn,(An)+": timing(8, 1, 1),
  "Dn,-(An)": timing(8, 1, 1),
  "Dn,d(An)": timing(12, 2, 1),
  "Dn,d(An,ix)": timing(14, 2, 1),
  "Dn,xxx.W": timing(12, 2, 1),
  "Dn,xxx.L": timing(16, 3, 1),
  "An,Dn": timing(4, 1, 0),
  "An,An": timing(4, 1, 0),
  "An,(An)": timing(8, 1, 1),
  "An,(An)+": timing(8, 1, 1),
  "An,-(An)": timing(8, 1, 1),
  "An,d(An)": timing(12, 2, 1),
  "An,d(An,ix)": timing(14, 2, 1),
  "An,xxx.W": timing(12, 2, 1),
  "An,xxx.L": timing(16, 3, 1),
  "(An),Dn": timing(8, 2, 0),
  "(An),An": timing(8, 2, 0),
  "(An),(An)": timing(12, 2, 1),
  "(An),(An)+": timing(12, 2, 1),
  "(An),-(An)": timing(12, 2, 1),
  "(An),d(An)": timing(16, 3, 1),
  "(An),d(An,ix)": timing(18, 3, 1),
  "(An),xxx.W": timing(16, 3, 1),
  "(An),xxx.L": timing(20, 4, 1),
  "(An)+,Dn": timing(8, 2, 0),
  "(An)+,An": timing(8, 2, 0),
  "(An)+,(An)": timing(12, 2, 1),
  "(An)+,(An)+": timing(12, 2, 1),
  "(An)+,-(An)": timing(12, 2, 1),
  "(An)+,d(An)": timing(16, 3, 1),
  "(An)+,d(An,ix)": timing(18, 3, 1),
  "(An)+,xxx.W": timing(16, 3, 1),
  "(An)+,xxx.L": timing(20, 4, 1),
  "-(An),Dn": timing(10, 2, 0),
  "-(An),An": timing(10, 2, 0),
  "-(An),(An)": timing(14, 2, 1),
  "-(An),(An)+": timing(14, 2, 1),
  "-(An),-(An)": timing(14, 2, 1),
  "-(An),d(An)": timing(18, 3, 1),
  "-(An),d(An,ix)": timing(20, 4, 1),
  "-(An),xxx.W": timing(18, 3, 1),
  "-(An),xxx.L": timing(22, 4, 1),
  "d(An),Dn": timing(12, 3, 0),
  "d(An),An": timing(12, 3, 0),
  "d(An),(An)": timing(16, 3, 1),
  "d(An),(An)+": timing(16, 3, 1),
  "d(An),-(An)": timing(16, 3, 1),
  "d(An),d(An)": timing(20, 4, 1),
  "d(An),d(An,ix)": timing(22, 4, 1),
  "d(An),xxx.W": timing(20, 4, 1),
  "d(An),xxx.L": timing(24, 5, 1),
  "d(An,ix),Dn": timing(14, 3, 0),
  "d(An,ix),An": timing(14, 3, 0),
  "d(An,ix),(An)": timing(18, 3, 1),
  "d(An,ix),(An)+": timing(18, 3, 1),
  "d(An,ix),-(An)": timing(18, 3, 1),
  "d(An,ix),d(An)": timing(22, 4, 1),
  "d(An,ix),d(An,ix)": timing(24, 4, 1),
  "d(An,ix),xxx.W": timing(22, 4, 1),
  "d(An,ix),xxx.L": timing(26, 5, 1),
  "xxx.W,Dn": timing(12, 3, 0),
  "xxx.W,An": timing(12, 3, 0),
  "xxx.W,(An)": timing(16, 3, 1),
  "xxx.W,(An)+": timing(16, 3, 1),
  "xxx.W,-(An)": timing(16, 3, 1),
  "xxx.W,d(An)": timing(20, 4, 1),
  "xxx.W,d(An,ix)": timing(22, 4, 1),
  "xxx.W,xxx.W": timing(20, 4, 1),
  "xxx.W,xxx.L": timing(24, 5, 1),
  "xxx.L,Dn": timing(16, 4, 0),
  "xxx.L,An": timing(16, 4, 0),
  "xxx.L,(An)": timing(20, 4, 1),
  "xxx.L,(An)+": timing(20, 4, 1),
  "xxx.L,-(An)": timing(20, 4, 1),
  "xxx.L,d(An)": timing(24, 5, 1),
  "xxx.L,d(An,ix)": timing(26, 5, 1),
  "xxx.L,xxx.W": timing(24, 5, 1),
  "xxx.L,xxx.L": timing(28, 6, 1),
  "d(PC),Dn": timing(12, 3, 0),
  "d(PC),An": timing(12, 3, 0),
  "d(PC),(An)": timing(16, 3, 1),
  "d(PC),(An)+": timing(16, 3, 1),
  "d(PC),-(An)": timing(16, 3, 1),
  "d(PC),d(An)": timing(20, 4, 1),
  "d(PC),d(An,ix)": timing(22, 4, 1),
  "d(PC),xxx.W": timing(20, 4, 1),
  "d(PC),xxx.L": timing(24, 5, 1),
  "d(PC,ix),Dn": timing(14, 3, 0),
  "d(PC,ix),An": timing(14, 3, 0),
  "d(PC,ix),(An)": timing(18, 3, 1),
  "d(PC,ix),(An)+": timing(18, 3, 1),
  "d(PC,ix),-(An)": timing(18, 3, 1),
  "d(PC,ix),d(An)": timing(22, 4, 1),
  "d(PC,ix),d(An,ix)": timing(24, 4, 1),
  "d(PC,ix),xxx.W": timing(22, 4, 1),
  "d(PC,ix),xxx.L": timing(26, 5, 1),
  "#xxx,Dn": timing(8, 2, 0),
  "#xxx,An": timing(8, 2, 0),
  "#xxx,(An)": timing(12, 2, 1),
  "#xxx,(An)+": timing(12, 2, 1),
  "#xxx,-(An)": timing(12, 2, 1),
  "#xxx,d(An)": timing(16, 3, 1),
  "#xxx,d(An,ix)": timing(18, 3, 1),
  "#xxx,xxx.W": timing(16, 3, 1),
  "#xxx,xxx.L": timing(20, 4, 1),
};
const moveL: TimingMap = {
  "Dn,Dn": timing(4, 1, 0),
  "Dn,An": timing(4, 1, 0),
  "Dn,(An)": timing(12, 1, 2),
  "Dn,(An)+": timing(12, 1, 2),
  "Dn,-(An)": timing(12, 1, 2),
  "Dn,d(An)": timing(16, 2, 2),
  "Dn,d(An,ix)": timing(18, 2, 2),
  "Dn,xxx.W": timing(16, 2, 2),
  "Dn,xxx.L": timing(20, 3, 2),
  "An,Dn": timing(4, 1, 0),
  "An,An": timing(4, 1, 0),
  "An,(An)": timing(12, 1, 2),
  "An,(An)+": timing(12, 1, 2),
  "An,-(An)": timing(12, 1, 2),
  "An,d(An)": timing(16, 2, 2),
  "An,d(An,ix)": timing(18, 2, 2),
  "An,xxx.W": timing(16, 2, 2),
  "An,xxx.L": timing(20, 3, 2),
  "(An),Dn": timing(12, 3, 0),
  "(An),An": timing(12, 3, 0),
  "(An),(An)": timing(20, 3, 2),
  "(An),(An)+": timing(20, 3, 2),
  "(An),-(An)": timing(20, 3, 2),
  "(An),d(An)": timing(24, 4, 2),
  "(An),d(An,ix)": timing(26, 4, 2),
  "(An),xxx.W": timing(24, 4, 2),
  "(An),xxx.L": timing(28, 5, 2),
  "(An)+,Dn": timing(12, 3, 0),
  "(An)+,An": timing(12, 3, 0),
  "(An)+,(An)": timing(20, 3, 2),
  "(An)+,(An)+": timing(20, 3, 2),
  "(An)+,-(An)": timing(20, 3, 2),
  "(An)+,d(An)": timing(24, 4, 2),
  "(An)+,d(An,ix)": timing(26, 4, 2),
  "(An)+,xxx.W": timing(24, 4, 2),
  "(An)+,xxx.L": timing(28, 5, 2),
  "-(An),Dn": timing(14, 3, 0),
  "-(An),An": timing(14, 3, 0),
  "-(An),(An)": timing(22, 3, 2),
  "-(An),(An)+": timing(22, 3, 2),
  "-(An),-(An)": timing(22, 3, 2),
  "-(An),d(An)": timing(26, 4, 2),
  "-(An),d(An,ix)": timing(28, 4, 2),
  "-(An),xxx.W": timing(26, 4, 2),
  "-(An),xxx.L": timing(30, 5, 2),
  "d(An),Dn": timing(16, 4, 0),
  "d(An),An": timing(16, 4, 0),
  "d(An),(An)": timing(24, 4, 2),
  "d(An),(An)+": timing(24, 4, 2),
  "d(An),-(An)": timing(24, 4, 2),
  "d(An),d(An)": timing(28, 5, 2),
  "d(An),d(An,ix)": timing(30, 5, 2),
  "d(An),xxx.W": timing(28, 5, 2),
  "d(An),xxx.L": timing(32, 6, 2),
  "d(An,ix),Dn": timing(18, 4, 0),
  "d(An,ix),An": timing(18, 4, 0),
  "d(An,ix),(An)": timing(26, 4, 2),
  "d(An,ix),(An)+": timing(26, 4, 2),
  "d(An,ix),-(An)": timing(26, 4, 2),
  "d(An,ix),d(An)": timing(30, 5, 2),
  "d(An,ix),d(An,ix)": timing(32, 5, 2),
  "d(An,ix),xxx.W": timing(30, 5, 2),
  "d(An,ix),xxx.L": timing(34, 6, 2),
  "xxx.W,Dn": timing(16, 4, 0),
  "xxx.W,An": timing(16, 4, 0),
  "xxx.W,(An)": timing(24, 4, 2),
  "xxx.W,(An)+": timing(24, 4, 2),
  "xxx.W,-(An)": timing(24, 4, 2),
  "xxx.W,d(An)": timing(28, 5, 2),
  "xxx.W,d(An,ix)": timing(30, 5, 2),
  "xxx.W,xxx.W": timing(28, 5, 2),
  "xxx.W,xxx.L": timing(32, 6, 2),
  "xxx.L,Dn": timing(20, 5, 0),
  "xxx.L,An": timing(20, 5, 0),
  "xxx.L,(An)": timing(28, 5, 2),
  "xxx.L,(An)+": timing(28, 5, 2),
  "xxx.L,-(An)": timing(28, 5, 2),
  "xxx.L,d(An)": timing(32, 6, 2),
  "xxx.L,d(An,ix)": timing(34, 6, 2),
  "xxx.L,xxx.W": timing(32, 6, 2),
  "xxx.L,xxx.L": timing(36, 7, 2),
  "d(PC),Dn": timing(16, 4, 0),
  "d(PC),An": timing(16, 4, 0),
  "d(PC),(An)": timing(24, 4, 2),
  "d(PC),(An)+": timing(24, 4, 2),
  "d(PC),-(An)": timing(24, 4, 2),
  "d(PC),d(An)": timing(28, 5, 2),
  "d(PC),d(An,ix)": timing(30, 5, 2),
  "d(PC),xxx.W": timing(28, 5, 2),
  "d(PC),xxx.L": timing(32, 5, 2),
  "d(PC,ix),Dn": timing(18, 4, 0),
  "d(PC,ix),An": timing(18, 4, 0),
  "d(PC,ix),(An)": timing(26, 4, 2),
  "d(PC,ix),(An)+": timing(26, 4, 2),
  "d(PC,ix),-(An)": timing(26, 4, 2),
  "d(PC,ix),d(An)": timing(30, 5, 2),
  "d(PC,ix),d(An,ix)": timing(32, 5, 2),
  "d(PC,ix),xxx.W": timing(30, 5, 2),
  "d(PC,ix),xxx.L": timing(34, 6, 2),
  "#xxx,Dn": timing(12, 3, 0),
  "#xxx,An": timing(12, 3, 0),
  "#xxx,(An)": timing(20, 3, 2),
  "#xxx,(An)+": timing(20, 3, 2),
  "#xxx,-(An)": timing(20, 3, 2),
  "#xxx,d(An)": timing(24, 4, 2),
  "#xxx,d(An,ix)": timing(26, 4, 2),
  "#xxx,xxx.W": timing(24, 4, 2),
  "#xxx,xxx.L": timing(28, 5, 2),
};

const addSubBW: TimingMap = {
  ...sourceEa(timing(8, 1, 0), OperandType.DirectAddr),
  ...sourceEa(timing(4, 1, 0), OperandType.DirectData),
  ...destMem(timing(8, 1, 1), OperandType.DirectData),
  "#xxx,Dn": timing(8, 2, 0),
  ...destMem(timing(12, 2, 1), OperandType.Immediate),
};
const addSubL: TimingMap = {
  ...sourceMem(timing(6, 1, 0), OperandType.DirectAddr, EaSize.Long),
  ...sourceMem(timing(6, 1, 0), OperandType.DirectData, EaSize.Long),
  ...sourceDirectImmediate(
    timing(8, 1, 0),
    OperandType.DirectAddr,
    EaSize.Long
  ),
  ...sourceDirectImmediate(
    timing(8, 1, 0),
    OperandType.DirectData,
    EaSize.Long
  ),
  ...destMem(timing(12, 1, 2), OperandType.DirectData, EaSize.Long),
  "#xxx,Dn": timing(16, 3, 0),
  ...destMem(timing(20, 3, 2), OperandType.Immediate, EaSize.Long),
};

const andOrBW: TimingMap = {
  ...sourceEa(timing(4, 1, 0), OperandType.DirectData),
  ...destMem(timing(8, 1, 1), OperandType.DirectData),
  "#xxx,Dn": timing(8, 2, 0),
  ...destMem(timing(12, 2, 1), OperandType.Immediate),
};
const andL: TimingMap = {
  ...sourceMem(timing(6, 1, 0), OperandType.DirectData, EaSize.Long),
  ...sourceDirectImmediate(
    timing(8, 1, 0),
    OperandType.DirectData,
    EaSize.Long
  ),
  ...destMem(timing(12, 1, 2), OperandType.DirectData, EaSize.Long),
  "#xxx,Dn": timing(16, 3, 0),
  ...destMem(timing(20, 3, 1), OperandType.Immediate, EaSize.Long),
};
const orL: TimingMap = {
  ...sourceMem(timing(6, 1, 0), OperandType.DirectData, EaSize.Long),
  ...sourceDirectImmediate(
    timing(8, 1, 0),
    OperandType.DirectData,
    EaSize.Long
  ),
  ...destMem(timing(12, 1, 2), OperandType.DirectData, EaSize.Long),
  "#xxx,Dn": timing(16, 3, 0),
  ...destMem(timing(20, 3, 2), OperandType.Immediate, EaSize.Long),
};

const eorBW: TimingMap = {
  Dn: timing(4, 1, 0),
  ...destMem(timing(8, 1, 1), OperandType.DirectData),
  "#xxx,Dn": timing(8, 2, 0),
  ...destMem(timing(12, 1, 0), OperandType.Immediate),
};
const eorL: TimingMap = {
  Dn: timing(8, 1, 0),
  ...destMem(timing(12, 1, 2), OperandType.DirectData),
  "#xxx,Dn": timing(16, 3, 0),
  ...destMem(timing(20, 3, 2), OperandType.Immediate, EaSize.Long),
};

const cmpBW: TimingMap = {
  ...sourceEa(timing(6, 1, 0), OperandType.DirectAddr),
  ...sourceEa(timing(4, 1, 0), OperandType.DirectData),
  "#xxx,Dn": timing(8, 2, 0),
  ...destMem(timing(8, 2, 0), OperandType.Immediate),
};
const cmpL: TimingMap = {
  ...sourceEa(timing(6, 1, 0), OperandType.DirectAddr, EaSize.Long),
  ...sourceEa(timing(6, 1, 0), OperandType.DirectData, EaSize.Long),
  "#xxx,Dn": timing(14, 3, 0),
  ...destMem(timing(12, 3, 0), OperandType.Immediate, EaSize.Long),
};

const divs = sourceEa(timing(158, 1, 0), OperandType.DirectData);
const divu = sourceEa(timing(140, 1, 0), OperandType.DirectData);
const muls = sourceEa(timing(70, 1, 0), OperandType.DirectData);
const mulu = sourceEa(timing(70, 1, 0), OperandType.DirectData);

const addqSubqBW: TimingMap = {
  "#xxx,Dn": timing(4, 1, 0),
  "#xxx,An": timing(8, 1, 0),
  ...destMem(timing(8, 1, 1), OperandType.Immediate),
};
const addqSubqL: TimingMap = {
  "#xxx,Dn": timing(8, 1, 0),
  "#xxx,An": timing(8, 1, 0),
  ...destMem(timing(12, 1, 2), OperandType.Immediate, EaSize.Long),
};

const moveq: TimingMap = {
  "#xxx,Dn": timing(4, 1, 0),
};

const clrBW: TimingMap = {
  Dn: timing(4, 1, 0),
  ...unaryMem(timing(8, 1, 1)),
};
const clrL: TimingMap = {
  Dn: timing(6, 1, 0),
  ...unaryMem(timing(12, 1, 2), EaSize.Long),
};

const nbcd: TimingMap = {
  Dn: timing(6, 1, 0),
  ...unaryMem(timing(8, 1, 1)),
};

const negxBW: TimingMap = {
  Dn: timing(4, 1, 0),
  ...unaryMem(timing(8, 1, 1)),
};
const negxL: TimingMap = {
  Dn: timing(6, 1, 0),
  ...unaryMem(timing(12, 1, 2), EaSize.Long),
};

const scc: TimingMap = {
  [OperandType.DirectData]: [timing(4, 1, 0), timing(6, 1, 0)], // false/true
  ...unaryMem(timing(8, 1, 1)),
};

const tstBW: TimingMap = {
  Dn: timing(4, 1, 0),
  ...unaryMem(timing(4, 1, 0)),
};
const tstL: TimingMap = {
  Dn: timing(4, 1, 0),
  ...unaryMem(timing(4, 1, 0), EaSize.Long),
};

const tas: TimingMap = {
  Dn: timing(4, 1, 0),
  ...unaryMem(timing(10, 1, 1)),
};

const shiftBW: TimingMap = {
  "#xxx,Dn": timing(6, 1, 0, { nClock: 2 }),
  ...destMem(timing(8, 1, 1), OperandType.Immediate),
};
const shiftL: TimingMap = {
  "#xxx,Dn": timing(8, 1, 0, { nClock: 2 }),
};

const bchgBsetB: TimingMap = {
  ...destMem(timing(8, 1, 1), OperandType.DirectData),
  ...destMem(timing(12, 2, 1), OperandType.Immediate),
};
const bchgBsetL: TimingMap = {
  "Dn,Dn": timing(8, 1, 0),
  "#xxx,Dn": timing(12, 2, 0),
};

const bclrB: TimingMap = {
  ...destMem(timing(8, 1, 1), OperandType.DirectData),
  ...destMem(timing(12, 2, 1), OperandType.Immediate),
};
const bclrL: TimingMap = {
  "Dn,Dn": timing(10, 1, 0),
  "#xxx,Dn": timing(14, 2, 0),
};

const btstB: TimingMap = {
  ...destMem(timing(4, 1, 0), OperandType.DirectData),
  ...destMem(timing(8, 2, 0), OperandType.Immediate),
};
const btstL: TimingMap = {
  "Dn,Dn": timing(6, 1, 0),
  "#xxx,Dn": timing(10, 2, 0),
};

const bra: TimingMap = {
  "xxx.L": timing(18, 2, 2),
};
const bsr: TimingMap = {
  "xxx.L": timing(18, 2, 2),
};

const bccB: TimingMap = {
  "xxx.L": [timing(10, 2, 0), timing(8, 1, 0)], // Branch / continue
};
const bccW: TimingMap = {
  "xxx.L": [timing(10, 2, 0), timing(12, 1, 0)], // Branch / continue
};
const dbcc: TimingMap = {
  "Dn,xxx.L": [timing(10, 2, 0), timing(12, 2, 0), timing(14, 3, 0)], // Branch / Condition Met / Decremented To False
};

const jmp: TimingMap = {
  [OperandType.Indirect]: timing(8, 2, 0),
  [OperandType.IndirectDisp]: timing(10, 2, 0),
  [OperandType.IndirectIx]: timing(14, 3, 0),
  [OperandType.AbsoluteW]: timing(10, 2, 0),
  [OperandType.AbsoluteL]: timing(12, 3, 0),
  [OperandType.IndirectPcDisp]: timing(10, 2, 0),
  [OperandType.IndirectPcIx]: timing(14, 3, 0),
};

const jsr: TimingMap = {
  [OperandType.Indirect]: timing(16, 2, 0),
  [OperandType.IndirectDisp]: timing(18, 2, 0),
  [OperandType.IndirectIx]: timing(22, 2, 2),
  [OperandType.AbsoluteW]: timing(18, 2, 2),
  [OperandType.AbsoluteL]: timing(20, 3, 2),
  [OperandType.IndirectPcDisp]: timing(18, 2, 2),
  [OperandType.IndirectPcIx]: timing(22, 2, 2),
};

const lea: TimingMap = {
  "(An),An": timing(4, 1, 0),
  "d(An),An": timing(8, 2, 0),
  "d(An,ix),An": timing(12, 2, 0),
  "xxx.W,An": timing(8, 2, 0),
  "xxx.L,An": timing(12, 3, 0),
  "(d(PC),An)": timing(8, 2, 0),
  "(d(PC,ix),An)": timing(12, 2, 0),
};

const pea: TimingMap = {
  [OperandType.Indirect]: timing(12, 1, 2),
  [OperandType.IndirectDisp]: timing(16, 2, 2),
  [OperandType.IndirectIx]: timing(20, 2, 2),
  [OperandType.AbsoluteW]: timing(16, 2, 2),
  [OperandType.AbsoluteL]: timing(20, 3, 2),
  [OperandType.IndirectPcDisp]: timing(16, 2, 2),
  [OperandType.IndirectPcIx]: timing(20, 2, 2),
};

const addxSubxBw: TimingMap = {
  "Dn,Dn": timing(4, 1, 0),
  "-(An),-(An)": timing(18, 3, 0),
};
const addxSubxL: TimingMap = {
  "Dn,Dn": timing(8, 1, 0),
  "-(An),-(An)": timing(30, 5, 2),
};

const cmpmBw: TimingMap = {
  "(An)+,(An)+": timing(12, 3, 0),
};
const cmpmL: TimingMap = {
  "(An)+,(An)+": timing(20, 5, 0),
};

const xbcd: TimingMap = {
  "Dn,Dn": timing(6, 1, 0),
  "-(An),-(An)": timing(18, 3, 1),
};

const movepW: TimingMap = {
  "Dn,d(An)": timing(16, 2, 2),
  "d(An),Dn": timing(16, 4, 0),
};
const movepL: TimingMap = {
  "Dn,d(An)": timing(24, 2, 4),
  "d(An),Dn": timing(24, 6, 0),
};

/*
TODO:
ANDI to CCR	byte	 20(3/0)	   -
ANDI to SR	word	 20(3/0)	   -
EORI to CCR	byte	 20(3/0)	   -
EORI to SR	word	 20(3/0)	   -
ORI to CCR	byte	 20(3/0)	   -
ORI to SR	word	 20(3/0)	   -
MOVE from SR	 -	  6(1/0)	 8(1/1)+
MOVE to CCR	 -	 12(1/0)	12(1/0)+
MOVE to SR	 -	 12(1/0)	12(1/0)+
*/
const movemW: TimingMap = {
  // R->M
  "RegList,(An)": timing(8, 2, 0, { nClock: 4, nWrite: 1 }),
  "RegList,-(An)": timing(8, 2, 0, { nClock: 4, nWrite: 1 }),
  "RegList,d(An)": timing(12, 3, 0, { nClock: 4, nWrite: 1 }),
  "RegList,d(An,ix)": timing(14, 3, 0, { nClock: 4, nWrite: 1 }),
  "RegList,xxx.W": timing(12, 3, 0, { nClock: 4, nWrite: 1 }),
  "RegList,xxx.L": timing(16, 4, 0, { nClock: 4, nWrite: 1 }),
  // M->R
  "(An),RegList": timing(12, 3, 0, { nClock: 4, nRead: 1 }),
  "(An)+,RegList": timing(12, 3, 0, { nClock: 4, nRead: 1 }),
  "d(An),RegList": timing(16, 4, 0, { nClock: 4, nRead: 1 }),
  "d(An,ix),RegList": timing(18, 4, 0, { nClock: 4, nRead: 1 }),
  "xxx.W,RegList": timing(16, 4, 0, { nClock: 4, nRead: 1 }),
  "xxx.L,RegList": timing(20, 5, 0, { nClock: 4, nRead: 1 }),
  "d(PC),RegList": timing(16, 4, 0, { nClock: 4, nRead: 1 }),
  "d(PC,ix),RegList": timing(18, 4, 0, { nClock: 4, nRead: 1 }),
};
const movemL: TimingMap = {
  // R->M
  "RegList,(An)": timing(8, 2, 0, { nClock: 8, nWrite: 2 }),
  "RegList,-(An)": timing(8, 2, 0, { nClock: 8, nWrite: 2 }),
  "RegList,d(An)": timing(12, 3, 0, { nClock: 8, nWrite: 2 }),
  "RegList,d(An,ix)": timing(14, 3, 0, { nClock: 8, nWrite: 2 }),
  "RegList,xxx.W": timing(12, 3, 0, { nClock: 8, nWrite: 2 }),
  "RegList,xxx.L": timing(16, 4, 0, { nClock: 8, nWrite: 2 }),
  // M->R
  "(An),RegList": timing(12, 3, 0, { nClock: 8, nRead: 2 }),
  "(An)+,RegList": timing(12, 3, 0, { nClock: 8, nRead: 2 }),
  "d(An),RegList": timing(16, 4, 0, { nClock: 8, nRead: 2 }),
  "d(An,ix),RegList": timing(18, 4, 0, { nClock: 8, nRead: 2 }),
  "xxx.W,RegList": timing(16, 4, 0, { nClock: 8, nRead: 2 }),
  "xxx.L,RegList": timing(20, 5, 0, { nClock: 8, nRead: 2 }),
  "d(PC),RegList": timing(16, 4, 0, { nClock: 8, nRead: 2 }),
  "d(PC,ix),RegList": timing(18, 4, 0, { nClock: 8, nRead: 2 }),
};

type SizeTimings = Partial<Record<InstructionSize, TimingMap>>;
type InstructionTimings = Record<Instruction, SizeTimings>;

/**
 * Table of TimingMaps for each instruction / size
 */
const instructionTimings: InstructionTimings = {
  ABCD: { B: xbcd },
  ADD: { B: addSubBW, W: addSubBW, L: addSubL },
  ADDQ: { B: addqSubqBW, W: addqSubqBW, L: addqSubqL },
  ADDX: { B: addxSubxBw, W: addxSubxBw, L: addxSubxL },
  AND: { B: andOrBW, W: andOrBW, L: andL },
  ASL: { B: shiftBW, W: shiftBW, L: shiftL },
  ASR: { B: shiftBW, W: shiftBW, L: shiftL },
  BCC: { B: bccB, W: bccW },
  BCHG: { B: bchgBsetB, L: bchgBsetL },
  BCLR: { B: bclrB, L: bclrL },
  BCS: { B: bccB, W: bccW },
  BEQ: { B: bccB, W: bccW },
  BGE: { B: bccB, W: bccW },
  BGT: { B: bccB, W: bccW },
  BHI: { B: bccB, W: bccW },
  BLE: { B: bccB, W: bccW },
  BLT: { B: bccB, W: bccW },
  BMI: { B: bccB, W: bccW },
  BNE: { B: bccB, W: bccW },
  BPL: { B: bccB, W: bccW },
  BRA: { B: bra, W: bra },
  BSET: { B: bchgBsetB, L: bchgBsetL },
  BSR: { B: bsr, W: bsr },
  BTST: { B: btstB, L: btstL },
  BVC: { B: bccB, W: bccW },
  BVS: { B: bccB, W: bccW },
  CHK: { NA: { Dn: timing(10, 1, 0) } },
  CLR: { B: clrBW, W: clrBW, L: clrL },
  CMP: { B: cmpBW, W: cmpBW, L: cmpL },
  CMPM: { B: cmpmBw, W: cmpmBw, L: cmpmL },
  DBCC: { W: dbcc },
  DBCS: { W: dbcc },
  DBEQ: { W: dbcc },
  DBF: { W: dbcc },
  DBGE: { W: dbcc },
  DBGT: { W: dbcc },
  DBHI: { W: dbcc },
  DBLE: { W: dbcc },
  DBLT: { W: dbcc },
  DBMI: { W: dbcc },
  DBNE: { W: dbcc },
  DBPL: { W: dbcc },
  DBT: { W: dbcc },
  DBVC: { W: dbcc },
  DBVS: { W: dbcc },
  DIVS: { W: divs },
  DIVU: { W: divu },
  EOR: { B: eorBW, W: eorBW, L: eorL },
  EXG: { NA: { Dn: timing(6, 1, 0) } },
  EXT: { W: { Dn: timing(4, 1, 0) }, L: { Dn: timing(4, 1, 0) } },
  JMP: { NA: jmp },
  JSR: { NA: jsr },
  LEA: { NA: lea },
  LINK: { NA: { Dn: timing(16, 2, 2) } },
  LSL: { B: shiftBW, W: shiftBW, L: shiftL },
  LSR: { B: shiftBW, W: shiftBW, L: shiftL },
  MOVE: { B: moveBW, W: moveBW, L: moveL },
  MOVEM: { W: movemW, L: movemL },
  MOVEP: { W: movepW, L: movepL },
  MOVEQ: { L: moveq },
  MULS: { W: muls },
  MULU: { W: mulu },
  NBCD: { B: nbcd },
  NEG: { B: clrBW, W: clrBW, L: clrL },
  NEGX: { B: negxBW, W: negxBW, L: negxL },
  NOP: { NA: { Dn: timing(4, 1, 0) } },
  NOT: { B: clrBW, W: clrBW, L: clrL },
  OR: { B: andOrBW, W: andOrBW, L: orL },
  PEA: { NA: pea },
  RESET: { NA: { [NONE]: timing(40, 6, 0) } },
  ROL: { B: shiftBW, W: shiftBW, L: shiftL },
  ROR: { B: shiftBW, W: shiftBW, L: shiftL },
  ROXL: { B: shiftBW, W: shiftBW, L: shiftL },
  ROXR: { B: shiftBW, W: shiftBW, L: shiftL },
  RTE: { NA: { [NONE]: timing(20, 5, 0) } },
  RTR: { NA: { [NONE]: timing(20, 5, 0) } },
  RTS: { NA: { [NONE]: timing(16, 4, 0) } },
  SBCD: { B: xbcd },
  SCC: { B: scc },
  SCS: { B: scc },
  SEQ: { B: scc },
  SGE: { B: scc },
  SGT: { B: scc },
  SHI: { B: scc },
  SLE: { B: scc },
  SLT: { B: scc },
  SMI: { B: scc },
  SNE: { B: scc },
  SPL: { B: scc },
  STOP: { NA: { Dn: timing(4, 0, 0) } },
  SUB: { B: addSubBW, W: addSubBW, L: addSubL },
  SUBQ: { B: addqSubqBW, W: addqSubqBW, L: addqSubqL },
  SUBX: { B: addxSubxBw, W: addxSubxBw, L: addxSubxL },
  SVC: { B: scc },
  SVS: { B: scc },
  SWAP: { NA: { Dn: timing(4, 1, 0) } },
  TAS: { B: tas },
  TRAP: { NA: { [NONE]: timing(38, 4, 0) } },
  TRAPV: { NA: { [NONE]: timing(34, 4, 0) } },
  TST: { B: tstBW, W: tstBW, L: tstL },
  UNLK: { NA: { Dn: timing(12, 3, 0) } },
};
