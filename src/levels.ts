import { Timing } from "./timings";

export type Level = "vhigh" | "high" | "med" | "low";

/**
 * Warning level timing/length display
 */
export const Levels = {
  VHigh: "vhigh",
  High: "high",
  Med: "med",
  Low: "low",
} as const;

/**
 * Get warning level for timing
 */
export function timingLevel(timing: Timing): Level {
  if (timing[0] > 30) {
    return Levels.VHigh;
  }
  if (timing[0] > 20) {
    return Levels.High;
  }
  if (timing[0] >= 12) {
    return Levels.Med;
  }
  return Levels.Low;
}

/**
 * Get warning level for word length
 */
export function lengthLevel(words: number): Level {
  if (words > 3) {
    return Levels.VHigh;
  }
  if (words > 2) {
    return Levels.High;
  }
  if (words === 2) {
    return Levels.Med;
  }
  return Levels.Low;
}
