#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { argv } from "process";
import parse from ".";
import { Timing } from "./timings";

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
    if (Array.isArray(l.timings)) {
      annotation += l.timings.map(formatTiming).join(" / ");
    } else {
      annotation += formatTiming(l.timings);
    }
  }
  if (l.words) {
    annotation += " " + colorWords(l.words);
  }
  console.log(pad(annotation, 30) + " | " + l.text);
});

function formatTiming(timing: Timing) {
  const output = `${timing.clock}(${timing.read}/${timing.write})`;
  if (timing.clock > 30) {
    return chalk.bgRed(output);
  }
  if (timing.clock > 20) {
    return chalk.red(output);
  }
  if (timing.clock >= 12) {
    return chalk.yellow(output);
  }
  return chalk.green(output);
}

function colorWords(words: number) {
  if (words > 2) {
    return chalk.red(words);
  }
  if (words === 2) {
    return chalk.yellow(words);
  }
  return chalk.green(words);
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
