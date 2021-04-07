import { Statement } from ".";
import { Size } from "./instructions";
import { OperandType } from "./operands";

/**
 * Get word size of statement
 */
export function getWords(statement: Statement): number {
  const { instruction, size, source } = statement;

  if (source && source.type === OperandType.Imm) {
    const immInstrs = ["AND", "ADD", "SUB", "OR", "CMP", "EOR"];
    if (immInstrs.includes(instruction)) {
      return size === Size.L ? 3 : 2;
    }
    const bitInstrs = ["BCHG", "BCLR", "BTST"];
    if (bitInstrs.includes(instruction)) {
      return 2;
    }
  }

  const bccInstrs = [
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
  if (bccInstrs.includes(instruction)) {
    return size === Size.B ? 1 : 2;
  }

  const doubleInstrs = [
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
  if (doubleInstrs.includes(instruction)) {
    return 2;
  }

  return 1;
}
