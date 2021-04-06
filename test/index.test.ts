import fs from "fs";
import { ArgType } from "../src/args";
import { SIZE_L, SIZE_NA, SIZE_W } from "../src/instructions";
import parse, {
  calcN,
  evalImmediate,
  parseLine,
  rangeN,
  splitParams,
} from "../src";

describe("parse()", () => {
  test("multi line", () => {
    const input = `label:
         MOVE.W  #1,d0 ; Comment
         ; Comment
         MOVE.W  d0,d1`;

    expect(parse(input)).toEqual([
      { text: "label:", label: "label" },
      {
        text: "         MOVE.W  #1,d0 ; Comment",
        op: {
          instruction: "MOVE",
          size: SIZE_W,
          n: 1,
          args: [
            { value: "#1", type: ArgType.Immediate },
            { value: "d0", type: ArgType.DirectData },
          ],
        },
        timings: { clock: 8, read: 2, write: 0 },
      },
      { text: "         ; Comment" },
      {
        text: "         MOVE.W  d0,d1",
        op: {
          instruction: "MOVE",
          size: SIZE_W,
          args: [
            { value: "d0", type: ArgType.DirectData },
            { value: "d1", type: ArgType.DirectData },
          ],
        },
        timings: { clock: 4, read: 1, write: 0 },
      },
    ]);
  });

  test("example file", () => {
    const code = fs.readFileSync(__dirname + "/examples/example.s").toString();
    parse(code);
  });
});

describe("parseLine()", () => {
  test("two args", () => {
    const text = "     MOVE.W  #1,d0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("tab separated", () => {
    const text = "\t\t\tMOVE.W\t\t#1,d0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("not case sensitive", () => {
    const text = "     move.w #1,D0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "D0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("with comment", () => {
    const text = "     MOVE.W #1,d0    ; ignore this";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("with label", () => {
    const text = "l0:     MOVE.W #1,d0";
    expect(parseLine(text)).toEqual({
      text,
      label: "l0",
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("with label no colon", () => {
    const text = "l0     MOVE.W #1,d0";
    expect(parseLine(text)).toEqual({
      text,
      label: "l0",
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("default size", () => {
    const text = "     MOVE #1,d0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVE",
        size: SIZE_W,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 8, read: 2, write: 0 },
    });
  });

  test("alias", () => {
    const text = "     BLO someLabel";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "BCS",
        size: SIZE_W,
        args: [
          {
            type: ArgType.AbsoluteL,
            value: "someLabel",
          },
        ],
      },
      timings: [
        { clock: 10, read: 2, write: 0 },
        { clock: 12, read: 1, write: 0 },
      ],
    });
  });

  test("single arg", () => {
    const text = "     CLR.W d0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "CLR",
        size: SIZE_W,
        args: [{ value: "d0", type: ArgType.DirectData }],
      },
      timings: { clock: 4, read: 1, write: 0 },
    });
  });

  test("non word default", () => {
    const text = "     MOVEQ #1,d0";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "MOVEQ",
        size: SIZE_L,
        n: 1,
        args: [
          { value: "#1", type: ArgType.Immediate },
          { value: "d0", type: ArgType.DirectData },
        ],
      },
      timings: { clock: 4, read: 1, write: 0 },
    });
  });

  test("no arg", () => {
    const text = "     RTS";
    expect(parseLine(text)).toEqual({
      text,
      op: {
        instruction: "RTS",
        size: SIZE_NA,
        args: [],
      },
      timings: { clock: 16, read: 4, write: 0 },
    });
  });

  test("only label", () => {
    const text = "l0:";
    expect(parseLine(text)).toEqual({
      text,
      label: "l0",
    });
  });

  test("only comment", () => {
    const text = "; Comment";
    expect(parseLine(text)).toEqual({
      text,
    });
  });

  test("only space", () => {
    const text = "\t";
    expect(parseLine(text)).toEqual({
      text,
    });
  });

  test("empty", () => {
    const text = "";
    expect(parseLine(text)).toEqual({
      text,
    });
  });

  test("assignment", () => {
    const text = "FOO EQU $1";
    expect(parseLine(text)).toEqual({
      text,
    });
  });
});

describe("splitParams()", () => {
  test("split simple", () => {
    expect(splitParams("foo,bar")).toEqual(["foo", "bar"]);
  });

  test("first with parens", () => {
    expect(splitParams("1(a0,d0),bar")).toEqual(["1(a0,d0)", "bar"]);
  });

  test("second with parens", () => {
    expect(splitParams("foo,1(a0,d0)")).toEqual(["foo", "1(a0,d0)"]);
  });
});

describe("rangeN", () => {
  test("single range", () => {
    expect(rangeN("d0-d4")).toEqual(5);
  });

  test("multiple regs", () => {
    expect(rangeN("d0/d4/d6")).toEqual(3);
  });

  test("two ranges", () => {
    expect(rangeN("d0-d4/a0-a2")).toEqual(8);
  });

  test("mixed", () => {
    expect(rangeN("d0-d4/d6/a0-a2/a4")).toEqual(10);
  });

  test("combined range", () => {
    expect(rangeN("d0-a6")).toEqual(15);
  });
});

describe("parseImmediate", () => {
  test("decimal", () => {
    expect(evalImmediate("3")).toEqual(3);
  });

  test("hex", () => {
    expect(evalImmediate("$ff")).toEqual(255);
  });

  test("binary", () => {
    expect(evalImmediate("%110")).toEqual(6);
  });

  test("addition", () => {
    expect(evalImmediate("$2+%10+2")).toEqual(6);
  });

  test("power", () => {
    expect(evalImmediate("4^2")).toEqual(16);
  });

  test("parens", () => {
    expect(evalImmediate("(3+1)^2")).toEqual(16);
  });

  test("power", () => {
    expect(evalImmediate("x+y", { x: 1, y: 2 })).toEqual(3);
  });
});

describe("calcN", () => {
  test("from range", () => {
    expect(
      calcN([
        { type: ArgType.RegList, value: "d0-d4/d6/a0-a2/a4" },
        { type: ArgType.IndirectPre, value: "-(sp)" },
      ])
    ).toEqual(10);
  });

  test("to range", () => {
    expect(
      calcN([
        { type: ArgType.IndirectPost, value: "(sp)+" },
        { type: ArgType.RegList, value: "d0-d4/d6/a0-a2/a4" },
      ])
    ).toEqual(10);
  });

  test("from immediate", () => {
    expect(
      calcN([
        { type: ArgType.Immediate, value: "#3" },
        { type: ArgType.DirectData, value: "d0" },
      ])
    ).toEqual(3);
  });

  test("from immediate hex", () => {
    expect(
      calcN([
        { type: ArgType.Immediate, value: "#$ff" },
        { type: ArgType.DirectData, value: "d0" },
      ])
    ).toEqual(255);
  });

  test("from immediate binary", () => {
    expect(
      calcN([
        { type: ArgType.Immediate, value: "#%110" },
        { type: ArgType.DirectData, value: "d0" },
      ])
    ).toEqual(6);
  });

  test("to immediate", () => {
    expect(
      calcN([
        { type: ArgType.DirectData, value: "d0" },
        { type: ArgType.Immediate, value: "#3" },
      ])
    ).toEqual(3);
  });
});
