import { AddressingModes } from "../src/syntax";
import { lookupAddressingMode } from "../src/tokens";

describe("lookupAddressingMode", () => {
  test("direct data", () => {
    expect(lookupAddressingMode("d0")).toEqual(AddressingModes.Dn);
    expect(lookupAddressingMode("d7")).toEqual(AddressingModes.Dn);
  });

  test("direct address", () => {
    expect(lookupAddressingMode("a0")).toEqual(AddressingModes.An);
    expect(lookupAddressingMode("a7")).toEqual(AddressingModes.An);
    expect(lookupAddressingMode("sp")).toEqual(AddressingModes.An);
  });

  test("indirect", () => {
    expect(lookupAddressingMode("(a0)")).toEqual(AddressingModes.AnIndir);
    expect(lookupAddressingMode("(  a0  )")).toEqual(AddressingModes.AnIndir);
    expect(lookupAddressingMode("(a7)")).toEqual(AddressingModes.AnIndir);
    expect(lookupAddressingMode("(sp)")).toEqual(AddressingModes.AnIndir);
  });

  test("indirect post increment", () => {
    expect(lookupAddressingMode("(a0)+")).toEqual(AddressingModes.AnPostInc);
    expect(lookupAddressingMode("(  a0  )+")).toEqual(
      AddressingModes.AnPostInc
    );
    expect(lookupAddressingMode("(a7)+")).toEqual(AddressingModes.AnPostInc);
    expect(lookupAddressingMode("(sp)+")).toEqual(AddressingModes.AnPostInc);
  });

  test("indirect pre decrement", () => {
    expect(lookupAddressingMode("-(a0)")).toEqual(AddressingModes.AnPreDec);
    expect(lookupAddressingMode("-(  a0  )")).toEqual(AddressingModes.AnPreDec);
    expect(lookupAddressingMode("-(a7)")).toEqual(AddressingModes.AnPreDec);
    expect(lookupAddressingMode("-(sp)")).toEqual(AddressingModes.AnPreDec);
  });

  test("indirect displacement", () => {
    expect(lookupAddressingMode("1(a0)")).toEqual(AddressingModes.AnDisp);
    expect(lookupAddressingMode("example(a0)")).toEqual(AddressingModes.AnDisp);
  });

  test("indirect displacement - old", () => {
    expect(lookupAddressingMode("(1,a0)")).toEqual(AddressingModes.AnDisp);
    expect(lookupAddressingMode("(  1,a0  )")).toEqual(AddressingModes.AnDisp);
  });

  test("indirect displacement with index", () => {
    // Dn index
    expect(lookupAddressingMode("1(a0,d0)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("1(a0,d0.w)")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("1(a0,d0.l)")).toEqual(
      AddressingModes.AnDispIx
    );
    // An index
    expect(lookupAddressingMode("1(a0,a0)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("1(a0,a0.w)")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("1(a0,a0.l)")).toEqual(
      AddressingModes.AnDispIx
    );

    // sp
    expect(lookupAddressingMode("1(sp,sp)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("1(sp,sp.w)")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("1(sp,sp.l)")).toEqual(
      AddressingModes.AnDispIx
    );

    // old style
    expect(lookupAddressingMode("(1,a0,d0)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(1,a0,d0.w)")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("(1,a0,a0)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(1,a0,a0.w)")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("(1,sp,sp)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(1,sp,sp.w)")).toEqual(
      AddressingModes.AnDispIx
    );

    // no displacement
    expect(lookupAddressingMode("(a0,d0)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(a0,d0.w)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(a0,a0.w)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(sp,sp)")).toEqual(AddressingModes.AnDispIx);
    expect(lookupAddressingMode("(sp,sp.w)")).toEqual(AddressingModes.AnDispIx);

    // whitespace
    expect(lookupAddressingMode("1( a0,d0 )")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("(  1,a0,d0  )")).toEqual(
      AddressingModes.AnDispIx
    );
    expect(lookupAddressingMode("( a2,a5.w)")).toEqual(
      AddressingModes.AnDispIx
    );
  });

  test("indirect displacement", () => {
    expect(lookupAddressingMode("1(pc)")).toEqual(AddressingModes.PcDisp);
    expect(lookupAddressingMode("(1,pc)")).toEqual(AddressingModes.PcDisp);
    expect(lookupAddressingMode("(  1,pc  )")).toEqual(AddressingModes.PcDisp);
  });

  test("indirect displacement with index PC", () => {
    expect(lookupAddressingMode("1(pc,d0)")).toEqual(AddressingModes.PcDispIx);
    expect(lookupAddressingMode("1(  pc,d0  )")).toEqual(
      AddressingModes.PcDispIx
    );
    expect(lookupAddressingMode("(  1,pc,d0  )")).toEqual(
      AddressingModes.PcDispIx
    );
  });

  test("immediate", () => {
    expect(lookupAddressingMode("#123")).toEqual(AddressingModes.Imm);
    expect(lookupAddressingMode("#$12a")).toEqual(AddressingModes.Imm);
    expect(lookupAddressingMode("#%01010")).toEqual(AddressingModes.Imm);
  });

  test("immediate symbol", () => {
    expect(lookupAddressingMode("#foo")).toEqual(AddressingModes.Imm);
  });

  test("register list (movem)", () => {
    expect(lookupAddressingMode("a0-a4")).toEqual(AddressingModes.RegList);
    expect(lookupAddressingMode("a0/d0")).toEqual(AddressingModes.RegList);
    expect(lookupAddressingMode("a0-a4/a6/d0-d3/d5/d7")).toEqual(
      AddressingModes.RegList
    );
  });

  test("absolute word", () => {
    expect(lookupAddressingMode("foo.w")).toEqual(AddressingModes.AbsW);
    expect(lookupAddressingMode("$12a.w")).toEqual(AddressingModes.AbsW);
  });

  test("absolute long", () => {
    expect(lookupAddressingMode("foo.l")).toEqual(AddressingModes.AbsL);
    expect(lookupAddressingMode("$12a.l")).toEqual(AddressingModes.AbsL);
  });

  test("absolute long default", () => {
    expect(lookupAddressingMode("foo")).toEqual(AddressingModes.AbsL);
    expect(lookupAddressingMode("$12a")).toEqual(AddressingModes.AbsL);
  });

  test("case insensitive", () => {
    expect(lookupAddressingMode("D0")).toEqual(AddressingModes.Dn);
  });
});
