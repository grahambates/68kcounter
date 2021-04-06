import { applyN, lookupTiming } from "../src/timings";
import { ArgType } from "../src/args";
import { Op } from "../src";

describe("lookupTiming", () => {
  test("move.w d0,d1", () => {
    const op: Op = {
      instruction: "MOVE",
      size: "W",
      args: [
        { value: "d0", type: ArgType.DirectData },
        { value: "d1", type: ArgType.DirectData },
      ],
    };
    expect(lookupTiming(op)).toEqual({ clock: 4, read: 1, write: 0 });
  });

  test("add.w (a0),d1", () => {
    const op: Op = {
      instruction: "ADD",
      size: "W",
      args: [
        { value: "(a0)", type: ArgType.Indirect },
        { value: "d1", type: ArgType.DirectData },
      ],
    };
    expect(lookupTiming(op)).toEqual({ clock: 8, read: 2, write: 0 });
  });

  test("bsr.w foo", () => {
    const op: Op = {
      instruction: "BSR",
      size: "W",
      args: [{ value: "foo", type: ArgType.AbsoluteL }],
    };
    expect(lookupTiming(op)).toEqual({ clock: 18, read: 2, write: 2 });
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
