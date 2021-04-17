import { Instruction } from "./parse";
import {
  AddressingModes,
  Mnemonic,
  mnemonicGroups,
  Mnemonics,
  Size,
  Sizes,
} from "./syntax";

/**
 * Gets the size of an instruction, applying defaults where not specified
 */
export default function instructionSize({
  mnemonic,
  size,
  operands,
}: Instruction): Size | null {
  if (size) {
    return size.value;
  } else if (longDefault.includes(mnemonic.value)) {
    return Sizes.L;
  } else if (byteDefault.includes(mnemonic.value)) {
    return Sizes.B;
  } else if (bitOps.includes(mnemonic.value)) {
    return operands[1] && operands[1].addressingMode === AddressingModes.Dn
      ? Sizes.L
      : Sizes.B;
  } else if (unsized.includes(mnemonic.value)) {
    return null;
  }
  return Sizes.W;
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
