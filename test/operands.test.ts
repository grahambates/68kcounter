import {
  evalImmediate,
  lookupOperandType,
  Operands,
  OperandType,
  parseOperandsText,
  rangeN,
  splitOperands,
} from "../src/operands";

describe("parseOperandsText", () => {
  test("source and dest", () => {
    const expected: Operands = {
      source: { type: OperandType.DirectData, text: "d0" },
      dest: { type: OperandType.DirectData, text: "d1" },
    };
    expect(parseOperandsText("d0,d1")).toEqual(expected);
  });

  test("dest only", () => {
    const expected: Operands = {
      dest: { type: OperandType.DirectData, text: "d1" },
    };
    expect(parseOperandsText("d1")).toEqual(expected);
  });

  test("with immediate value", () => {
    const expected: Operands = {
      source: { type: OperandType.Immediate, text: "#1", value: 1 },
      dest: { type: OperandType.DirectData, text: "d1" },
    };
    expect(parseOperandsText("#1,d1")).toEqual(expected);
  });

  test("with range value", () => {
    const expected: Operands = {
      source: { type: OperandType.RegList, text: "d0-d6", value: 7 },
      dest: { type: OperandType.IndirectPre, text: "-(sr)" },
    };
    expect(parseOperandsText("d0-d6,-(sr)")).toEqual(expected);
  });
});

describe("lookupArgType", () => {
  test("direct data", () => {
    expect(lookupOperandType("d0")).toEqual(OperandType.DirectData);
    expect(lookupOperandType("d7")).toEqual(OperandType.DirectData);
  });

  test("direct address", () => {
    expect(lookupOperandType("a0")).toEqual(OperandType.DirectAddr);
    expect(lookupOperandType("a7")).toEqual(OperandType.DirectAddr);
    expect(lookupOperandType("sr")).toEqual(OperandType.DirectAddr);
  });

  test("indirect", () => {
    expect(lookupOperandType("(a0)")).toEqual(OperandType.Indirect);
    expect(lookupOperandType("(a7)")).toEqual(OperandType.Indirect);
    expect(lookupOperandType("(sr)")).toEqual(OperandType.Indirect);
  });

  test("indirect post increment", () => {
    expect(lookupOperandType("(a0)+")).toEqual(OperandType.IndirectPost);
    expect(lookupOperandType("(a7)+")).toEqual(OperandType.IndirectPost);
    expect(lookupOperandType("(sr)+")).toEqual(OperandType.IndirectPost);
  });

  test("indirect pre decrement", () => {
    expect(lookupOperandType("-(a0)")).toEqual(OperandType.IndirectPre);
    expect(lookupOperandType("-(a7)")).toEqual(OperandType.IndirectPre);
    expect(lookupOperandType("-(sr)")).toEqual(OperandType.IndirectPre);
  });

  test("indirect displacement", () => {
    expect(lookupOperandType("1(a0)")).toEqual(OperandType.IndirectDisp);
    expect(lookupOperandType("example(a0)")).toEqual(OperandType.IndirectDisp);
  });

  test("indirect displacement - old", () => {
    expect(lookupOperandType("(1,a0)")).toEqual(OperandType.IndirectDisp);
  });

  test("indirect displacement with index", () => {
    expect(lookupOperandType("1(a0,d0)")).toEqual(OperandType.IndirectIx);
    expect(lookupOperandType("(1,a0,d0)")).toEqual(OperandType.IndirectIx);
  });

  test("indirect displacement", () => {
    expect(lookupOperandType("1(pc)")).toEqual(OperandType.IndirectPcDisp);
    expect(lookupOperandType("(1,pc)")).toEqual(OperandType.IndirectPcDisp);
  });

  test("indirect displacement with index PC", () => {
    expect(lookupOperandType("1(pc,d0)")).toEqual(OperandType.IndirectPcIx);
    expect(lookupOperandType("(1,pc,d0)")).toEqual(OperandType.IndirectPcIx);
  });

  test("immediate", () => {
    expect(lookupOperandType("#123")).toEqual(OperandType.Immediate);
    expect(lookupOperandType("#$12a")).toEqual(OperandType.Immediate);
    expect(lookupOperandType("#%01010")).toEqual(OperandType.Immediate);
  });

  test("immediate symbol", () => {
    expect(lookupOperandType("#foo")).toEqual(OperandType.Immediate);
  });

  test("register list (movem)", () => {
    expect(lookupOperandType("a0-a4")).toEqual(OperandType.RegList);
    expect(lookupOperandType("a0/d0")).toEqual(OperandType.RegList);
    expect(lookupOperandType("a0-a4/a6/d0-d3/d5/d7")).toEqual(
      OperandType.RegList
    );
  });

  test("absolute word", () => {
    expect(lookupOperandType("foo.w")).toEqual(OperandType.AbsoluteW);
    expect(lookupOperandType("$12a.w")).toEqual(OperandType.AbsoluteW);
  });

  test("absolute long", () => {
    expect(lookupOperandType("foo.l")).toEqual(OperandType.AbsoluteL);
    expect(lookupOperandType("$12a.l")).toEqual(OperandType.AbsoluteL);
  });

  test("absolute long default", () => {
    expect(lookupOperandType("foo")).toEqual(OperandType.AbsoluteL);
    expect(lookupOperandType("$12a")).toEqual(OperandType.AbsoluteL);
  });

  test("case insensitive", () => {
    expect(lookupOperandType("D0")).toEqual(OperandType.DirectData);
  });
});

describe("splitParams()", () => {
  test("split simple", () => {
    expect(splitOperands("foo,bar")).toEqual(["foo", "bar"]);
  });

  test("first with parens", () => {
    expect(splitOperands("1(a0,d0),bar")).toEqual(["1(a0,d0)", "bar"]);
  });

  test("second with parens", () => {
    expect(splitOperands("foo,1(a0,d0)")).toEqual(["foo", "1(a0,d0)"]);
  });
});

describe("rangeCount", () => {
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
