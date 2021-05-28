import {
  AddressingModes,
  Mnemonic,
  mnemonicGroups,
  Mnemonics,
  Qualifier,
  Qualifiers,
} from "../syntax";
import { InstructionStatement } from "./nodes";

/**
 * Gets the size qualifier of an instruction, applying defaults where not specified
 */
export default function instructionQualifier({
  opcode: { op, qualifier },
  operands,
}: InstructionStatement): Qualifier | null {
  if (qualifier) {
    return qualifier.name;
  } else if (longDefault.includes(op.name)) {
    return Qualifiers.L;
  } else if (byteDefault.includes(op.name)) {
    return Qualifiers.B;
  } else if (bitOps.includes(op.name)) {
    return operands[1] && operands[1].mode === AddressingModes.Dn
      ? Qualifiers.L
      : Qualifiers.B;
  } else if (unsized.includes(op.name)) {
    return null;
  }
  return Qualifiers.W;
}

// Default to word size for instructions apart from these exceptions:
const unsized: Mnemonic[] = [
  Mnemonics.JMP,
  Mnemonics.JSR,
  Mnemonics.NOP,
  Mnemonics.RESET,
  Mnemonics.RTE,
  Mnemonics.RTR,
  Mnemonics.RTS,
  Mnemonics.STOP,
  Mnemonics.TRAP,
  Mnemonics.TRAPV,
  Mnemonics.UNLK,
  Mnemonics.ILLEGAL,
];
const longDefault: Mnemonic[] = [
  Mnemonics.MOVEQ,
  Mnemonics.EXG,
  Mnemonics.LEA,
  Mnemonics.PEA,
];
const byteDefault: Mnemonic[] = [
  Mnemonics.NBCD,
  Mnemonics.ABCD,
  Mnemonics.SBCD,
  Mnemonics.SCC,
  Mnemonics.TAS,
  ...mnemonicGroups.SCC,
];
const bitOps: Mnemonic[] = [
  Mnemonics.BCHG,
  Mnemonics.BSET,
  Mnemonics.BCLR,
  Mnemonics.BTST,
];
