type Values<T> = T[keyof T];

export const Mnemonics = {
  ABCD: "ABCD",
  ADD: "ADD",
  ADDA: "ADDA",
  ADDI: "ADDI",
  ADDQ: "ADDQ",
  ADDX: "ADDX",
  AND: "AND",
  ANDI: "ANDI",
  ASL: "ASL",
  ASR: "ASR",
  BCC: "BCC",
  BCHG: "BCHG",
  BCLR: "BCLR",
  BCS: "BCS",
  BEQ: "BEQ",
  BGE: "BGE",
  BGT: "BGT",
  BHI: "BHI",
  BLE: "BLE",
  BLT: "BLT",
  BMI: "BMI",
  BNE: "BNE",
  BPL: "BPL",
  BRA: "BRA",
  BSET: "BSET",
  BSR: "BSR",
  BTST: "BTST",
  BVC: "BVC",
  BVS: "BVS",
  CHK: "CHK",
  CLR: "CLR",
  CMP: "CMP",
  CMPA: "CMPA",
  CMPI: "CMPI",
  CMPM: "CMPM",
  DBCC: "DBCC",
  DBCS: "DBCS",
  DBEQ: "DBEQ",
  DBF: "DBF",
  DBGE: "DBGE",
  DBGT: "DBGT",
  DBHI: "DBHI",
  DBLE: "DBLE",
  DBLT: "DBLT",
  DBMI: "DBMI",
  DBNE: "DBNE",
  DBPL: "DBPL",
  DBT: "DBT",
  DBVC: "DBVC",
  DBVS: "DBVS",
  DIVS: "DIVS",
  DIVU: "DIVU",
  EOR: "EOR",
  EORI: "EORI",
  EXG: "EXG",
  EXT: "EXT",
  JMP: "JMP",
  JSR: "JSR",
  LEA: "LEA",
  LINK: "LINK",
  LSL: "LSL",
  LSR: "LSR",
  MOVE: "MOVE",
  MOVEA: "MOVEA",
  MOVEM: "MOVEM",
  MOVEP: "MOVEP",
  MOVEQ: "MOVEQ",
  MULS: "MULS",
  MULU: "MULU",
  NBCD: "NBCD",
  NEG: "NEG",
  NEGX: "NEGX",
  NOP: "NOP",
  NOT: "NOT",
  OR: "OR",
  ORI: "ORI",
  PEA: "PEA",
  RESET: "RESET",
  ROL: "ROL",
  ROR: "ROR",
  ROXL: "ROXL",
  ROXR: "ROXR",
  RTE: "RTE",
  RTR: "RTR",
  RTS: "RTS",
  SBCD: "SBCD",
  SCC: "SCC",
  SCS: "SCS",
  SEQ: "SEQ",
  SGE: "SGE",
  SGT: "SGT",
  SHI: "SHI",
  SLE: "SLE",
  SLT: "SLT",
  SMI: "SMI",
  SNE: "SNE",
  SPL: "SPL",
  STOP: "STOP",
  SUB: "SUB",
  SUBA: "SUBA",
  SUBI: "SUBI",
  SUBQ: "SUBQ",
  SUBX: "SUBX",
  SVC: "SVC",
  SVS: "SVS",
  SWAP: "SWAP",
  TAS: "TAS",
  TRAP: "TRAP",
  TRAPV: "TRAPV",
  TST: "TST",
  UNLK: "UNLK",
} as const;

export type Mnemonic = Values<typeof Mnemonics>;

export function isMnemonic(v: string): v is Mnemonic {
  return Mnemonics[v as Mnemonic] !== undefined;
}

export const Qualifiers = {
  B: "B",
  W: "W",
  L: "L",
  Q: "Q",
  S: "S",
  D: "D",
  X: "X",
} as const;

export type Qualifier = Values<typeof Qualifiers>;

export function isQualifier(v: string): v is Qualifier {
  return Qualifiers[v as Qualifier] !== undefined;
}

export const AddressingModes = {
  Dn: "Dn",
  An: "An",
  AnIndir: "(An)",
  AnPostInc: "(An)+",
  AnPreDec: "-(An)",
  AnDisp: "d(An)",
  AnDispIx: "d(An,ix)",
  PcDisp: "d(PC)",
  PcDispIx: "d(PC,ix)",
  AbsW: "xxx.W",
  AbsL: "xxx.L",
  RegList: "RegList",
  Imm: "#xxx",
} as const;

export type AddressingMode = Values<typeof AddressingModes>;

// Groups

export type MnemonicGroup = "BCC" | "DBCC" | "SCC" | "SHIFT";

export const mnemonicGroups: Record<MnemonicGroup, Mnemonic[]> = {
  SCC: [
    Mnemonics.SCC,
    Mnemonics.SCS,
    Mnemonics.SEQ,
    Mnemonics.SGE,
    Mnemonics.SGT,
    Mnemonics.SHI,
    Mnemonics.SLE,
    Mnemonics.SLT,
    Mnemonics.SMI,
    Mnemonics.SNE,
    Mnemonics.SPL,
    Mnemonics.SVC,
    Mnemonics.SVS,
  ],
  BCC: [
    Mnemonics.BCC,
    Mnemonics.BCS,
    Mnemonics.BEQ,
    Mnemonics.BGE,
    Mnemonics.BGT,
    Mnemonics.BHI,
    Mnemonics.BLE,
    Mnemonics.BLT,
    Mnemonics.BMI,
    Mnemonics.BNE,
    Mnemonics.BPL,
    Mnemonics.BVC,
    Mnemonics.BVS,
  ],
  DBCC: [
    Mnemonics.DBCC,
    Mnemonics.DBCS,
    Mnemonics.DBEQ,
    Mnemonics.DBF,
    Mnemonics.DBGE,
    Mnemonics.DBGT,
    Mnemonics.DBHI,
    Mnemonics.DBLE,
    Mnemonics.DBLT,
    Mnemonics.DBMI,
    Mnemonics.DBNE,
    Mnemonics.DBPL,
    Mnemonics.DBT,
    Mnemonics.DBVC,
    Mnemonics.DBVS,
  ],
  SHIFT: [
    Mnemonics.LSL,
    Mnemonics.LSR,
    Mnemonics.ASL,
    Mnemonics.ASR,
    Mnemonics.ROL,
    Mnemonics.ROR,
    Mnemonics.ROXL,
    Mnemonics.ROXR,
  ],
};

export type AddressingModeGroup = "EA" | "DI" | "M";

export const addressingModeGroups: Record<
  AddressingModeGroup,
  AddressingMode[]
> = {
  EA: [
    AddressingModes.Dn,
    AddressingModes.An,
    AddressingModes.AnIndir,
    AddressingModes.AnPostInc,
    AddressingModes.AnPreDec,
    AddressingModes.AnDisp,
    AddressingModes.AnDispIx,
    AddressingModes.PcDisp,
    AddressingModes.PcDispIx,
    AddressingModes.AbsW,
    AddressingModes.AbsL,
    AddressingModes.Imm,
  ],
  DI: [AddressingModes.Dn, AddressingModes.An, AddressingModes.Imm],
  M: [
    AddressingModes.AnIndir,
    AddressingModes.AnPostInc,
    AddressingModes.AnPreDec,
    AddressingModes.AnDisp,
    AddressingModes.AnDispIx,
    AddressingModes.PcDisp,
    AddressingModes.PcDispIx,
    AddressingModes.AbsW,
    AddressingModes.AbsL,
  ],
};

export const Directives = {
  // Memory:
  DC: "DC",
  DCB: "DCB",
  DS: "DS",
  DB: "DB",
  DW: "DW",
  DL: "DL",
  // Sections:
  SECTION: "SECTION",
  BSS: "BSS",
  BSS_C: "BSS_C",
  BSS_F: "BSS_F",
  CSEG: "CSEG",
  CODE: "CODE",
  CODE_C: "CODE_C",
  CODE_F: "CODE_F",
  DATA: "DATA",
  DATA_C: "DATA_C",
  DATA_F: "DATA_F",
  DSEG: "DSEG",
  // Assignements:
  EQU: "EQU",
  FEQU: "FEQU",
  "=": "=",
  // Imports:
  INCLUDE: "INCLUDE",
  INCDIR: "INCDIR",
  INCBIN: "INCBIN",
  // Conditions:
  IFEQ: "IFEQ",
  IFNE: "IFNE",
  IFGT: "IFGT",
  IFGE: "IFGE",
  IFLT: "IFLT",
  IFLE: "IFLE",
  IFB: "IFB",
  IFNB: "IFNB",
  IFC: "IFC",
  IFNC: "IFNC",
  IFD: "IFD",
  IFND: "IFND",
  IFMACROD: "IFMACROD",
  IFMACROND: "IFMACROND",
  ELSE: "ELSE",
  END: "END",
  ENDIF: "ENDIF",
  // Other:
  OPT: "OPT",
  ALIGN: "ALIGN",
  CARGS: "CARGS",
  CLRFO: "CLRFO",
  CLRSO: "CLRSO",
  CNOP: "CNOP",
  COMM: "COMM",
  COMMENT: "COMMENT",
  ECHO: "ECHO",
  EINLINE: "EINLINE",
  ENDC: "ENDC",
  ENDM: "ENDM",
  ENDF: "ENDF",
  ENDP: "ENDP",
  ENDR: "ENDR",
  EREM: "EREM",
  EVEN: "EVEN",
  FAIL: "FAIL",
  FPU: "FPU",
  IDNT: "IDNT",
  INLINE: "INLINE",
  JUMPPTR: "JUMPPTR",
  LIST: "LIST",
  LLEN: "LLEN",
  LOAD: "LOAD",
  MACHINE: "MACHINE",
  MEXIT: "MEXIT",
  MMU: "MMU",
  NOLIST: "NOLIST",
  NOPAGE: "NOPAGE",
  NREF: "NREF",
  ODD: "ODD",
  OFFSET: "OFFSET",
  OPWORD: "OPWORD",
  ORG: "ORG",
  OUTPUT: "OUTPUT",
  PAGE: "PAGE",
  PLEN: "PLEN",
  PRINTT: "PRINTT",
  PRINTV: "PRINTV",
  PUBLIC: "PUBLIC",
  RECORD: "RECORD",
  REM: "REM",
  REPT: "REPT",
  RORG: "RORG",
  RSRESET: "RSRESET",
  RSSET: "RSSET",
  SET: "SET",
  SETFO: "SETFO",
  SETSO: "SETSO",
  SPC: "SPC",
  TEXT: "TEXT",
  TTL: "TTL",
  WEAK: "WEAK",
  XDEF: "XDEF",
  XREF: "XREF",
} as const;

export type Directive = Values<typeof Directives>;
export function isDirective(v: string): v is Directive {
  return Directives[v as Directive] !== undefined;
}
