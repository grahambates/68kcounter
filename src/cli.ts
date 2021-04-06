#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { argv } from "process";
import parse from ".";
import { formatTiming } from "./timings";

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
  console.log(annotation.padStart(28) + " | " + l.text);
});
