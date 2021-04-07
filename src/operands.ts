import { Parser } from "expr-eval";
import { Vars } from ".";

export interface Operand {
  /** Generic type of operand */
  type: OperandType;
  /** Source text */
  text: string;
  /** Evaluated numeric value */
  value?: number;
}

export type Operands = { source?: Operand; dest?: Operand };

export enum OperandType {
  DirectData = "Dn",
  DirectAddr = "An",
  Indirect = "(An)",
  IndirectPost = "(An)+",
  IndirectPre = "-(An)",
  IndirectDisp = "d(An)",
  IndirectIx = "d(An,ix)",
  IndirectPcDisp = "d(PC)",
  IndirectPcIx = "d(PC,ix)",
  AbsoluteW = "xxx.W",
  AbsoluteL = "xxx.L",
  RegList = "RegList",
  Immediate = "#xxx",
}

/**
 * Parse operands text
 *
 * @param str Source segment to parse
 * @param vars Variables to substitute in immediate expressions
 */
export function parseOperandsText(str: string, vars: Vars = {}): Operands {
  const srcDest: Operands = {};
  const operands: Operand[] = [];
  splitOperands(str).forEach((text) => {
    const type = lookupOperandType(text);
    if (type) {
      const operand: Operand = { type, text };
      if (type === OperandType.RegList) {
        operand.value = rangeN(text);
      } else if (type === OperandType.Immediate) {
        operand.value = evalImmediate(text, vars);
      }
      operands.push(operand);
    }
  });
  if (operands.length >= 2) {
    srcDest.dest = operands[1];
    srcDest.source = operands[0];
  } else if (operands.length == 1) {
    srcDest.dest = operands[0];
  }
  return srcDest;
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

/**
 * Look up type of an operand string
 */
export function lookupOperandType(operand: string): OperandType | null {
  const matching = types.find((t) => t.exp.exec(operand));
  return matching ? matching.type : null;
}

/**
 * Regular expressions to identify operand type from text.
 */
const types: { type: OperandType; exp: RegExp }[] = [
  { type: OperandType.DirectData, exp: /^d[0-7]$/i },
  { type: OperandType.DirectAddr, exp: /^(a[0-7]|sr)$/i },
  { type: OperandType.Indirect, exp: /^\((a[0-7]|sr)\)$/i },
  { type: OperandType.IndirectPost, exp: /^\((a[0-7]|sr)\)\+$/i },
  { type: OperandType.IndirectPre, exp: /^-\((a[0-7]|sr)\)$/i },
  {
    type: OperandType.IndirectDisp,
    exp: /([0-9a-f]\(a[0-7]\)|\([0-9a-f],a[0-7]\))$/i,
  },
  { type: OperandType.IndirectIx, exp: /a[0-7],d[0-7]\)$/i },
  {
    type: OperandType.IndirectPcDisp,
    exp: /([0-9a-f]\(pc\)|\([0-9a-f],pc\))$/i,
  },
  { type: OperandType.IndirectPcIx, exp: /pc,d[0-7]\)$/i },
  { type: OperandType.Immediate, exp: /^#./i },
  { type: OperandType.RegList, exp: /(d|a)[0-7](\/|-)(d|a)[0-7]/i },
  { type: OperandType.AbsoluteW, exp: /\.W$/i },
  { type: OperandType.AbsoluteL, exp: /./i }, // Default
];
