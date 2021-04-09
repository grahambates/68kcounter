import { Instruction } from ".";
import { Mnemonic, Size } from "./mnemonics";
import { OperandType } from "./operands";

const immediate: Mnemonic[] = ["MOVE", "AND", "ADD", "SUB", "OR", "CMP", "EOR"];
const bitOps: Mnemonic[] = ["BCHG", "BCLR", "BTST"];
const bcc: Mnemonic[] = [
  "BRA",
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
  "BVC",
  "BVS",
  "BSR",
];
const doubles: Mnemonic[] = [
  "DBF",
  "DBT",
  "DBCC",
  "DBCS",
  "DBEQ",
  "DBGE",
  "DBGT",
  "DBHI",
  "DBLE",
  "DBLT",
  "DBMI",
  "DBNE",
  "DBPL",
  "DBVC",
  "DBVS",
  "LINK",
  "MOVEM",
  "MOVEP",
  "STOP",
];

const dispTypes = [
  OperandType.AnDisp,
  OperandType.AnDispIx,
  OperandType.PcDisp,
  OperandType.PcDispIx,
];

/**
 * Get word size of statement
 */
export function getWords(instruction: Instruction): number {
  const { mnemonic, size, source, dest } = instruction;

  // Bcc.W is 2 words
  if (bcc.includes(mnemonic)) {
    return size === Size.B ? 1 : 2;
  }
  // These instructions are always 2 words
  if (doubles.includes(mnemonic)) {
    return 2;
  }
  // Unary instructions are always 1 word
  if (!dest) {
    return 1;
  }

  let words = 1;

  // Absolute value in dest:
  if (dest.type === OperandType.AbsW) {
    words += 1;
  } else if (dest.type === OperandType.AbsL) {
    words += 2;
  }
  // Displacement in dest
  else if (dispTypes.includes(dest.type)) {
    words += 1;
  }

  if (!source) {
    return words;
  }

  // Absolute value in source:
  if (source.type === OperandType.AbsW) {
    words += 1;
  } else if (source.type === OperandType.AbsL) {
    words += 2;
  }
  // Displacement in source
  else if (dispTypes.includes(source.type)) {
    words += 1;
  }

  // Immediate value in source:
  if (source.type === OperandType.Imm) {
    if (immediate.includes(mnemonic)) {
      words += size === Size.L ? 2 : 1;
    } else if (bitOps.includes(mnemonic)) {
      words += 1;
    }
  }

  return words;
}
