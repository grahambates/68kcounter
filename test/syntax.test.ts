import { isMnemonic, isSize } from "../src/syntax";

describe("isMnemonic()", () => {
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
  });
  test("invalid", () => {
    expect(isMnemonic("X")).toBeFalsy();
  });
});
