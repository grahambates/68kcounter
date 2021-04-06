import { lookupArgType, ArgType } from "../src/args";

describe("lookupArgType", () => {
  test("direct data", () => {
    expect(lookupArgType("d0")).toEqual(ArgType.DirectData);
    expect(lookupArgType("d7")).toEqual(ArgType.DirectData);
  });

  test("direct address", () => {
    expect(lookupArgType("a0")).toEqual(ArgType.DirectAddr);
    expect(lookupArgType("a7")).toEqual(ArgType.DirectAddr);
    expect(lookupArgType("sr")).toEqual(ArgType.DirectAddr);
  });

  test("indirect", () => {
    expect(lookupArgType("(a0)")).toEqual(ArgType.Indirect);
    expect(lookupArgType("(a7)")).toEqual(ArgType.Indirect);
    expect(lookupArgType("(sr)")).toEqual(ArgType.Indirect);
  });

  test("indirect post increment", () => {
    expect(lookupArgType("(a0)+")).toEqual(ArgType.IndirectPost);
    expect(lookupArgType("(a7)+")).toEqual(ArgType.IndirectPost);
    expect(lookupArgType("(sr)+")).toEqual(ArgType.IndirectPost);
  });

  test("indirect pre decrement", () => {
    expect(lookupArgType("-(a0)")).toEqual(ArgType.IndirectPre);
    expect(lookupArgType("-(a7)")).toEqual(ArgType.IndirectPre);
    expect(lookupArgType("-(sr)")).toEqual(ArgType.IndirectPre);
  });

  test("indirect displacement", () => {
    expect(lookupArgType("1(a0)")).toEqual(ArgType.IndirectDisp);
    expect(lookupArgType("example(a0)")).toEqual(ArgType.IndirectDisp);
  });

  test("indirect displacement - old", () => {
    expect(lookupArgType("(1,a0)")).toEqual(ArgType.IndirectDisp);
  });

  test("indirect displacement with index", () => {
    expect(lookupArgType("1(a0,d0)")).toEqual(ArgType.IndirectIx);
    expect(lookupArgType("(1,a0,d0)")).toEqual(ArgType.IndirectIx);
  });

  test("indirect displacement", () => {
    expect(lookupArgType("1(pc)")).toEqual(ArgType.IndirectPcDisp);
    expect(lookupArgType("(1,pc)")).toEqual(ArgType.IndirectPcDisp);
  });

  test("indirect displacement with index PC", () => {
    expect(lookupArgType("1(pc,d0)")).toEqual(ArgType.IndirectPcIx);
    expect(lookupArgType("(1,pc,d0)")).toEqual(ArgType.IndirectPcIx);
  });

  test("immediate", () => {
    expect(lookupArgType("#123")).toEqual(ArgType.Immediate);
    expect(lookupArgType("#$12a")).toEqual(ArgType.Immediate);
    expect(lookupArgType("#%01010")).toEqual(ArgType.Immediate);
  });

  test("immediate symbol", () => {
    expect(lookupArgType("#foo")).toEqual(ArgType.Immediate);
  });

  test("register list (movem)", () => {
    expect(lookupArgType("a0-a4")).toEqual(ArgType.RegList);
    expect(lookupArgType("a0/d0")).toEqual(ArgType.RegList);
    expect(lookupArgType("a0-a4/a6/d0-d3/d5/d7")).toEqual(ArgType.RegList);
  });

  test("absolute word", () => {
    expect(lookupArgType("foo.w")).toEqual(ArgType.AbsoluteW);
    expect(lookupArgType("$12a.w")).toEqual(ArgType.AbsoluteW);
  });

  test("absolute long", () => {
    expect(lookupArgType("foo.l")).toEqual(ArgType.AbsoluteL);
    expect(lookupArgType("$12a.l")).toEqual(ArgType.AbsoluteL);
  });

  test("absolute long default", () => {
    expect(lookupArgType("foo")).toEqual(ArgType.AbsoluteL);
    expect(lookupArgType("$12a")).toEqual(ArgType.AbsoluteL);
  });

  test("case insensitive", () => {
    expect(lookupArgType("D0")).toEqual(ArgType.DirectData);
  });
});
