import { Instruction } from ".";
import { Mnemonic, Size } from "./mnemonics";
import { OperandType } from "./operands";

/**
 * Get word size of statement
 */
export function getWords(instruction: Instruction): number {
  const { mnemonic, size, source } = instruction;

  if (source && source.type === OperandType.Imm) {
    const immediate: Mnemonic[] = ["AND", "ADD", "SUB", "OR", "CMP", "EOR"];
    if (immediate.includes(mnemonic)) {
      return size === Size.L ? 3 : 2;
    }
    const bitOps: Mnemonic[] = ["BCHG", "BCLR", "BTST"];
    if (bitOps.includes(mnemonic)) {
      return 2;
    }
  }

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
  if (bcc.includes(mnemonic)) {
    return size === Size.B ? 1 : 2;
  }

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
  if (doubles.includes(mnemonic)) {
    return 2;
  }

  return 1;
}
