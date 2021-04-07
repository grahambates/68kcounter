import { applyN, lookupTiming } from "../src/timings";
import { OperandType } from "../src/operands";
import { Instruction } from "../src";
import { Size } from "../src/mnemonics";

describe("lookupTiming", () => {
  test("move.w d0,d1", () => {
    const stmt: Instruction = {
      mnemonic: "MOVE",
      size: Size.W,
      source: { text: "d0", type: OperandType.Dn },
      dest: { text: "d1", type: OperandType.Dn },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 4, read: 1, write: 0 });
  });

  test("add.w (a0),d1", () => {
    const stmt: Instruction = {
      mnemonic: "ADD",
      size: Size.W,
      source: { text: "(a0)", type: OperandType.AnIndir },
      dest: { text: "d1", type: OperandType.Dn },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 8, read: 2, write: 0 });
  });

  test("bsr.w foo", () => {
    const stmt: Instruction = {
      mnemonic: "BSR",
      size: Size.W,
      dest: { text: "foo", type: OperandType.AbsL },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 18, read: 2, write: 2 });
  });

  test("movem.l d0-a6,-(sp)", () => {
    const n = 15;
    const stmt: Instruction = {
      mnemonic: "MOVEM",
      size: Size.L,
      source: { text: "d0-a6", type: OperandType.RegList, value: n },
      dest: { text: "-(sp)", type: OperandType.AnPreDec },
    };
    // 8+8n(2/2n)
    expect(lookupTiming(stmt)).toEqual({
      clock: 8 + 8 * n,
      read: 2,
      write: 2 * n,
    });
  });

  test("lsl.w #4,d0", () => {
    const n = 4;
    const stmt: Instruction = {
      mnemonic: "LSL",
      size: Size.W,
      source: { text: "#4", type: OperandType.Imm, value: n },
      dest: { text: "d0", type: OperandType.Dn },
    };
    // 6+2n(1/0)
    expect(lookupTiming(stmt)).toEqual({
      clock: 6 + 2 * n,
      read: 1,
      write: 0,
    });
  });
});

describe("applyN", () => {
  test("nClock", () => {
    const timing = applyN({ clock: 1, read: 1, write: 1, nClock: 2 }, 3);
    expect(timing).toEqual({ clock: 1 + 2 * 3, read: 1, write: 1 });
  });

  test("nRead", () => {
    const timing = applyN({ clock: 1, read: 1, write: 1, nRead: 2 }, 3);
    expect(timing).toEqual({ clock: 1, read: 1 + 2 * 3, write: 1 });
  });

  test("nWrite", () => {
    const timing = applyN({ clock: 1, read: 1, write: 1, nWrite: 2 }, 3);
    expect(timing).toEqual({ clock: 1, read: 1, write: 1 + 2 * 3 });
  });

  test("multiple", () => {
    const timing = applyN(
      { clock: 1, read: 1, write: 1, nClock: 2, nRead: 3, nWrite: 4 },
      3
    );
    expect(timing).toEqual({
      clock: 1 + 2 * 3,
      read: 1 + 3 * 3,
      write: 1 + 4 * 3,
    });
  });

  test("unchanged", () => {
    const timing = applyN({ clock: 1, read: 1, write: 1 }, 3);
    expect(timing).toEqual({ clock: 1, read: 1, write: 1 });
  });
});
