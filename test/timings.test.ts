import { formatTiming } from "../src/timings";

describe("formatTiming", () => {
  test("formats a timing", () => {
    const result = formatTiming([4, 2, 1]);
    expect(result).toBe("4(2/1)");
  });
});
