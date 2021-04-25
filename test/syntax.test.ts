import { isMnemonic, isQualifier } from "../src/syntax";

describe("isMnemonic()", () => {
  test("valid", () => {
    expect(isMnemonic("MOVE")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isMnemonic("FOO")).toBeFalsy();
  });
});

describe("isQualifier()", () => {
  test("valid", () => {
    expect(isQualifier("B")).toBeTruthy();
    expect(isQualifier("W")).toBeTruthy();
    expect(isQualifier("L")).toBeTruthy();
  });
  test("invalid", () => {
    expect(isMnemonic("X")).toBeFalsy();
  });
});
