#!/usr/bin/env node
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import parse, { calculateTotals } from ".";
import {
  Formatter,
  IncludedElements,
  JsonFormatter,
  PlainTextFormatter,
} from "./formatters";

// CLI args:

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 [options] [file]")
  .options({
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
      describe: "Elements to include (default all)",
      type: "string",
      default: "text,timings,bytes,totals",
      alias: "i",
    },
    width: {
      describe: "Width of annotation column in text output",
      type: "number",
      default: 30,
      alias: "w",
    },
  })
  .parseSync();

// Get input data:

const options = {
  ...argv,
  include: parseIncludeList(argv.include),
};

let formatter: Formatter;
if (argv.format === "json") {
  formatter = new JsonFormatter(options);
} else {
  formatter = new PlainTextFormatter(options);
}

const file = argv._[0];

if (file) {
  const filePath = path.resolve(String(file));
  if (!fs.existsSync(filePath)) {
    console.error(`File "${file}" not found`);
    process.exit(1);
  }
  const text = fs.readFileSync(filePath).toString();
  processText(text);
} else {
  let buf = "";
  process.stdin
    .on("data", (data) => {
      const str = data.toString();
      buf = buf + str;
      if (str.endsWith("\x26")) {
        processText(buf);
        buf = "";
      }
    })
    .on("end", () => {
      processText(buf);
      buf = "";
    });
}

function processText(text: string): void {
  const lines = parse(text);
  const totals = calculateTotals(lines);
  const output = formatter.format(lines, totals);
  console.log(output);
}

function parseIncludeList(list: string): IncludedElements {
  const elements = list.toLowerCase().split(",");
  return {
    text: elements.includes("text"),
    timings: elements.includes("timings"),
    bytes: elements.includes("bytes"),
    totals: elements.includes("totals"),
  };
}
