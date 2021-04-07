import { applyN, lookupTiming } from "../src/timings";
import { OperandType } from "../src/operands";
import { Statement } from "../src";
import { Size } from "../src/instructions";

describe("lookupTiming", () => {
  test("move.w d0,d1", () => {
    const stmt: Statement = {
      instruction: "MOVE",
      size: Size.W,
      source: { text: "d0", type: OperandType.DirectData },
      dest: { text: "d1", type: OperandType.DirectData },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 4, read: 1, write: 0 });
  });

  test("add.w (a0),d1", () => {
    const stmt: Statement = {
      instruction: "ADD",
      size: Size.W,
      source: { text: "(a0)", type: OperandType.Indirect },
      dest: { text: "d1", type: OperandType.DirectData },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 8, read: 2, write: 0 });
  });

  test("bsr.w foo", () => {
    const stmt: Statement = {
      instruction: "BSR",
      size: Size.W,
      dest: { text: "foo", type: OperandType.AbsoluteL },
    };
    expect(lookupTiming(stmt)).toEqual({ clock: 18, read: 2, write: 2 });
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
