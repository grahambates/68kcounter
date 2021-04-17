import instructionSize from "../src/instructionSize";
import { Instruction } from "../src/parse";
import { AddressingModes, Mnemonics, Sizes } from "../src/syntax";

describe("instructionSize()", () => {
  test("word default", () => {
    const result = instructionSize({
      mnemonic: { value: Mnemonics.MOVE },
    } as Instruction);
    expect(result).toEqual(Sizes.W);
  });

  test("long default", () => {
    const result = instructionSize({
      mnemonic: { value: Mnemonics.MOVEQ },
    } as Instruction);
    expect(result).toEqual(Sizes.L);
  });

  test("byte default", () => {
    const result = instructionSize({
      mnemonic: { value: Mnemonics.SCC },
    } as Instruction);
    expect(result).toEqual(Sizes.B);
  });

  test("bit op - register", () => {
    const result = instructionSize({
      mnemonic: { value: Mnemonics.BTST },
      operands: [{}, { addressingMode: AddressingModes.Dn }],
    } as Instruction);
    expect(result).toEqual(Sizes.L);
  });

  test("bit op - memory", () => {
    const result = instructionSize({
      mnemonic: { value: Mnemonics.BTST },
      operands: [{}, { addressingMode: AddressingModes.AbsW }],
    } as Instruction);
    expect(result).toEqual(Sizes.B);
  });
});
