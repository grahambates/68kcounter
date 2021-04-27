import parse from "../../src/parse";

describe("instructionSize", () => {
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
});
