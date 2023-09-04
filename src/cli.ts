#!/usr/bin/env node
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import parse, { calculateTotals } from ".";
import { Formatter, JsonFormatter, PlainTextFormatter } from "./formatters";

// CLI args:

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 [options] [file]")
  .options({
    stdin: {
      describe: "Read input from stdin, not file",
      type: "boolean",
      default: false,
    },
    format: {
      describe: "Output format",
      choices: ["text", "json"] as const,
      default: "text",
      alias: "f",
    },
    color: {
      describe: "Color plain text output",
      type: "boolean",
      default: true,
      alias: "c",
    },
    prettyPrint: {
      describe: "Print JSON with whitespace",
      type: "boolean",
      default: true,
    },
    include: {
      describe: "Elements to include in JSON (default all)",
      type: "string",
      default: "text,timings,bytes,totals",
      alias: "i",
    },
  })
  .parseSync();

// Get input data:

let filePath: string | number;

if (argv.stdin) {
  filePath = process.stdin.fd;
} else {
  const file = argv._[0];
  if (!file) {
    console.error("Specify a filename or --stdin");
    process.exit(1);
  }
  filePath = path.resolve(String(file));
  if (!fs.existsSync(filePath)) {
    console.error(`File "${file}" not found`);
    process.exit(1);
  }
}
const file = fs.readFileSync(filePath).toString();

// Format with chosen formatter:

let formatter: Formatter;
if (argv.format === "json") {
  formatter = new JsonFormatter(argv);
} else {
  formatter = new PlainTextFormatter(argv);
}

const lines = parse(file);
const totals = calculateTotals(lines);

const output = formatter.format(lines, totals);

// Output:

console.log(output);
