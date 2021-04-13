import { Size } from "../src/mnemonics";
import { OperandType } from "../src/operands";
import { getWords } from "../src/words";

describe("getWords", () => {
  test("immediate B", () => {
    expect(
      getWords({
        mnemonic: "ADD",
        size: Size.B,
        source: { type: OperandType.Imm, text: "#1" },
        dest: { type: OperandType.Dn, text: "d0" },
      })
    ).toEqual(2);
  });

  test("immediate W", () => {
    expect(
      getWords({
        mnemonic: "ADD",
        size: Size.W,
        source: { type: OperandType.Imm, text: "#1" },
        dest: { type: OperandType.Dn, text: "d0" },
      })
    ).toEqual(2);
  });

  test("immediate L", () => {
    expect(
      getWords({
        mnemonic: "ADD",
        size: Size.L,
        source: { type: OperandType.Imm, text: "#1" },
        dest: { type: OperandType.Dn, text: "d0" },
      })
    ).toEqual(3);
  });

  test("bit", () => {
    expect(
      getWords({
        mnemonic: "BCHG",
        size: Size.B,
        source: { type: OperandType.Imm, text: "#1" },
        dest: { type: OperandType.Dn, text: "d0" },
      })
    ).toEqual(2);
  });

  test("Bcc B", () => {
    expect(
      getWords({
        mnemonic: "BRA",
        size: Size.B,
        dest: { type: OperandType.AbsW, text: "foo" },
      })
    ).toEqual(1);
  });

  test("Bcc W", () => {
    expect(
      getWords({
        mnemonic: "BRA",
        size: Size.W,
        dest: { type: OperandType.AbsW, text: "foo" },
      })
    ).toEqual(2);
  });

  test("DBcc", () => {
    expect(
      getWords({
        mnemonic: "DBF",
        size: Size.W,
        dest: { type: OperandType.AbsW, text: "foo" },
      })
    ).toEqual(2);
  });

  test("MOVEM", () => {
    expect(
      getWords({
        mnemonic: "DBF",
        size: Size.W,
        source: { type: OperandType.RegList, text: "d0-d6" },
        dest: { type: OperandType.AnPreDec, text: "-(sp)" },
      })
    ).toEqual(2);
  });

  test("NOP", () => {
    expect(
      getWords({
        mnemonic: "NOP",
        size: Size.NA,
      })
    ).toEqual(1);
  });
});
