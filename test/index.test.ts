import fs from "fs";
import { OperandType } from "../src/operands";
import { Size } from "../src/mnemonics";
import parse, { Line, parseLine } from "../src";

describe("parse()", () => {
  test.only("multi line", () => {
    const input = `label:
         MOVE.W  #1,d0 ; Comment
         ; Comment
         MOVE.W  d0,d1`;

    const expected: Line[] = [
      { text: "label:", label: "label" },
      {
        text: "         MOVE.W  #1,d0 ; Comment",
        instruction: {
          mnemonic: "MOVE",
          size: Size.W,
          source: { text: "#1", type: OperandType.Imm, value: 1 },
          dest: { text: "d0", type: OperandType.Dn },
        },
        timings: { clock: 8, read: 2, write: 0 },
        words: 2,
      },
      { text: "         ; Comment" },
      {
        text: "         MOVE.W  d0,d1",
        instruction: {
          mnemonic: "MOVE",
          size: Size.W,
          source: { text: "d0", type: OperandType.Dn },
          dest: { text: "d1", type: OperandType.Dn },
        },
        timings: { clock: 4, read: 1, write: 0 },
        words: 1,
      },
    ];

    expect(parse(input)).toEqual(expected);
  });

  test("example file", () => {
    const code = fs.readFileSync(__dirname + "/examples/example.s").toString();
    parse(code);
  });
});

describe("parseLine()", () => {
  test("two operands", () => {
    const text = "     MOVE.W  #1,d0";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("tab separated", () => {
    const text = "\t\t\tMOVE.W\t\t#1,d0";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("not case sensitive", () => {
    const text = "     move.w #1,D0";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "D0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("with comment", () => {
    const text = "     MOVE.W #1,d0    ; ignore this";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("with label", () => {
    const text = "l0:     MOVE.W #1,d0";
    const expected: Line = {
      text,
      label: "l0",
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("with label no colon", () => {
    const text = "l0     MOVE.W #1,d0";
    const expected: Line = {
      text,
      label: "l0",
      instruction: {
        mnemonic: "MOVE",
        size: Size.W,
        source: { text: "#1", type: OperandType.Imm, value: 1 },
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 8, read: 2, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("single arg", () => {
    const text = "     CLR.W d0";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "CLR",
        size: Size.W,
        dest: { text: "d0", type: OperandType.Dn },
      },
      timings: { clock: 4, read: 1, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("no arg", () => {
    const text = "     RTS";
    const expected: Line = {
      text,
      instruction: {
        mnemonic: "RTS",
        size: Size.NA,
      },
      timings: { clock: 16, read: 4, write: 0 },
      words: 1,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("only label", () => {
    const text = "l0:";
    const expected: Line = {
      text,
      label: "l0",
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("only comment", () => {
    const text = "; Comment";
    const expected: Line = {
      text,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("only space", () => {
    const text = "\t";
    const expected: Line = {
      text,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("empty", () => {
    const text = "";
    const expected: Line = {
      text,
    };
    expect(parseLine(text)).toEqual(expected);
  });

  test("assignment", () => {
    const text = "FOO EQU $1";
    const expected: Line = {
      text,
    };
    expect(parseLine(text)).toEqual(expected);
  });
});
