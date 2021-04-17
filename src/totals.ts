import { Line } from "./parse";
import { Timing } from "./timings";

export interface Totals {
  /**
   * Does this show a range of values based on whether branches are followed or not?
   * i.e. are max and min different?
   */
  isRange: boolean;
  /** Maximum total times */
  max: Timing;
  /** Minimum total times */
  min: Timing;
  /** Total word length */
  words: number;
}

/**
 * Total timings and lengths across a range of lines
 */
export function calculateTotals(lines: Line[]): Totals {
  let words = 0;
  const min: Timing = [0, 0, 0];
  const max: Timing = [0, 0, 0];

  for (const line of lines) {
    if (line.words) {
      words += line.words;
    }
    const timings = line.timings;
    if (!timings) {
      continue;
    }

    const clocks = timings.map((n) => n[0]);
    const reads = timings.map((n) => n[1]);
    const writes = timings.map((n) => n[2]);
    min[0] += Math.min(...clocks);
    min[1] += Math.min(...reads);
    min[2] += Math.min(...writes);
    max[0] += Math.max(...clocks);
    max[1] += Math.max(...reads);
    max[2] += Math.max(...writes);
  }

  const isRange = min[0] !== max[0] || min[1] !== max[1] || min[2] !== max[2];

  return { min, max, isRange, words };
}
