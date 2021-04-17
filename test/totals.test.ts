import { Line } from "../src/parse";
import { calculateTotals } from "../src/totals";

describe("calculateTotals", () => {
  test("single timings", () => {
    const lines: Line[] = [
      { text: "", timings: [[4, 2, 1]], words: 2 },
      { text: "", timings: [[8, 1, 0]], words: 1 },
      { text: "" },
      { text: "", timings: [[12, 0, 1]], words: 2 },
    ];
    const result = calculateTotals(lines);
    expect(result.isRange).toEqual(false);
    expect(result.min).toEqual([24, 3, 2]);
    expect(result.max).toEqual([24, 3, 2]);
    expect(result.words).toEqual(5);
  });

  test("range", () => {
    const lines: Line[] = [
      {
        text: "",
        timings: [
          [4, 2, 1],
          [6, 2, 1],
        ],
        words: 2,
      },
      { text: "", timings: [[8, 1, 0]], words: 1 },
      { text: "" },
      { text: "", timings: [[12, 0, 1]], words: 2 },
    ];
    const result = calculateTotals(lines);
    expect(result.isRange).toEqual(true);
    expect(result.min).toEqual([24, 3, 2]);
    expect(result.max).toEqual([26, 3, 2]);
    expect(result.words).toEqual(5);
  });
});
