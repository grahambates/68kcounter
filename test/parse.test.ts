import fs from "fs";
import parse, {
  evalImmediate,
  lookupAddressingMode,
  rangeN,
} from "../src/parse";
import { Mnemonics, AddressingModes, Sizes } from "../src/syntax";

describe("parse()", () => {
  test("parse file", () => {
    const file = fs.readFileSync(__dirname + "/examples/example.s").toString();
    const result = parse(file);
    expect(result).toHaveLength(843);
  });

  describe("instruction parsing", () => {
    test("two operands", () => {
      const [result] = parse("  move.w d0,(a0) ; foo");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("single operand", () => {
      const [result] = parse("  ext.w d0");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.EXT);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("unary", () => {
      const [result] = parse("  rts");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.RTS);
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("complex expression", () => {
      const [result] = parse(
        "foo:   move.w      #(CopperE-Copper)/4-1,d0;foo bar baz"
      );
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Imm
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("with comment", () => {
      const [result] = parse("   move.w     d0,(a0);foo bar baz");
      expect(result.comment.text).toEqual(";foo bar baz");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("with comment - alt", () => {
      const [result] = parse("   move.w     d0,(a0) *foo bar baz");
      expect(result.comment.text).toEqual("*foo bar baz");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("with label", () => {
      const [result] = parse("foo:   move.w     d0,(a0)");
      expect(result.label.text).toEqual("foo:");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("with label - local", () => {
      const [result] = parse(".foo:   move.w     d0,(a0)");
      expect(result.label.text).toEqual(".foo:");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("with label - no colon", () => {
      const [result] = parse("foo   move.w     d0,(a0)");
      expect(result.label.text).toEqual("foo");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("default size", () => {
      const [result] = parse("  MOVE D0,(A0)");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size).toBeFalsy();
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("case insensitive", () => {
      const [result] = parse("  MOVE.W D0,(A0)");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });

    test("space in parentheses", () => {
      const [result] = parse("  move.w d0,(  a0 )");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.size.value).toEqual(Sizes.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.words).toBeTruthy();
    });
  });

  describe("no instruction", () => {
    test("empty line", () => {
      const [result] = parse("");
      expect(result.comment).toBeFalsy();
      expect(result.label).toBeFalsy();
      expect(result.instruction).toBeFalsy();
    });

    test("only whitespace", () => {
      const [result] = parse("       ");
      expect(result.comment).toBeFalsy();
      expect(result.label).toBeFalsy();
      expect(result.instruction).toBeFalsy();
    });

    test("only comment", () => {
      const [result] = parse("; foo bar baz");
      expect(result.comment.text).toEqual("; foo bar baz");
      expect(result.instruction).toBeFalsy();
    });

    test("only comment - alt", () => {
      const [result] = parse("* foo bar baz");
      expect(result.comment.text).toEqual("* foo bar baz");
      expect(result.instruction).toBeFalsy();
    });

    test("only label", () => {
      const [result] = parse("foo:");
      expect(result.label.text).toEqual("foo:");
      expect(result.instruction).toBeFalsy();
    });

    test("only label - local", () => {
      const [result] = parse(".foo:");
      expect(result.label.text).toEqual(".foo:");
      expect(result.instruction).toBeFalsy();
    });

    test("only label - no colon", () => {
      const [result] = parse("foo");
      expect(result.label.text).toEqual("foo");
      expect(result.instruction).toBeFalsy();
    });
  });

  describe("timings", () => {
    test("move", () => {
      const [result] = parse(" move.w d0,d1");
      expect(result.timings).toEqual([[4, 1, 0]]);
    });

    test("EA source", () => {
      const [result] = parse(" add.w (a0),d1");
      expect(result.timings).toEqual([[8, 2, 0]]);
    });

    test("EA dest", () => {
      const [result] = parse(" add.w d1,(a0)");
      expect(result.timings).toEqual([[12, 2, 1]]);
    });

    test("movem n multiplier - source", () => {
      const [result] = parse(" movem.l d0-a6,-(sp)");
      const n = 15;
      expect(result.timings).toEqual([[8 + 8 * n, 2, 2 * n]]);
    });

    test("movem n multiplier - dest", () => {
      const [result] = parse(" movem.l DrawBuffer(PC),a2-a3");
      const n = 2;
      expect(result.timings).toEqual([[16 + 8 * n, 4 + 2 * n, 0]]);
    });

    test("shift n multiplier", () => {
      const [result] = parse(" lsl.w #4,d0");
      const n = 4;
      expect(result.timings).toEqual([[6 + 2 * n, 1, 0]]);
    });

    test("shift n multiplier", () => {
      const [result] = parse(" lsl.w #unresolved,d0");
      const n = 8;
      expect(result.timings).toEqual([[6 + 2 * n, 1, 0]]);
    });

    test("shift n multiplier - single", () => {
      const [result] = parse(" lsl.w d0");
      const n = 1;
      expect(result.timings).toEqual([[6 + 2 * n, 1, 0]]);
    });

    test("shift n multiplier - register", () => {
      const [result] = parse(" lsl.w d0,d1");
      const n = 63;
      expect(result.timings).toEqual([[6 + 2 * n, 1, 0]]);
    });

    test("btst register -> immediate", () => {
      const [result] = parse(" btst.b d0,#1");
      expect(result.timings).toEqual([[10, 2, 0]]);
    });

    test("nop", () => {
      const [result] = parse(" nop");
      expect(result.timings).toEqual([[4, 1, 0]]);
    });
  });

  describe("word sizes", () => {
    test("immediate W", () => {
      const [result] = parse(" add.w #1,d0");
      expect(result.words).toEqual(2);
    });

    test("immediate L", () => {
      const [result] = parse(" add.l #1,d0");
      expect(result.words).toEqual(3);
    });

    test("immediate quick", () => {
      const [result] = parse(" addq #1,d0");
      expect(result.words).toEqual(1);
    });

    test("abs.w", () => {
      const [result] = parse(" add.l d0,$f00.w");
      expect(result.words).toEqual(2);
    });

    test("abs.l", () => {
      const [result] = parse(" add.l d0,$f00");
      expect(result.words).toEqual(3);
    });

    test("bit operation", () => {
      const [result] = parse(" bchg #1,d0");
      expect(result.words).toEqual(2);
    });

    test("Bcc short", () => {
      const [result] = parse(" bra.s #foo");
      expect(result.words).toEqual(1);
    });

    test("Bcc word", () => {
      const [result] = parse(" bra.w #foo");
      expect(result.words).toEqual(2);
    });

    test("movem", () => {
      const [result] = parse(" movem.w d0-d6,-(sp)");
      expect(result.words).toEqual(2);
    });

    test("nop", () => {
      const [result] = parse(" nop");
      expect(result.words).toEqual(1);
    });
  });
});

describe("lookupArgType", () => {
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
