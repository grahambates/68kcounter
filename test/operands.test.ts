import { lookupOperandType, OperandType } from "../src/operands";

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
