import { isMnemonic, isSize, parseMnemonicText, Size } from "../src/mnemonics";

describe("parseInstructionText()", () => {
  test("exact with size", () => {
    expect(parseMnemonicText("MOVE.L")).toEqual({
      mnemonic: "MOVE",
      size: Size.L,
    });
  });

  test("lowercase", () => {
    expect(parseMnemonicText("move.l")).toEqual({
      mnemonic: "MOVE",
      size: Size.L,
    });
  });

  test("default size W", () => {
    expect(parseMnemonicText("MOVE")).toEqual({
      mnemonic: "MOVE",
      size: Size.W,
    });
  });

  test("default size L", () => {
    expect(parseMnemonicText("MOVEQ")).toEqual({
      mnemonic: "MOVEQ",
      size: Size.L,
    });
  });

  test("default size B", () => {
    expect(parseMnemonicText("BTST")).toEqual({
      mnemonic: "BTST",
      size: Size.B,
    });
  });

  test("aliased", () => {
    expect(parseMnemonicText("ADDI.W")).toEqual({
      mnemonic: "ADD",
      size: Size.W,
    });
  });

  test("invalid", () => {
    expect(parseMnemonicText("FOO")).toBeNull();
  });
});

describe("isInstruction()", () => {
  test("valid", () => {
    expect(isMnemonic("MOVE")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isMnemonic("FOO")).toBeFalsy();
  });
});

describe("isSize()", () => {
  test("valid", () => {
    expect(isSize("B")).toBeTruthy();
    expect(isSize("W")).toBeTruthy();
    expect(isSize("L")).toBeTruthy();
    expect(isSize("NA")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isMnemonic("X")).toBeFalsy();
  });
});
