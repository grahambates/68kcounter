import { Instruction } from "./parse";
import {
  Mnemonics,
  mnemonicGroups,
  Mnemonic,
  AddressingModes,
  AddressingMode,
  Qualifiers,
} from "./syntax";

const bitOps: Mnemonic[] = [Mnemonics.BCHG, Mnemonics.BCLR, Mnemonics.BTST];
const branchOps: Mnemonic[] = [
  Mnemonics.BRA,
  Mnemonics.BSR,
  ...mnemonicGroups.BCC,
];
const quick: Mnemonic[] = [Mnemonics.MOVEQ, Mnemonics.ADDQ, Mnemonics.SUBQ];
const doubles: Mnemonic[] = [
  ...mnemonicGroups.DBCC,
  Mnemonics.LINK,
  Mnemonics.MOVEM,
  Mnemonics.MOVEP,
  Mnemonics.STOP,
];

const dispTypes: AddressingMode[] = [
  AddressingModes.AnDisp,
  AddressingModes.AnDispIx,
  AddressingModes.PcDisp,
  AddressingModes.PcDispIx,
];

/**
 * Get word length of instruction
 */
export default function instructionLength(instruction: Instruction): number {
  const { mnemonic, qualifier: size, operands } = instruction;

  // Bcc.W is 2 words
  if (branchOps.includes(mnemonic.value)) {
    return size && size.value === Qualifiers.B ? 1 : 2;
  }
  // These instructions are always 2 words
  if (doubles.includes(mnemonic.value)) {
    return 2;
  }
  // Unary instructions are always 1 word
  if (!operands.length) {
    return 1;
  }

  let words = 1;

  for (const { addressingMode } of operands) {
    // Absolute value:
    if (addressingMode === AddressingModes.AbsW) {
      words += 1;
    } else if (addressingMode === AddressingModes.AbsL) {
      words += 2;
    }
    // Displacement
    else if (dispTypes.includes(addressingMode)) {
      words += 1;
    }
    // Immediate value:
    else if (
      addressingMode === AddressingModes.Imm &&
      !quick.includes(mnemonic.value) &&
      !mnemonicGroups.SHIFT.includes(mnemonic.value)
    ) {
      if (bitOps.includes(mnemonic.value)) {
        words += 1;
      } else {
        words += size && size.value === Qualifiers.L ? 2 : 1;
      }
    }
  }

  return words;
}
