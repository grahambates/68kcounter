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
      source: { type: OperandType.Dn, text: "d0" },
      dest: { type: OperandType.Dn, text: "d1" },
    };
    expect(parseOperandsText("d0,d1")).toEqual(expected);
  });

  test("dest only", () => {
    const expected: Operands = {
      dest: { type: OperandType.Dn, text: "d1" },
    };
    expect(parseOperandsText("d1")).toEqual(expected);
  });

  test("with immediate value", () => {
    const expected: Operands = {
      source: { type: OperandType.Imm, text: "#1", value: 1 },
      dest: { type: OperandType.Dn, text: "d1" },
    };
    expect(parseOperandsText("#1,d1")).toEqual(expected);
  });

  test("with range value", () => {
    const expected: Operands = {
      source: { type: OperandType.RegList, text: "d0-d6", value: 7 },
      dest: { type: OperandType.AnPreDec, text: "-(sp)" },
    };
    expect(parseOperandsText("d0-d6,-(sp)")).toEqual(expected);
  });
});

describe("lookupArgType", () => {
  test("direct data", () => {
    expect(lookupOperandType("d0")).toEqual(OperandType.Dn);
    expect(lookupOperandType("d7")).toEqual(OperandType.Dn);
  });

  test("direct address", () => {
    expect(lookupOperandType("a0")).toEqual(OperandType.An);
    expect(lookupOperandType("a7")).toEqual(OperandType.An);
    expect(lookupOperandType("sp")).toEqual(OperandType.An);
  });

  test("indirect", () => {
    expect(lookupOperandType("(a0)")).toEqual(OperandType.AnIndir);
    expect(lookupOperandType("(  a0  )")).toEqual(OperandType.AnIndir);
    expect(lookupOperandType("(a7)")).toEqual(OperandType.AnIndir);
    expect(lookupOperandType("(sp)")).toEqual(OperandType.AnIndir);
  });

  test("indirect post increment", () => {
    expect(lookupOperandType("(a0)+")).toEqual(OperandType.AnPostInc);
    expect(lookupOperandType("(  a0  )+")).toEqual(OperandType.AnPostInc);
    expect(lookupOperandType("(a7)+")).toEqual(OperandType.AnPostInc);
    expect(lookupOperandType("(sp)+")).toEqual(OperandType.AnPostInc);
  });

  test("indirect pre decrement", () => {
    expect(lookupOperandType("-(a0)")).toEqual(OperandType.AnPreDec);
    expect(lookupOperandType("-(  a0  )")).toEqual(OperandType.AnPreDec);
    expect(lookupOperandType("-(a7)")).toEqual(OperandType.AnPreDec);
    expect(lookupOperandType("-(sp)")).toEqual(OperandType.AnPreDec);
  });

  test("indirect displacement", () => {
    expect(lookupOperandType("1(a0)")).toEqual(OperandType.AnDisp);
    expect(lookupOperandType("example(a0)")).toEqual(OperandType.AnDisp);
  });

  test("indirect displacement - old", () => {
    expect(lookupOperandType("(1,a0)")).toEqual(OperandType.AnDisp);
    expect(lookupOperandType("(  1,a0  )")).toEqual(OperandType.AnDisp);
  });

  test("indirect displacement with index", () => {
    // Dn index
    expect(lookupOperandType("1(a0,d0)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(a0,d0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(a0,d0.l)")).toEqual(OperandType.AnDispIx);
    // An index
    expect(lookupOperandType("1(a0,a0)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(a0,a0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(a0,a0.l)")).toEqual(OperandType.AnDispIx);

    // sp
    expect(lookupOperandType("1(sp,sp)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(sp,sp.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("1(sp,sp.l)")).toEqual(OperandType.AnDispIx);

    // old style
    expect(lookupOperandType("(1,a0,d0)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(1,a0,d0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(1,a0,a0)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(1,a0,a0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(1,sp,sp)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(1,sp,sp.w)")).toEqual(OperandType.AnDispIx);

    // no displacement
    expect(lookupOperandType("(a0,d0)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(a0,d0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(a0,a0.w)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(sp,sp)")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(sp,sp.w)")).toEqual(OperandType.AnDispIx);

    // whitespace
    expect(lookupOperandType("1( a0,d0 )")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("(  1,a0,d0  )")).toEqual(OperandType.AnDispIx);
    expect(lookupOperandType("( a2,a5.w)")).toEqual(OperandType.AnDispIx);
  });

  test("indirect displacement", () => {
    expect(lookupOperandType("1(pc)")).toEqual(OperandType.PcDisp);
    expect(lookupOperandType("(1,pc)")).toEqual(OperandType.PcDisp);
    expect(lookupOperandType("(  1,pc  )")).toEqual(OperandType.PcDisp);
  });

  test("indirect displacement with index PC", () => {
    expect(lookupOperandType("1(pc,d0)")).toEqual(OperandType.PcDispIx);
    expect(lookupOperandType("1(  pc,d0  )")).toEqual(OperandType.PcDispIx);
    expect(lookupOperandType("(  1,pc,d0  )")).toEqual(OperandType.PcDispIx);
  });

  test("immediate", () => {
    expect(lookupOperandType("#123")).toEqual(OperandType.Imm);
    expect(lookupOperandType("#$12a")).toEqual(OperandType.Imm);
    expect(lookupOperandType("#%01010")).toEqual(OperandType.Imm);
  });

  test("immediate symbol", () => {
    expect(lookupOperandType("#foo")).toEqual(OperandType.Imm);
  });

  test("register list (movem)", () => {
    expect(lookupOperandType("a0-a4")).toEqual(OperandType.RegList);
    expect(lookupOperandType("a0/d0")).toEqual(OperandType.RegList);
    expect(lookupOperandType("a0-a4/a6/d0-d3/d5/d7")).toEqual(
      OperandType.RegList
    );
  });

  test("absolute word", () => {
    expect(lookupOperandType("foo.w")).toEqual(OperandType.AbsW);
    expect(lookupOperandType("$12a.w")).toEqual(OperandType.AbsW);
  });

  test("absolute long", () => {
    expect(lookupOperandType("foo.l")).toEqual(OperandType.AbsL);
    expect(lookupOperandType("$12a.l")).toEqual(OperandType.AbsL);
  });

  test("absolute long default", () => {
    expect(lookupOperandType("foo")).toEqual(OperandType.AbsL);
    expect(lookupOperandType("$12a")).toEqual(OperandType.AbsL);
  });

  test("case insensitive", () => {
    expect(lookupOperandType("D0")).toEqual(OperandType.Dn);
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
