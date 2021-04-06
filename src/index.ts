import { Parser } from "expr-eval";
import { lookupTiming, Timing } from "./timings";
import { lookupOperandType, Operand, OperandType } from "./operands";
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
  statement?: Statement;
  timings?: Timing | Timing[] | null;
}

export interface Statement {
  instruction: Instruction;
  size: InstructionSize;
  operands: Operand[];
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

  // Operands:
  const operands: Operand[] = [];
  if (parts[2]) {
    splitOperands(parts[2]).forEach((value) => {
      const type = lookupOperandType(value);
      type && operands.push({ type, value });
    });
  }

  const op: Statement = {
    instruction,
    size,
    operands,
    n: calcN(operands, vars),
  };

  return { text, label, statement: op, timings: lookupTiming(op) };
}

/**
 * Split operands on comma, ignoring any inside parentheses.
 */
export function splitOperands(text: string): string[] {
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
 * Calculate timing n value from a set of operands.
 *
 * @param operands Operand list
 * @param vars Optional variables to substitute in immediate expressions
 */
export function calcN(
  operands: Operand[],
  vars: Record<string, number> = {}
): number | undefined {
  const range = operands.find((a) => a.type === OperandType.RegList);
  if (range) {
    return rangeN(range.value);
  }
  const immediate = operands.find((a) => a.type === OperandType.Immediate);
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
 * Try to evaluate immediate operand text to a number
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
