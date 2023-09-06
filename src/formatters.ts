/**
 * Formatter implementations for CLI output
 */

import chalk, { Color } from "chalk";

import { formatTiming, Level, Levels, timingLevel } from ".";
import { Timing } from "./timings";
import { Line } from "./parse";
import { Totals } from "./totals";

export interface Formatter {
  format(lines: Line[], totals: Totals): string;
}

export interface JsonOptions {
  /** Pretty print JSON with whtespace */
  prettyPrint: boolean;

  /**
   * Comma separated list of elements to include
   * Possible values: "text,timings,bytes,totals"
   */
  include: string;
}

export class JsonFormatter implements Formatter {
  constructor(private options: JsonOptions) {}

  format(lines: Line[], totals: Totals): string {
    const elements = this.options.include.toLowerCase().split(",");

    // Only need to include lines array if one of these elements is included
    const includeLines = ["text", "timings", "bytes"].some((v) =>
      elements.includes(v)
    );

    const output = {
      lines: includeLines
        ? lines.map((l) => ({
            text: elements.includes("text") ? l.statement.text : undefined,
            timing: elements.includes("timings") ? l.timing : undefined,
            bytes: elements.includes("bytes") ? l.bytes : undefined,
          }))
        : undefined,
      totals: elements.includes("totals") ? totals : undefined,
    };

    return this.options.prettyPrint
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
  }
}

export interface PlainTextOptions {
  /** Color text output in terminal */
  color: boolean;

  /**
   * Comma separated list of elements to include
   * Possible values: "text,timings,bytes,totals"
   */
  include: string;
}

export class PlainTextFormatter implements Formatter {
  constructor(private options: PlainTextOptions) {}

  static levelToColor: Record<Level, typeof Color> = {
    [Levels.VHigh]: "bgRed",
    [Levels.High]: "red",
    [Levels.Med]: "yellow",
    [Levels.Low]: "green",
  };

  format(lines: Line[], totals: Totals): string {
    const elements = this.options.include.toLowerCase().split(",");

    // Only need to include lines array if one of these elements is included
    const includeLines = ["text", "timings", "bytes"].some((v) =>
      elements.includes(v)
    );

    let output: string[] = [];

    if (includeLines) {
      output = lines.map((l) => {
        let annotation = "";
        if (l.timing && elements.includes("timings")) {
          const format = this.options.color
            ? this.formatTimingColored
            : formatTiming;
          annotation += l.timing.values.map(format).join(" / ");
        }
        if (l.bytes && elements.includes("bytes")) {
          annotation += " " + this.formatNumber(l.bytes);
        }
        annotation = this.pad(annotation, 30);
        if (elements.includes("text")) {
          " | " + l.statement.text;
        }
        return annotation;
      });
    }

    if (elements.includes("totals")) {
      output.push("\nTotals:");
      if (totals.isRange) {
        output.push(
          formatTiming(totals.min) + " - " + formatTiming(totals.max)
        );
      } else {
        output.push(formatTiming(totals.min));
      }
      output.push(
        `${this.formatNumber(totals.bytes)} bytes (${this.formatNumber(
          totals.objectBytes
        )} object, ${this.formatNumber(totals.bssBytes)} BSS)`
      );
    }

    return output.join("\n");
  }

  private formatTimingColored(timing: Timing) {
    const output = formatTiming(timing);
    const level = timingLevel(timing);
    return chalk[PlainTextFormatter.levelToColor[level]](output);
  }

  /**
   * Display a string with padding
   */
  private pad(str: string, l: number) {
    /*eslint-disable no-control-regex */
    const strClean = str.replace(/(\x9B|\x1B\[)[0-?]*[ -/]*[@-~]/g, "");
    const p = strClean ? l - strClean.length : l;
    return Array(p).fill(" ").join("") + str;
  }

  private formatNumber(num: number): string {
    return num.toLocaleString("en");
  }
}
