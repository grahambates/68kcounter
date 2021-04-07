import { Size } from "../src/instructions";
import { OperandType } from "../src/operands";
import { getWords } from "../src/words";

describe("getWords", () => {
  test("immediate B", () => {
    expect(
      getWords({
        instruction: "ADD",
        size: Size.B,
        source: { type: OperandType.Immediate, value: "#1" },
        dest: { type: OperandType.DirectData, value: "d0" },
      })
    ).toEqual(2);
  });

  test("immediate W", () => {
    expect(
      getWords({
        instruction: "ADD",
        size: Size.W,
        source: { type: OperandType.Immediate, value: "#1" },
        dest: { type: OperandType.DirectData, value: "d0" },
      })
    ).toEqual(2);
  });

  test("immediate L", () => {
    expect(
      getWords({
        instruction: "ADD",
        size: Size.L,
        source: { type: OperandType.Immediate, value: "#1" },
        dest: { type: OperandType.DirectData, value: "d0" },
      })
    ).toEqual(3);
  });

  test("bit", () => {
    expect(
      getWords({
        instruction: "BCHG",
        size: Size.B,
        source: { type: OperandType.Immediate, value: "#1" },
        dest: { type: OperandType.DirectData, value: "d0" },
      })
    ).toEqual(2);
  });

  test("Bcc B", () => {
    expect(
      getWords({
        instruction: "BRA",
        size: Size.B,
        dest: { type: OperandType.AbsoluteW, value: "foo" },
      })
    ).toEqual(1);
  });

  test("Bcc W", () => {
    expect(
      getWords({
        instruction: "BRA",
        size: Size.W,
        dest: { type: OperandType.AbsoluteW, value: "foo" },
      })
    ).toEqual(2);
  });

  test("DBcc", () => {
    expect(
      getWords({
        instruction: "DBF",
        size: Size.W,
        dest: { type: OperandType.AbsoluteW, value: "foo" },
      })
    ).toEqual(2);
  });

  test("MOVEM", () => {
    expect(
      getWords({
        instruction: "DBF",
        size: Size.W,
        source: { type: OperandType.RegList, value: "d0-d6" },
        dest: { type: OperandType.IndirectPre, value: "-(sp)" },
      })
    ).toEqual(2);
  });
});
