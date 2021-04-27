#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chalk, { Color } from "chalk";
import { argv } from "process";
import parse, {
  calculateTotals,
  formatTiming,
  Level,
  Levels,
  timingLevel,
} from ".";
import { Timing } from "./timings";

const levelToColor: Record<Level, typeof Color> = {
  [Levels.VHigh]: "bgRed",
  [Levels.High]: "red",
  [Levels.Med]: "yellow",
  [Levels.Low]: "green",
};

if (!argv[2]) {
  console.error("Specify a filename");
  process.exit(1);
}

const filePath = path.resolve(argv[2]);
if (!fs.statSync(filePath)) {
  console.error(`File "${argv[2]}" not found`);
  process.exit(1);
}

const file = fs.readFileSync(filePath).toString();

const lines = parse(file);
lines.forEach((l) => {
  let annotation = "";
  if (l.timings) {
    annotation += l.timings.map(formatTimingColored).join(" / ");
  }
  if (l.bytes) {
    annotation += " " + l.bytes;
  }
  console.log(pad(annotation, 30) + " | " + l.statement.text);
});

const totals = calculateTotals(lines);
console.log("\nTotals:");
if (totals.isRange) {
  console.log(formatTiming(totals.min) + " - " + formatTiming(totals.max));
} else {
  console.log(formatTiming(totals.min));
}
console.log(totals.bytes + " bytes");

function formatTimingColored(timing: Timing) {
  const output = formatTiming(timing);
  const level = timingLevel(timing);
  return chalk[levelToColor[level]](output);
}

/**
 * Display a string with padding
 */
function pad(str: string, l: number) {
  /*eslint-disable no-control-regex */
  const strClean = str.replace(/(\x9B|\x1B\[)[0-?]*[ -/]*[@-~]/g, "");
  const p = strClean ? l - strClean.length : l;
  return Array(p).fill(" ").join("") + str;
}
