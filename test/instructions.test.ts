import {
  isInstruction,
  isInstructionSize,
  parseInstructionText,
  Size,
} from "../src/instructions";

describe("parseInstructionText()", () => {
  test("exact with size", () => {
    expect(parseInstructionText("MOVE.L")).toEqual({
      instruction: "MOVE",
      size: Size.L,
    });
  });

  test("lowercase", () => {
    expect(parseInstructionText("move.l")).toEqual({
      instruction: "MOVE",
      size: Size.L,
    });
  });

  test("default size W", () => {
    expect(parseInstructionText("MOVE")).toEqual({
      instruction: "MOVE",
      size: Size.W,
    });
  });

  test("default size L", () => {
    expect(parseInstructionText("MOVEQ")).toEqual({
      instruction: "MOVEQ",
      size: Size.L,
    });
  });

  test("default size B", () => {
    expect(parseInstructionText("BTST")).toEqual({
      instruction: "BTST",
      size: Size.B,
    });
  });

  test("aliased", () => {
    expect(parseInstructionText("ADDI.W")).toEqual({
      instruction: "ADD",
      size: Size.W,
    });
  });

  test("invalid", () => {
    expect(parseInstructionText("FOO")).toBeNull();
  });
});

describe("isInstruction()", () => {
  test("valid", () => {
    expect(isInstruction("MOVE")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isInstruction("FOO")).toBeFalsy();
  });
});

describe("isInstructionSize()", () => {
  test("valid", () => {
    expect(isInstructionSize("B")).toBeTruthy();
    expect(isInstructionSize("W")).toBeTruthy();
    expect(isInstructionSize("L")).toBeTruthy();
    expect(isInstructionSize("NA")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isInstruction("X")).toBeFalsy();
  });
});
