import { Instruction } from "./parse";
import {
  AddressingModes,
  Mnemonic,
  mnemonicGroups,
  Mnemonics,
  Qualifier,
  Qualifiers,
} from "./syntax";

/**
 * Gets the size qualifier of an instruction, applying defaults where not specified
 */
export default function getQualifier({
  mnemonic,
  qualifier,
  operands,
}: Instruction): Qualifier | null {
  if (qualifier) {
    return qualifier.value;
  } else if (longDefault.includes(mnemonic.value)) {
    return Qualifiers.L;
  } else if (byteDefault.includes(mnemonic.value)) {
    return Qualifiers.B;
  } else if (bitOps.includes(mnemonic.value)) {
    return operands[1] && operands[1].addressingMode === AddressingModes.Dn
      ? Qualifiers.L
      : Qualifiers.B;
  } else if (unsized.includes(mnemonic.value)) {
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
