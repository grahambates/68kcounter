import getQualifier from "../src/getQualifier";
import { Instruction } from "../src/parse";
import { AddressingModes, Mnemonics, Qualifiers } from "../src/syntax";

describe("getQualifier()", () => {
  test("word default", () => {
    const result = getQualifier({
      mnemonic: { value: Mnemonics.MOVE },
    } as Instruction);
    expect(result).toEqual(Qualifiers.W);
  });

  test("long default", () => {
    const result = getQualifier({
      mnemonic: { value: Mnemonics.MOVEQ },
    } as Instruction);
    expect(result).toEqual(Qualifiers.L);
  });

  test("byte default", () => {
    const result = getQualifier({
      mnemonic: { value: Mnemonics.SCC },
    } as Instruction);
    expect(result).toEqual(Qualifiers.B);
  });

  test("bit op - register", () => {
    const result = getQualifier({
      mnemonic: { value: Mnemonics.BTST },
      operands: [{}, { addressingMode: AddressingModes.Dn }],
    } as Instruction);
    expect(result).toEqual(Qualifiers.L);
  });

  test("bit op - memory", () => {
    const result = getQualifier({
      mnemonic: { value: Mnemonics.BTST },
      operands: [{}, { addressingMode: AddressingModes.AbsW }],
    } as Instruction);
    expect(result).toEqual(Qualifiers.B);
  });
});
