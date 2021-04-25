import fs from "fs";
import parse, { evalImmediate } from "../src/parse";
import {
  Mnemonics,
  AddressingModes,
  Qualifiers,
  Directives,
} from "../src/syntax";

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
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("single operand", () => {
      const [result] = parse("  ext.w d0");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.EXT);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("unary", () => {
      const [result] = parse("  rts");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.RTS);
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("complex expression", () => {
      const [result] = parse(
        "foo:   move.w      #(CopperE-Copper)/4-1,d0;foo bar baz"
      );
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Imm
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("with comment", () => {
      const [result] = parse("   move.w     d0,(a0);foo bar baz");
      expect(result.comment.text).toEqual(";foo bar baz");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("with comment - alt", () => {
      const [result] = parse("   move.w     d0,(a0) *foo bar baz");
      expect(result.comment.text).toEqual("*foo bar baz");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("with label", () => {
      const [result] = parse("foo:   move.w     d0,(a0)");
      expect(result.label.text).toEqual("foo");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("with label - local", () => {
      const [result] = parse(".foo:   move.w     d0,(a0)");
      expect(result.label.text).toEqual(".foo");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("with label - no colon", () => {
      const [result] = parse("foo   move.w     d0,(a0)");
      expect(result.label.text).toEqual("foo");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("default qualifier", () => {
      const [result] = parse("  MOVE D0,(A0)");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier).toBeFalsy();
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("case insensitive", () => {
      const [result] = parse("  MOVE.W D0,(A0)");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });

    test("space in parentheses", () => {
      const [result] = parse("  move.w d0,(  a0 )");
      expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
      expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
      expect(result.instruction.operands[0].addressingMode).toEqual(
        AddressingModes.Dn
      );
      expect(result.instruction.operands[1].addressingMode).toEqual(
        AddressingModes.AnIndir
      );
      expect(result.timings).toBeTruthy();
      expect(result.bytes).toBeTruthy();
    });
  });

  test("label no space", () => {
    const [result] = parse("a:MOVE.W D0,(A0)");
    expect(result.label.text).toEqual("a");
    expect(result.instruction.mnemonic.value).toEqual(Mnemonics.MOVE);
    expect(result.instruction.qualifier.value).toEqual(Qualifiers.W);
    expect(result.instruction.operands[0].addressingMode).toEqual(
      AddressingModes.Dn
    );
    expect(result.instruction.operands[1].addressingMode).toEqual(
      AddressingModes.AnIndir
    );
    expect(result.timings).toBeTruthy();
    expect(result.bytes).toBeTruthy();
  });

  describe("directives", () => {
    test("assignment EQU", () => {
      const [result] = parse("foo EQU 1");
      expect(result.label.text).toEqual("foo");
      expect(result.directive.name.value).toEqual(Directives.EQU);
      expect(result.directive.args[0].text).toEqual("1");
    });

    test("assignment =", () => {
      const [result] = parse("foo = 1");
      expect(result.label.text).toEqual("foo");
      expect(result.directive.name.value).toEqual(Directives["="]);
      expect(result.directive.args[0].text).toEqual("1");
    });

    test("assignment =", () => {
      const [result] = parse("foo=1");
      expect(result.label.text).toEqual("foo");
      expect(result.directive.name.value).toEqual(Directives["="]);
      expect(result.directive.args[0].text).toEqual("1");
    });

    test("memory", () => {
      const [result] = parse("a: dc.w 1,2,3");
      expect(result.label.text).toEqual("a");
      expect(result.directive.name.value).toEqual(Directives.DC);
      expect(result.directive.args[0].text).toEqual("1");
      expect(result.directive.args[1].text).toEqual("2");
      expect(result.directive.args[2].text).toEqual("3");
    });
  });

  describe("parse assignments", () => {
    test("dynamic shift", () => {
      const code = `
foo=4
      lsl.w #foo,d0
      `;
      const lines = parse(code);
      const n = 4;
      expect(lines[2].timings).toEqual([[6 + 2 * n, 1, 0]]);
    });

    test("forward ref", () => {
      const code = `
      lsl.w #foo,d0
foo=4
      `;
      const lines = parse(code);
      const n = 4;
      expect(lines[1].timings).toEqual([[6 + 2 * n, 1, 0]]);
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
      expect(result.label.text).toEqual("foo");
      expect(result.instruction).toBeFalsy();
    });

    test("only label - local", () => {
      const [result] = parse(".foo:");
      expect(result.label.text).toEqual(".foo");
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

  describe("byte sizes", () => {
    test("immediate W", () => {
      const [result] = parse(" add.w #1,d0");
      expect(result.bytes).toEqual(4);
    });

    test("immediate L", () => {
      const [result] = parse(" add.l #1,d0");
      expect(result.bytes).toEqual(6);
    });

    test("immediate quick", () => {
      const [result] = parse(" addq #1,d0");
      expect(result.bytes).toEqual(2);
    });

    test("abs.w", () => {
      const [result] = parse(" add.l d0,$f00.w");
      expect(result.bytes).toEqual(4);
    });

    test("abs.l", () => {
      const [result] = parse(" add.l d0,$f00");
      expect(result.bytes).toEqual(6);
    });

    test("bit operation", () => {
      const [result] = parse(" bchg #1,d0");
      expect(result.bytes).toEqual(4);
    });

    test("Bcc short", () => {
      const [result] = parse(" bra.s #foo");
      expect(result.bytes).toEqual(2);
    });

    test("Bcc word", () => {
      const [result] = parse(" bra.w #foo");
      expect(result.bytes).toEqual(4);
    });

    test("movem", () => {
      const [result] = parse(" movem.w d0-d6,-(sp)");
      expect(result.bytes).toEqual(4);
    });

    test("nop", () => {
      const [result] = parse(" nop");
      expect(result.bytes).toEqual(2);
    });

    test("dc.w", () => {
      const [result] = parse(" dc.w 0,0,0");
      expect(result.bytes).toEqual(6);
    });

    test("dw", () => {
      const [result] = parse(" dw 0,0,0");
      expect(result.bytes).toEqual(6);
    });

    test("dc.x", () => {
      const [result] = parse(" dc.x 0,0,0");
      expect(result.bytes).toEqual(36);
    });

    test("dcb.w", () => {
      const [result] = parse(" dcb.w #3");
      expect(result.bytes).toEqual(6);
    });

    test("ds.w", () => {
      const [result] = parse(" ds.w #3");
      expect(result.bytes).toEqual(6);
    });

    test("dcb.w from vars", () => {
      const code = `
foo=2
  dcb.w #foo*2
`;
      const result = parse(code);
      expect(result[2].bytes).toEqual(8);
    });

    test("dc.b string", () => {
      const [result] = parse('.GfxLib:dc.b "graphics.library",0,0');
      expect(result.bytes).toEqual(18);
    });

    test("dcb.w from label range", () => {
      const code = `
start:
      dc.w 0
      dc.l 0
end:
      dcb.b end-start
`;
      const result = parse(code);
      expect(result[5].bytes).toEqual(6);
    });
  });
});

describe("parseImmediate", () => {
  test("decimal", () => {
    expect(evalImmediate("3")).toEqual(3);
  });

  test("hex", () => {
    expect(evalImmediate("$ff")).toEqual(255);
  });

  test("octal", () => {
    expect(evalImmediate("@10")).toEqual(8);
  });

  test("binary", () => {
    expect(evalImmediate("%110")).toEqual(6);
  });

  test("addition", () => {
    expect(evalImmediate("$2+%10+2")).toEqual(6);
  });

  test("parens", () => {
    expect(evalImmediate("(3+1)*2")).toEqual(8);
  });

  test("vars", () => {
    expect(evalImmediate("x+y", { x: 1, y: 2 })).toEqual(3);
  });

  test("xor", () => {
    expect(evalImmediate("12^8")).toEqual(4);
    expect(evalImmediate("12~8")).toEqual(4);
  });

  test("or", () => {
    expect(evalImmediate("2|4")).toEqual(6);
    expect(evalImmediate("2!4")).toEqual(6);
  });

  test("modulo", () => {
    expect(evalImmediate("11%4")).toEqual(3);
  });

  test("not", () => {
    expect(evalImmediate("~1")).toEqual(-2);
  });
});
