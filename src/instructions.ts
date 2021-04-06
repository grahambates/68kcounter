export type Instruction =
  | "ABCD"
  | "ADD"
  | "ADDQ"
  | "ADDX"
  | "AND"
  | "ASL"
  | "ASR"
  | "BRA"
  | "BCC"
  | "BCS"
  | "BEQ"
  | "BGE"
  | "BGT"
  | "BHI"
  | "BLE"
  | "BLT"
  | "BMI"
  | "BNE"
  | "BPL"
  | "BVC"
  | "BVS"
  | "BSR"
  | "BCHG"
  | "BCLR"
  | "BSET"
  | "BTST"
  | "CHK"
  | "CLR"
  | "CMP"
  | "CMPM"
  | "DBF"
  | "DBT"
  | "DBCC"
  | "DBCS"
  | "DBEQ"
  | "DBGE"
  | "DBGT"
  | "DBHI"
  | "DBLE"
  | "DBLT"
  | "DBMI"
  | "DBNE"
  | "DBPL"
  | "DBVC"
  | "DBVS"
  | "DIVS"
  | "DIVU"
  | "EOR"
  | "EXG"
  | "EXT"
  | "JMP"
  | "JSR"
  | "LEA"
  | "LINK"
  | "LSL"
  | "LSR"
  | "MOVE"
  | "MOVEM"
  | "MOVEP"
  | "MOVEQ"
  | "MULS"
  | "MULU"
  | "NBCD"
  | "NEG"
  | "NEGX"
  | "NOP"
  | "NOT"
  | "OR"
  | "PEA"
  | "RESET"
  | "ROL"
  | "ROXL"
  | "ROR"
  | "ROXR"
  | "RTE"
  | "RTR"
  | "RTS"
  | "SBCD"
  | "SCC"
  | "SCS"
  | "SEQ"
  | "SGE"
  | "SGT"
  | "SHI"
  | "SLE"
  | "SLT"
  | "SMI"
  | "SNE"
  | "SPL"
  | "SVC"
  | "SVS"
  | "STOP"
  | "SUB"
  | "SUBQ"
  | "SUBX"
  | "SWAP"
  | "TAS"
  | "TRAP"
  | "TRAPV"
  | "TST"
  | "UNLK";

export enum Size {
  B = "B",
  W = "W",
  L = "L",
  // Need a string value for unsized as we use it as a key
  NA = "NA",
}

const b: Size[] = [Size.B];
const w: Size[] = [Size.W];
const l: Size[] = [Size.L];
const bwl: Size[] = [Size.W, Size.B, Size.L]; // Default first
const bw: Size[] = [Size.W, Size.B]; // Default first
const wl: Size[] = [Size.W, Size.L];
const bl: Size[] = [Size.B, Size.L];
const na: Size[] = [Size.NA];

/**
 * Check if string is a valid instruction size
 */
export function isInstructionSize(v: string): v is Size {
  return [Size.B, Size.W, Size.L, Size.NA].includes(v as Size);
}

/**
 * List instructions and their supported sizes.
 */
export const instructions: Record<Instruction, Size[]> = {
  ABCD: b,
  ADD: bwl,
  ADDQ: bwl,
  ADDX: bwl,
  AND: bwl,
  ASL: bwl,
  ASR: bwl,
  BRA: bw,
  BCC: bw,
  BCS: bw,
  BEQ: bw,
  BGE: bw,
  BGT: bw,
  BHI: bw,
  BLE: bw,
  BLT: bw,
  BMI: bw,
  BNE: bw,
  BPL: bw,
  BVC: bw,
  BVS: bw,
  BSR: bw,
  BCHG: bl,
  BCLR: bl,
  BSET: bl,
  BTST: bl,
  CHK: bwl,
  CLR: bwl,
  CMP: bwl,
  CMPM: bwl,
  DBF: w,
  DBT: w,
  DBCC: w,
  DBCS: w,
  DBEQ: w,
  DBGE: w,
  DBGT: w,
  DBHI: w,
  DBLE: w,
  DBLT: w,
  DBMI: w,
  DBNE: w,
  DBPL: w,
  DBVC: w,
  DBVS: w,
  DIVS: w,
  DIVU: w,
  EOR: bwl,
  EXG: l,
  EXT: wl,
  JMP: na,
  JSR: na,
  LEA: l,
  LINK: wl,
  LSL: bwl,
  LSR: bwl,
  MOVE: bwl,
  MOVEM: wl,
  MOVEP: wl,
  MOVEQ: l,
  MULS: wl,
  MULU: wl,
  NBCD: b,
  NEG: bwl,
  NEGX: bwl,
  NOP: na,
  NOT: bwl,
  OR: bwl,
  PEA: l,
  RESET: na,
  ROL: bwl,
  ROXL: bwl,
  ROR: bwl,
  ROXR: bwl,
  RTE: na,
  RTR: na,
  RTS: na,
  SBCD: b,
  SCC: b,
  SCS: b,
  SEQ: b,
  SGE: b,
  SGT: b,
  SHI: b,
  SLE: b,
  SLT: b,
  SMI: b,
  SNE: b,
  SPL: b,
  SVC: b,
  SVS: b,
  STOP: na,
  SUB: bwl,
  SUBQ: bwl,
  SUBX: bwl,
  SWAP: w,
  TAS: b,
  TRAP: na,
  TRAPV: na,
  TST: bwl,
  UNLK: na,
};

/**
 * Check if string is a valid instruction
 */
export function isInstruction(v: string): v is Instruction {
  return instructions[v as Instruction] !== undefined;
}

/**
 * Map alternate to canonical instruction names used in our mappings.
 */
export const instructionAliases: Record<string, Instruction> = {
  // Alternative mnemonics
  BLO: "BCS",
  DBLO: "DBCS",
  DBRA: "DBF",
  // Combine address and immediate variants to single generic instruction
  ADDA: "ADD",
  CMPA: "CMP",
  MOVEA: "MOVE",
  SUBA: "SUB",
  ADDI: "ADD",
  ANDI: "AND",
  CMPI: "CMP",
  SUBI: "SUB",
};

export default instructions;
