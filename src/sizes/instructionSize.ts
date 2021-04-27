import {
  Mnemonics,
  mnemonicGroups,
  Mnemonic,
  AddressingModes,
  AddressingMode,
  Qualifiers,
} from "../syntax";
import { InstructionStatement } from "../parse/nodes";

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
 * Get byte size of instruction statement
 */
export default function instructionSize({
  opcode: { op, qualifier },
  operands,
}: InstructionStatement): number {
  // Bcc.W is 2 words
  if (branchOps.includes(op.name)) {
    return qualifier && qualifier.name === Qualifiers.B ? 2 : 4;
  }
  // These instructions are always 2 words
  if (doubles.includes(op.name)) {
    return 4;
  }
  // Unary instructions are always 1 word
  if (!operands.length) {
    return 2;
  }

  let words = 1;

  for (const { mode } of operands) {
    // Absolute value:
    if (mode === AddressingModes.AbsW) {
      words += 1;
    } else if (mode === AddressingModes.AbsL) {
      words += 2;
    }
    // Displacement
    else if (dispTypes.includes(mode)) {
      words += 1;
    }
    // Immediate value:
    else if (
      mode === AddressingModes.Imm &&
      !quick.includes(op.name) &&
      !mnemonicGroups.SHIFT.includes(op.name)
    ) {
      if (bitOps.includes(op.name)) {
        words += 1;
      } else {
        words += qualifier && qualifier.name === Qualifiers.L ? 2 : 1;
      }
    }
  }

  return words * 2;
}
