import { Instruction } from ".";
import {
  OperandType,
  OperandGroup,
  isOperandGroup,
  operandGroups,
} from "./operands";
import { Mnemonic, Size } from "./mnemonics";

/**
 * Describes timing information for a given instruction
 */
export interface Timing {
  clock: number;
  read: number;
  write: number;
}

/**
 * Look up timing information for a parsed instruction
 */
export function lookupTiming(
  instruction: Instruction
): Timing | Timing[] | null {
  const { mnemonic, size, source, dest } = instruction;

  // Build string key for map lookup:
  let key = mnemonic;
  if (size !== NA) {
    key += "." + size;
  }
  if (source && dest) {
    key += ` ${source.type},${dest.type}`;
  } else if (dest) {
    key += ` ${dest.type}`;
  }

  const times = timingMap[key];
  if (!times) {
    return null;
  }

  // Find value to use for n multipliers
  const n: number = source?.value || dest?.value || 0;

  // Convert tuple to structured timing object and apply n multipliers
  const toTiming = (t: TimeTuple): Timing => {
    const [clock, read, write, nClock, nRead, nWrite] = t;
    const timing: Timing = { clock, read, write };

    if (nClock) {
      timing.clock += n * nClock;
    }
    if (nRead) {
      timing.read += n * nRead;
    }
    if (nWrite) {
      timing.write += n * nWrite;
    }
    return timing;
  };

  return isMultiTime(times) ? times.map(toTiming) : toTiming(times);
}

// Extract these as vars as we'll be using them a lot!
const { B, W, L, NA } = Size;
const { DI, EA, M } = OperandGroup;
const {
  Dn,
  An,
  AnIndir,
  AnPostInc,
  AnPreDec,
  AnDisp,
  AnDispIx,
  PcDisp,
  PcDispIx,
  AbsW,
  AbsL,
  Imm,
  RegList,
} = OperandType;

// Effective Address Calculation Times:

// prettier-ignore
const eaLookup: Record<string, [TimeTuple, TimeTuple]> = {
                // B/W        // L
  [Dn]:         [[0, 0, 0],   [0, 0, 0]],
  [An]:         [[0, 0, 0],   [0, 0, 0]],
  [Imm]:        [[4, 1, 0],   [8, 2, 0]],
  [AnIndir]:    [[4, 1, 0],   [8, 2, 0]],
  [AnPostInc]:  [[4, 1, 0],   [8, 2, 0]],
  [AnPreDec]:   [[6, 1, 0],   [10, 2, 0]],
  [AnDisp]:     [[8, 2, 0],   [12, 3, 0]],
  [AnDispIx]:   [[10, 2, 0],  [14, 3, 0]],
  [PcDisp]:     [[8, 2, 0],   [12, 3, 0]],
  [PcDispIx]:   [[10, 2, 0],  [14, 3, 0]],
  [AbsW]:       [[8, 2, 0],   [12, 3, 0]],
  [AbsL]:       [[12, 3, 0],  [16, 4, 0]],
};

type TimeTuple = [number, number, number, number?, number?, number?];
type TimingTable = [
  Mnemonic[],
  Size[],
  (OperandType | OperandGroup)[],
  TimeTuple | TimeTuple[]
][];

// Define large groups here to keep our table manageable.
const shiftRot: Mnemonic[] = [
  "LSL",
  "LSR",
  "ASL",
  "ASR",
  "ROL",
  "ROR",
  "ROXL",
  "ROXR",
];
const scc: Mnemonic[] = [
  "SCC",
  "SCS",
  "SEQ",
  "SGE",
  "SGT",
  "SHI",
  "SLE",
  "SLT",
  "SMI",
  "SNE",
  "SPL",
  "SVC",
  "SVS",
];
const bcc: Mnemonic[] = [
  "BCC",
  "BCS",
  "BEQ",
  "BGE",
  "BGT",
  "BHI",
  "BLE",
  "BLT",
  "BMI",
  "BNE",
  "BPL",
];
const dbcc: Mnemonic[] = [
  "DBCC",
  "DBCS",
  "DBEQ",
  "DBF",
  "DBGE",
  "DBGT",
  "DBHI",
  "DBLE",
  "DBLT",
  "DBMI",
  "DBNE",
  "DBPL",
  "DBT",
  "DBVC",
  "DBVS",
];

// prettier-ignore
const tbl: TimingTable = [
// Mnemonics:                Sizes:     Operand types:           Timings:
// .                                    [source], dest           cycles, read, write, n multipliers
  [["MOVE"],                 [B, W],    [Dn, Dn],                [4, 1, 0]],
  [["MOVE"],                 [B, W],    [Dn, An],                [4, 1, 0]],
  [["MOVE"],                 [B, W],    [Dn, AnIndir],           [8, 1, 1]],
  [["MOVE"],                 [B, W],    [Dn, AnPostInc],         [8, 1, 1]],
  [["MOVE"],                 [B, W],    [Dn, AnPreDec],          [8, 1, 1]],
  [["MOVE"],                 [B, W],    [Dn, AnDisp],            [12, 2, 1]],
  [["MOVE"],                 [B, W],    [Dn, AnDispIx],          [14, 2, 1]],
  [["MOVE"],                 [B, W],    [Dn, AbsW],              [12, 2, 1]],
  [["MOVE"],                 [B, W],    [Dn, AbsL],              [16, 3, 1]],
  [["MOVE"],                 [B, W],    [An, Dn],                [4, 1, 0]],
  [["MOVE"],                 [B, W],    [An, An],                [4, 1, 0]],
  [["MOVE"],                 [B, W],    [An, AnIndir],           [8, 1, 1]],
  [["MOVE"],                 [B, W],    [An, AnPostInc],         [8, 1, 1]],
  [["MOVE"],                 [B, W],    [An, AnPreDec],          [8, 1, 1]],
  [["MOVE"],                 [B, W],    [An, AnDisp],            [12, 2, 1]],
  [["MOVE"],                 [B, W],    [An, AnDispIx],          [14, 2, 1]],
  [["MOVE"],                 [B, W],    [An, AbsW],              [12, 2, 1]],
  [["MOVE"],                 [B, W],    [An, AbsL],              [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, Dn],           [8, 2, 0]],
  [["MOVE"],                 [B, W],    [AnIndir, An],           [8, 2, 0]],
  [["MOVE"],                 [B, W],    [AnIndir, AnIndir],      [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AnPostInc],    [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AnPreDec],     [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AnDisp],       [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AnDispIx],     [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AbsW],         [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnIndir, AbsL],         [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, Dn],         [8, 2, 0]],
  [["MOVE"],                 [B, W],    [AnPostInc, An],         [8, 2, 0]],
  [["MOVE"],                 [B, W],    [AnPostInc, AnIndir],    [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AnPostInc],  [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AnPreDec],   [12, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AnDisp],     [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AnDispIx],   [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AbsW],       [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnPostInc, AbsL],       [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, Dn],          [10, 2, 0]],
  [["MOVE"],                 [B, W],    [AnPreDec, An],          [10, 2, 0]],
  [["MOVE"],                 [B, W],    [AnPreDec, AnIndir],     [14, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AnPostInc],   [14, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AnPreDec],    [14, 2, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AnDisp],      [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AnDispIx],    [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AbsW],        [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnPreDec, AbsL],        [22, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, Dn],            [12, 3, 0]],
  [["MOVE"],                 [B, W],    [AnDisp, An],            [12, 3, 0]],
  [["MOVE"],                 [B, W],    [AnDisp, AnIndir],       [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AnPostInc],     [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AnPreDec],      [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AnDisp],        [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AnDispIx],      [22, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AbsW],          [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDisp, AbsL],          [24, 5, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, Dn],          [14, 3, 0]],
  [["MOVE"],                 [B, W],    [AnDispIx, An],          [14, 3, 0]],
  [["MOVE"],                 [B, W],    [AnDispIx, AnIndir],     [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AnPostInc],   [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AnPreDec],    [18, 3, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AnDisp],      [22, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AnDispIx],    [24, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AbsW],        [22, 4, 1]],
  [["MOVE"],                 [B, W],    [AnDispIx, AbsL],        [26, 5, 1]],
  [["MOVE"],                 [B, W],    [AbsW, Dn],              [12, 3, 0]],
  [["MOVE"],                 [B, W],    [AbsW, An],              [12, 3, 0]],
  [["MOVE"],                 [B, W],    [AbsW, AnIndir],         [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AnPostInc],       [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AnPreDec],        [16, 3, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AnDisp],          [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AnDispIx],        [22, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AbsW],            [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsW, AbsL],            [24, 5, 1]],
  [["MOVE"],                 [B, W],    [AbsL, Dn],              [16, 4, 0]],
  [["MOVE"],                 [B, W],    [AbsL, An],              [16, 4, 0]],
  [["MOVE"],                 [B, W],    [AbsL, AnIndir],         [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AnPostInc],       [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AnPreDec],        [20, 4, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AnDisp],          [24, 5, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AnDispIx],        [26, 5, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AbsW],            [24, 5, 1]],
  [["MOVE"],                 [B, W],    [AbsL, AbsL],            [28, 6, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, Dn],            [12, 3, 0]],
  [["MOVE"],                 [B, W],    [PcDisp, An],            [12, 3, 0]],
  [["MOVE"],                 [B, W],    [PcDisp, AnIndir],       [16, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AnPostInc],     [16, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AnPreDec],      [16, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AnDisp],        [20, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AnDispIx],      [22, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AbsW],          [20, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDisp, AbsL],          [24, 5, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, Dn],          [14, 3, 0]],
  [["MOVE"],                 [B, W],    [PcDispIx, An],          [14, 3, 0]],
  [["MOVE"],                 [B, W],    [PcDispIx, AnIndir],     [18, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AnPostInc],   [18, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AnPreDec],    [18, 3, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AnDisp],      [22, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AnDispIx],    [24, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AbsW],        [22, 4, 1]],
  [["MOVE"],                 [B, W],    [PcDispIx, AbsL],        [26, 5, 1]],
  [["MOVE"],                 [B, W],    [Imm, Dn],               [8, 2, 0]],
  [["MOVE"],                 [B, W],    [Imm, An],               [8, 2, 0]],
  [["MOVE"],                 [B, W],    [Imm, AnIndir],          [12, 2, 1]],
  [["MOVE"],                 [B, W],    [Imm, AnPostInc],        [12, 2, 1]],
  [["MOVE"],                 [B, W],    [Imm, AnPreDec],         [12, 2, 1]],
  [["MOVE"],                 [B, W],    [Imm, AnDisp],           [16, 3, 1]],
  [["MOVE"],                 [B, W],    [Imm, AnDispIx],         [18, 3, 1]],
  [["MOVE"],                 [B, W],    [Imm, AbsW],             [16, 3, 1]],
  [["MOVE"],                 [B, W],    [Imm, AbsL],             [20, 4, 1]],

  [["MOVE"],                 [L],       [Dn, Dn],                [4, 1, 0]],
  [["MOVE"],                 [L],       [Dn, An],                [4, 1, 0]],
  [["MOVE"],                 [L],       [Dn, AnIndir],           [12, 1, 2]],
  [["MOVE"],                 [L],       [Dn, AnPostInc],         [12, 1, 2]],
  [["MOVE"],                 [L],       [Dn, AnPreDec],          [12, 1, 2]],
  [["MOVE"],                 [L],       [Dn, AnDisp],            [16, 2, 2]],
  [["MOVE"],                 [L],       [Dn, AnDispIx],          [18, 2, 2]],
  [["MOVE"],                 [L],       [Dn, AbsW],              [16, 2, 2]],
  [["MOVE"],                 [L],       [Dn, AbsL],              [20, 3, 2]],
  [["MOVE"],                 [L],       [An, Dn],                [4, 1, 0]],
  [["MOVE"],                 [L],       [An, An],                [4, 1, 0]],
  [["MOVE"],                 [L],       [An, AnIndir],           [12, 1, 2]],
  [["MOVE"],                 [L],       [An, AnPostInc],         [12, 1, 2]],
  [["MOVE"],                 [L],       [An, AnPreDec],          [12, 1, 2]],
  [["MOVE"],                 [L],       [An, AnDisp],            [16, 2, 2]],
  [["MOVE"],                 [L],       [An, AnDispIx],          [18, 2, 2]],
  [["MOVE"],                 [L],       [An, AbsW],              [16, 2, 2]],
  [["MOVE"],                 [L],       [An, AbsL],              [20, 3, 2]],
  [["MOVE"],                 [L],       [AnIndir, Dn],           [12, 3, 0]],
  [["MOVE"],                 [L],       [AnIndir, An],           [12, 3, 0]],
  [["MOVE"],                 [L],       [AnIndir, AnIndir],      [20, 3, 2]],
  [["MOVE"],                 [L],       [AnIndir, AnPostInc],    [20, 3, 2]],
  [["MOVE"],                 [L],       [AnIndir, AnPreDec],     [20, 3, 2]],
  [["MOVE"],                 [L],       [AnIndir, AnDisp],       [24, 4, 2]],
  [["MOVE"],                 [L],       [AnIndir, AnDispIx],     [26, 4, 2]],
  [["MOVE"],                 [L],       [AnIndir, AbsW],         [24, 4, 2]],
  [["MOVE"],                 [L],       [AnIndir, AbsL],         [28, 5, 2]],
  [["MOVE"],                 [L],       [AnPostInc, Dn],         [12, 3, 0]],
  [["MOVE"],                 [L],       [AnPostInc, An],         [12, 3, 0]],
  [["MOVE"],                 [L],       [AnPostInc, AnIndir],    [20, 3, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AnPostInc],  [20, 3, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AnPreDec],   [20, 3, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AnDisp],     [24, 4, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AnDispIx],   [26, 4, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AbsW],       [24, 4, 2]],
  [["MOVE"],                 [L],       [AnPostInc, AbsL],       [28, 5, 2]],
  [["MOVE"],                 [L],       [AnPreDec, Dn],          [14, 3, 0]],
  [["MOVE"],                 [L],       [AnPreDec, An],          [14, 3, 0]],
  [["MOVE"],                 [L],       [AnPreDec, AnIndir],     [22, 3, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AnPostInc],   [22, 3, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AnPreDec],    [22, 3, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AnDisp],      [26, 4, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AnDispIx],    [28, 4, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AbsW],        [26, 4, 2]],
  [["MOVE"],                 [L],       [AnPreDec, AbsL],        [30, 5, 2]],
  [["MOVE"],                 [L],       [AnDisp, Dn],            [16, 4, 0]],
  [["MOVE"],                 [L],       [AnDisp, An],            [16, 4, 0]],
  [["MOVE"],                 [L],       [AnDisp, AnIndir],       [24, 4, 2]],
  [["MOVE"],                 [L],       [AnDisp, AnPostInc],     [24, 4, 2]],
  [["MOVE"],                 [L],       [AnDisp, AnPreDec],      [24, 4, 2]],
  [["MOVE"],                 [L],       [AnDisp, AnDisp],        [28, 5, 2]],
  [["MOVE"],                 [L],       [AnDisp, AnDispIx],      [30, 5, 2]],
  [["MOVE"],                 [L],       [AnDisp, AbsW],          [28, 5, 2]],
  [["MOVE"],                 [L],       [AnDisp, AbsL],          [32, 6, 2]],
  [["MOVE"],                 [L],       [AnDispIx, Dn],          [18, 4, 0]],
  [["MOVE"],                 [L],       [AnDispIx, An],          [18, 4, 0]],
  [["MOVE"],                 [L],       [AnDispIx, AnIndir],     [26, 4, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AnPostInc],   [26, 4, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AnPreDec],    [26, 4, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AnDisp],      [30, 5, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AnDispIx],    [32, 5, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AbsW],        [30, 5, 2]],
  [["MOVE"],                 [L],       [AnDispIx, AbsL],        [34, 6, 2]],
  [["MOVE"],                 [L],       [AbsW, Dn],              [16, 4, 0]],
  [["MOVE"],                 [L],       [AbsW, An],              [16, 4, 0]],
  [["MOVE"],                 [L],       [AbsW, AnIndir],         [24, 4, 2]],
  [["MOVE"],                 [L],       [AbsW, AnPostInc],       [24, 4, 2]],
  [["MOVE"],                 [L],       [AbsW, AnPreDec],        [24, 4, 2]],
  [["MOVE"],                 [L],       [AbsW, AnDisp],          [28, 5, 2]],
  [["MOVE"],                 [L],       [AbsW, AnDispIx],        [30, 5, 2]],
  [["MOVE"],                 [L],       [AbsW, AbsW],            [28, 5, 2]],
  [["MOVE"],                 [L],       [AbsW, AbsL],            [32, 6, 2]],
  [["MOVE"],                 [L],       [AbsL, Dn],              [20, 5, 0]],
  [["MOVE"],                 [L],       [AbsL, An],              [20, 5, 0]],
  [["MOVE"],                 [L],       [AbsL, AnIndir],         [28, 5, 2]],
  [["MOVE"],                 [L],       [AbsL, AnPostInc],       [28, 5, 2]],
  [["MOVE"],                 [L],       [AbsL, AnPreDec],        [28, 5, 2]],
  [["MOVE"],                 [L],       [AbsL, AnDisp],          [32, 6, 2]],
  [["MOVE"],                 [L],       [AbsL, AnDispIx],        [34, 6, 2]],
  [["MOVE"],                 [L],       [AbsL, AbsW],            [32, 6, 2]],
  [["MOVE"],                 [L],       [AbsL, AbsL],            [36, 7, 2]],
  [["MOVE"],                 [L],       [PcDisp, Dn],            [16, 4, 0]],
  [["MOVE"],                 [L],       [PcDisp, An],            [16, 4, 0]],
  [["MOVE"],                 [L],       [PcDisp, AnIndir],       [24, 4, 2]],
  [["MOVE"],                 [L],       [PcDisp, AnPostInc],     [24, 4, 2]],
  [["MOVE"],                 [L],       [PcDisp, AnPreDec],      [24, 4, 2]],
  [["MOVE"],                 [L],       [PcDisp, AnDisp],        [28, 5, 2]],
  [["MOVE"],                 [L],       [PcDisp, AnDispIx],      [30, 5, 2]],
  [["MOVE"],                 [L],       [PcDisp, AbsW],          [28, 5, 2]],
  [["MOVE"],                 [L],       [PcDisp, AbsL],          [32, 5, 2]],
  [["MOVE"],                 [L],       [PcDispIx, Dn],          [18, 4, 0]],
  [["MOVE"],                 [L],       [PcDispIx, An],          [18, 4, 0]],
  [["MOVE"],                 [L],       [PcDispIx, AnIndir],     [26, 4, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AnPostInc],   [26, 4, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AnPreDec],    [26, 4, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AnDisp],      [30, 5, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AnDispIx],    [32, 5, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AbsW],        [30, 5, 2]],
  [["MOVE"],                 [L],       [PcDispIx, AbsL],        [34, 6, 2]],
  [["MOVE"],                 [L],       [Imm, Dn],               [12, 3, 0]],
  [["MOVE"],                 [L],       [Imm, An],               [12, 3, 0]],
  [["MOVE"],                 [L],       [Imm, AnIndir],          [20, 3, 2]],
  [["MOVE"],                 [L],       [Imm, AnPostInc],        [20, 3, 2]],
  [["MOVE"],                 [L],       [Imm, AnPreDec],         [20, 3, 2]],
  [["MOVE"],                 [L],       [Imm, AnDisp],           [24, 4, 2]],
  [["MOVE"],                 [L],       [Imm, AnDispIx],         [26, 4, 2]],
  [["MOVE"],                 [L],       [Imm, AbsW],             [24, 4, 2]],
  [["MOVE"],                 [L],       [Imm, AbsL],             [28, 5, 2]],

  [["ADD", "SUB"],           [B, W],    [EA, An],                [8, 1, 0]],
  [["ADD", "SUB"],           [B, W],    [EA, Dn],                [4, 1, 0]],
  [["ADD", "SUB"],           [B, W],    [Dn, M],                 [8, 1, 1]],
  [["ADD", "SUB"],           [B, W],    [Imm, Dn],               [8, 2, 1]],
  [["ADD", "SUB"],           [B, W],    [Imm, M],                [8, 1, 1]],

  [["ADD", "SUB"],           [L],       [M, An],                 [6, 1, 0]],
  [["ADD", "SUB"],           [L],       [M, Dn],                 [6, 1, 0]],
  [["ADD", "SUB"],           [L],       [DI, An],                [8, 1, 0]],
  [["ADD", "SUB"],           [L],       [DI, Dn],                [8, 1, 0]],
  [["ADD", "SUB"],           [L],       [Dn, M],                 [12, 1, 2]],
  [["ADD", "SUB"],           [L],       [Imm, Dn],               [16, 3, 0]],
  [["ADD", "SUB"],           [L],       [Imm, M],                [20, 3, 2]],

  [["AND", "OR"],            [B, W],    [EA, Dn],                [4, 1, 0]],
  [["AND", "OR"],            [B, W],    [Dn, M],                 [8, 1, 1]],
  [["AND", "OR"],            [B, W],    [Imm, Dn],               [8, 2, 0]],
  [["AND", "OR"],            [B, W],    [Imm, M],                [12, 2, 1]],

  [["AND", "OR"],            [L],       [M, Dn],                 [6, 1, 0]],
  [["AND", "OR"],            [L],       [DI, Dn],                [8, 1, 0]],
  [["AND", "OR"],            [L],       [Dn, M],                 [12, 1, 2]],
  [["AND", "OR"],            [L],       [Imm, Dn],               [16, 3, 0]],
  [["AND"],                  [L],       [Imm, M],                [20, 3, 1]],
  [["OR"],                   [L],       [Imm, M],                [20, 3, 2]],

  [["EOR"],                  [B, W],    [Dn, Dn],                [4, 1, 0]],
  [["EOR"],                  [B, W],    [Dn, M],                 [8, 1, 1]],
  [["EOR"],                  [B, W],    [Imm, Dn],               [8, 2, 0]],
  [["EOR"],                  [B, W],    [Imm, M],                [12, 1, 0]],

  [["EOR"],                  [L],       [Dn, Dn],                [8, 1, 0]],
  [["EOR"],                  [L],       [Dn, M],                 [12, 1, 2]],
  [["EOR"],                  [L],       [Imm, Dn],               [16, 3, 0]],
  [["EOR"],                  [L],       [Imm, M],                [20, 3, 2]],

  [["CMP"],                  [B, W],    [EA, An],                [6, 1, 0]],
  [["CMP"],                  [B, W],    [EA, Dn],                [4, 1, 0]],
  [["CMP"],                  [B, W],    [Imm, Dn],               [8, 2, 0]],
  [["CMP"],                  [B, W],    [Imm, M],                [8, 2, 0]],

  [["CMP"],                  [L],       [EA, An],                [6, 1, 0]],
  [["CMP"],                  [L],       [EA, Dn],                [6, 1, 0]],
  [["CMP"],                  [L],       [Imm, Dn],               [14, 3, 0]],
  [["CMP"],                  [L],       [Imm, M],                [12, 3, 0]],

  [["DIVS"],                 [W],       [EA, Dn],                [158, 1, 0]],
  [["DIVU"],                 [W],       [EA, Dn],                [140, 1, 0]],
  [["MULS", "MULU"],         [W],       [EA, Dn],                [70, 1, 0]],

  [["ADDQ", "SUBQ"],         [B, W],    [Imm, Dn],               [4, 1, 0]],
  [["ADDQ", "SUBQ"],         [B, W],    [Imm, An],               [8, 1, 0]],
  [["ADDQ", "SUBQ"],         [B, W],    [Imm, M],                [8, 1, 0]],

  [["ADDQ", "SUBQ"],         [L],       [Imm, Dn],               [8, 1, 0]],
  [["ADDQ", "SUBQ"],         [L],       [Imm, An],               [8, 1, 0]],
  [["ADDQ", "SUBQ"],         [L],       [Imm, M],                [12, 1, 2]],

  [["MOVEQ"],                [L],       [Imm, Dn],               [4, 1, 0]],

  [["CLR", "NOT", "NEG"],    [B, W],    [Dn],                    [4, 1, 0]],
  [["CLR", "NOT", "NEG"],    [B, W],    [M],                     [8, 1, 1]],
  [["CLR", "NOT", "NEG"],    [L],       [Dn],                    [6, 1, 0]],
  [["CLR", "NOT", "NEG"],    [L],       [M],                     [12, 1, 2]],

  [["NBCD"],                 [B],       [Dn],                    [6, 1, 0]],
  [["NBCD"],                 [B],       [M],                     [8, 1, 0]],

  [["NEGX"],                 [B, W],    [Dn],                    [4, 1, 0]],
  [["NEGX"],                 [B, W],    [M],                     [8, 1, 1]],
  [["NEGX"],                 [L],       [Dn],                    [6, 1, 0]],
  [["NEGX"],                 [L],       [M],                     [12, 1, 2]],

  [scc,                      [B],       [Dn],                    [[4, 1, 0], [6, 1, 0]]],
  [scc,                      [B],       [M],                     [[8, 1, 1], [8, 1, 1]]],

  [["TST"],                  [B, W, L], [Dn],                    [4, 1, 0]],
  [["TST"],                  [B, W, L], [M],                     [4, 1, 0]],

  [["TAS"],                  [B],       [Dn],                    [4, 1, 1]],
  [["TAS"],                  [B],       [M],                     [10, 1, 1]],

  [shiftRot,                 [B, W],    [Imm, Dn],               [6, 1, 0, 2]],
  [shiftRot,                 [B, W],    [Dn],                    [6, 1, 0]],
  [shiftRot,                 [B, W],    [Dn, Dn],                [6, 1, 0]], // TODO: max for Dn source?
  [shiftRot,                 [B, W],    [Imm, M],                [8, 1, 1, 2]],
  [shiftRot,                 [B, W],    [M],                     [8, 1, 1]],
  [shiftRot,                 [B, W],    [Dn, M],                 [8, 1, 1]], // TODO: max for Dn source?
  [shiftRot,                 [L],       [Imm, Dn],               [8, 1, 0, 2]],
  [shiftRot,                 [L],       [Dn],                    [8, 1, 0]],
  [shiftRot,                 [L],       [Dn, Dn],                [8, 1, 0]], // TODO: max for Dn source?

  [["BCHG", "BSET", "BCLR"], [B],       [Dn, M],                 [8, 1, 1]],
  [["BCHG", "BSET", "BCLR"], [B],       [Imm, M],                [12, 2, 1]],
  [["BCHG", "BSET"],         [L],       [Dn, Dn],                [8, 1, 0]],
  [["BCHG", "BSET"],         [L],       [Imm, Dn],               [12, 2, 0]],
  [["BCLR"],                 [L],       [Dn, Dn],                [10, 1, 0]],
  [["BCLR"],                 [L],       [Imm, Dn],               [14, 2, 0]],

  [["BTST"],                 [B],       [Dn, M],                 [4, 1, 0]],
  [["BTST"],                 [B],       [Imm, M],                [8, 2, 0]],
  [["BTST"],                 [L],       [Dn, Dn],                [6, 1, 0]],
  [["BTST"],                 [L],       [Imm, Dn],               [10, 2, 0]],

  [["BRA"],                  [B, W],    [AbsL],                  [10, 2, 0]],
  [["BSR"],                  [B, W],    [AbsL],                  [18, 2, 2]],

   [bcc,                     [B],       [AbsL],                  [[10, 2, 0], [8, 1, 0]]],
   [bcc,                     [W],       [AbsL],                  [[10, 2, 0], [12, 1, 0]]],

   [dbcc,                    [W],       [Dn, AbsL],              [[10, 2, 0], [12, 2, 0],  [14, 3, 0]]],

  [["JMP"],                  [NA],      [AnIndir],               [8, 2, 0]],
  [["JMP"],                  [NA],      [AnDisp],                [10, 2, 0]],
  [["JMP"],                  [NA],      [AnDispIx],              [14, 3, 0]],
  [["JMP"],                  [NA],      [AbsW],                  [10, 2, 0]],
  [["JMP"],                  [NA],      [AbsL],                  [12, 3, 0]],
  [["JMP"],                  [NA],      [PcDisp],                [10, 2, 0]],
  [["JMP"],                  [NA],      [PcDispIx],              [14, 3, 0]],

  [["JSR"],                  [NA],      [AnIndir],               [16, 2, 0]],
  [["JSR"],                  [NA],      [AnDisp],                [18, 2, 0]],
  [["JSR"],                  [NA],      [AnDispIx],              [22, 2, 2]],
  [["JSR"],                  [NA],      [AbsW],                  [18, 2, 2]],
  [["JSR"],                  [NA],      [AbsL],                  [20, 3, 2]],
  [["JSR"],                  [NA],      [PcDisp],                [18, 2, 2]],
  [["JSR"],                  [NA],      [PcDispIx],              [22, 2, 2]],

  [["LEA"],                  [L],       [AnIndir, An],           [4, 1, 0]],
  [["LEA"],                  [L],       [AnDisp, An],            [8, 2, 0]],
  [["LEA"],                  [L],       [AnDispIx, An],          [12, 2, 0]],
  [["LEA"],                  [L],       [AbsW, An],              [8, 2, 0]],
  [["LEA"],                  [L],       [AbsL, An],              [12, 3, 0]],
  [["LEA"],                  [L],       [PcDisp, An],            [8, 2, 0]],
  [["LEA"],                  [L],       [PcDispIx, An],          [12, 2, 0]],

  [["PEA"],                  [L],       [AnIndir],               [12, 1, 2]],
  [["PEA"],                  [L],       [AnDisp],                [16, 2, 2]],
  [["PEA"],                  [L],       [AnDispIx],              [20, 2, 2]],
  [["PEA"],                  [L],       [AbsW],                  [16, 2, 2]],
  [["PEA"],                  [L],       [AbsL],                  [20, 3, 2]],
  [["PEA"],                  [L],       [PcDisp],                [16, 2, 2]],
  [["PEA"],                  [L],       [PcDispIx],              [20, 2, 2]],

  [["ADDX", "SUBX"],         [B, W],    [Dn, Dn],                [4, 1, 0]],
  [["ADDX", "SUBX"],         [B, W],    [AnPreDec, AnPreDec],    [18, 3, 0]],
  [["ADDX", "SUBX"],         [L],       [Dn, Dn],                [8, 1, 0]],
  [["ADDX", "SUBX"],         [L],       [AnPreDec, AnPreDec],    [30, 5, 2]],

  [["CMPM"],                 [B, W],    [AnPostInc, AnPostInc],  [12, 3, 0]],
  [["CMPM"],                 [L],       [AnPostInc, AnPostInc],  [20, 5, 0]],

  [["ABCD", "SBCD"],         [B],       [Dn, Dn],                [6, 1, 0]],
  [["ABCD", "SBCD"],         [B],       [AnPreDec, AnPreDec],    [18, 3, 1]],

  [["MOVEP"],                [W],       [Dn, AnDisp],            [16, 2, 2]],
  [["MOVEP"],                [W],       [AnDisp, Dn],            [16, 4, 0]],
  [["MOVEP"],                [L],       [Dn, AnDisp],            [24, 2, 4]],
  [["MOVEP"],                [L],       [AnDisp, Dn],            [24, 6, 0]],

  [["MOVEM"],                [W],       [RegList, AnIndir],      [8, 2, 0, 4, 0, 1]],
  [["MOVEM"],                [W],       [RegList, AnPreDec],     [8, 2, 0, 4, 0, 1]],
  [["MOVEM"],                [W],       [RegList, AnDisp],       [12, 3, 0, 4, 0, 1]],
  [["MOVEM"],                [W],       [RegList, AnDispIx],     [14, 3, 0, 4, 0, 1]],
  [["MOVEM"],                [W],       [RegList, AbsW],         [12, 3, 0, 4, 0, 1]],
  [["MOVEM"],                [W],       [RegList, AbsL],         [16, 4, 0, 4, 0, 1]],

  [["MOVEM"],                [W],       [AnIndir, RegList],      [12, 3, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [AnPostInc, RegList],    [12, 3, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [AnDisp, RegList],       [16, 4, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [AnDispIx, RegList],     [18, 4, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [AbsW, RegList],         [16, 4, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [AbsL, RegList],         [20, 5, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [PcDisp, RegList],       [16, 4, 0, 4, 1, 0]],
  [["MOVEM"],                [W],       [PcDispIx, RegList],     [18, 4, 0, 4, 1, 0]],

  [["MOVEM"],                [L],       [RegList, AnIndir],      [8, 2, 0, 8, 0, 2]],
  [["MOVEM"],                [L],       [RegList, AnPreDec],     [8, 2, 0, 8, 0, 2]],
  [["MOVEM"],                [L],       [RegList, AnDisp],       [12, 3, 0, 8, 0, 2]],
  [["MOVEM"],                [L],       [RegList, AnDispIx],     [14, 3, 0, 8, 0, 2]],
  [["MOVEM"],                [L],       [RegList, AbsW],         [12, 3, 0, 8, 0, 2]],
  [["MOVEM"],                [L],       [RegList, AbsL],         [16, 4, 0, 8, 0, 2]],

  [["MOVEM"],                [L],       [AnIndir, RegList],      [12, 3, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [AnPostInc, RegList],    [12, 3, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [AnDisp, RegList],       [16, 4, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [AnDispIx, RegList],     [18, 4, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [AbsW, RegList],         [16, 4, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [AbsL, RegList],         [20, 5, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [PcDisp, RegList],       [16, 4, 0, 8, 2, 0]],
  [["MOVEM"],                [L],       [PcDispIx, RegList],     [18, 4, 0, 8, 2, 0]],

  [["CHK"],                  [B,W,L],   [Dn],                    [10, 1, 0]],
  [["EXG"],                  [L],       [Dn,Dn],                 [6, 1, 0]],
  [["EXG"],                  [L],       [Dn,An],                 [6, 1, 0]],
  [["EXG"],                  [L],       [An,Dn],                 [6, 1, 0]],
  [["EXG"],                  [L],       [An,An],                 [6, 1, 0]],
  [["EXT"],                  [W, L],    [Dn],                    [4, 1, 0]],
  [["LINK"],                 [NA],      [Dn],                    [16, 2, 2]],
  [["NOP"],                  [NA],      [Dn],                    [4, 1, 0]],
  [["RESET"],                [NA],      [],                      [40, 6, 0]],
  [["RTE"],                  [NA],      [],                      [20, 5, 0]],
  [["RTR"],                  [NA],      [],                      [20, 5, 0]],
  [["RTS"],                  [NA],      [],                      [16, 4, 0]],
  [["STOP"],                 [NA],      [Dn],                    [4, 0, 0]],
  [["SWAP"],                 [W],       [Dn],                    [4, 1, 0]],
  [["TRAP"],                 [NA],      [],                      [38, 4, 0]],
  [["TRAPV"],                [NA],      [],                      [34, 4, 0]],
  [["UNLK"],                 [NA],      [Dn],                    [12, 3, 0]],
];

// Flatten table into key/value for simple lookup by instruction string
// e.g.
// "MOVE.L Dn,Dn": [4, 1, 0]

const timingMap: Record<string, TimeTuple | TimeTuple[]> = {};

for (const row of tbl) {
  const [mnemonics, sizes, operands, times] = row;
  for (const mnemonic of mnemonics) {
    for (const size of sizes) {
      let key = mnemonic;
      if (size !== NA) {
        key += "." + size;
      }
      const eaSize = size === L ? 1 : 0;
      let o: OperandType;

      if (!operands.length) {
        timingMap[key] = times;
      } else if (isOperandGroup(operands[0])) {
        for (o of operandGroups[operands[0]]) {
          const eaTime = eaLookup[o][eaSize];
          let k = key + " " + o;
          if (operands[1]) {
            k += "," + operands[1];
          }
          timingMap[k] = isMultiTime(times)
            ? times.map((t) => addEa(t, eaTime))
            : addEa(times, eaTime);
        }
      } else if (isOperandGroup(operands[1])) {
        for (o of operandGroups[operands[1]]) {
          const eaTime = eaLookup[o][eaSize];
          timingMap[key + " " + operands[0] + "," + o] = isMultiTime(times)
            ? times.map((t) => addEa(t, eaTime))
            : addEa(times, eaTime);
        }
      } else {
        timingMap[key + " " + operands.join(",")] = times;
      }
    }
  }
}

/**
 * Typeguard to test for TimeTuple vs TimeTuple[]
 */
function isMultiTime(times: TimeTuple | TimeTuple[]): times is TimeTuple[] {
  return Array.isArray(times[0]);
}

/**
 * Add effective address lookup to instruction time
 *
 * @param time Base instruction time
 * @param eaTime EA lookup time
 */
function addEa(time: TimeTuple, eaTime: TimeTuple): TimeTuple {
  const [cycles, read, write, ...rest] = time;
  return [cycles + eaTime[0], read + eaTime[1], write + eaTime[2], ...rest];
}
