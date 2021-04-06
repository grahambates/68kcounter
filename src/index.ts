import { Parser } from "expr-eval";
import { lookupTiming, Timing } from "./timings";
import { lookupArgType, Arg, ArgType } from "./args";
import {
  instructions,
  isInstruction,
  isInstructionSize,
  instructionAliases,
  Instruction,
  InstructionSize,
} from "./instructions";

export interface Line {
  text: string;
  label?: string;
  op?: Op;
  timings?: Timing | Timing[] | null;
}

export interface Op {
  instruction: Instruction;
  size: InstructionSize;
  args: Arg[];
  n?: number;
}

export default function parse(input: string): Line[] {
  // TODO: extract and pass variables
  return input.split("\n").map((l) => parseLine(l));
}

/**
 * Parse line of code to extract any operation or label
 */
export function parseLine(
  text: string,
  vars: Record<string, number> = {}
): Line {
  // Remove comments and split line on whitespace
  const parts = text.split(";")[0].split(/\s+/);

  // Label:
  let label: string | undefined;
  if (parts[0]) {
    label = parts[0].replace(/:$/, "");
  }

  if (!parts[1]) {
    return { text, label };
  }

  // Op:
  const instParts = parts[1].toUpperCase().split(".");

  // Instruction:
  let instruction = instParts[0];
  if (instructionAliases[instruction]) {
    instruction = instructionAliases[instruction];
  }
  if (!isInstruction(instruction)) {
    return { text };
  }

  // Size:
  let size = instParts[1] || instructions[instruction][0];
  // Alias short as byte
  if (size === "S") {
    size = "B";
  }
  if (!isInstructionSize(size)) {
    return { text };
  }

  // Args:
  const args: Arg[] = [];
  if (parts[2]) {
    const argsSplit = splitParams(parts[2]);
    for (const value of argsSplit) {
      const type = lookupArgType(value);
      if (type) {
        args.push({ type, value });
      }
    }
  }

  const op: Op = {
    instruction,
    size,
    args,
    n: calcN(args, vars),
  };

  return { text, label, op, timings: lookupTiming(op) };
}

/**
 * Split parameters on comma, ignoring any inside parentheses.
 */
export function splitParams(text: string): string[] {
  let parens = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "(") {
      parens++;
    } else if (char === ")") {
      parens--;
    } else if (!parens && char === ",") {
      return [text.substring(0, i), text.substring(i + 1)];
    }
  }
  return [text];
}

/**
 * Calculate timing n value from a set of args.
 *
 * @param args Arguments list
 * @param vars Optional variables to substitute in immediate expressions
 */
export function calcN(
  args: Arg[],
  vars: Record<string, number> = {}
): number | undefined {
  const range = args.find((a) => a.type === ArgType.RegList);
  if (range) {
    return rangeN(range.value);
  }
  const immediate = args.find((a) => a.type === ArgType.Immediate);
  if (immediate) {
    return evalImmediate(immediate.value, vars);
  }
}

/**
 * Calculate timing n value from register range used in MOVEM
 */
export function rangeN(range: string): number {
  return range.split("/").reduce((acc, v) => {
    const [from, to] = v.split("-").map((n) => {
      const t = n[0].toUpperCase();
      return parseInt(n.substr(1), 10) + (t === "A" ? 8 : 0);
    });
    return acc + (to ? to - from + 1 : 1);
  }, 0);
}

/**
 * Try to evaluate immediate arg text to a number
 *
 * @param val Text value
 * @param vars Optional variables to substitute in expression
 */
export function evalImmediate(
  val: string,
  vars: Record<string, number> = {}
): number | undefined {
  val = val.replace(/^#/, "").replace("$", "0x").replace("%", "0b");
  try {
    return Parser.evaluate(val, vars);
  } catch (e) {
    // console.warn(val);
    // console.warn(e.message);
  }
}
