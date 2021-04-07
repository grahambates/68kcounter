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
  Dn = "Dn",
  An = "An",
  AnIndir = "(An)",
  AnPostInc = "(An)+",
  AnPreDec = "-(An)",
  AnDisp = "d(An)",
  AnDispIx = "d(An,ix)",
  PcDisp = "d(PC)",
  PcDispIx = "d(PC,ix)",
  AbsW = "xxx.W",
  AbsL = "xxx.L",
  RegList = "RegList",
  Imm = "#xxx",
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
      } else if (type === OperandType.Imm) {
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
  { type: OperandType.Dn, exp: /^d[0-7]$/i },
  { type: OperandType.An, exp: /^(a[0-7]|sr)$/i },
  { type: OperandType.AnIndir, exp: /^\((a[0-7]|sr)\)$/i },
  { type: OperandType.AnPostInc, exp: /^\((a[0-7]|sr)\)\+$/i },
  { type: OperandType.AnPreDec, exp: /^-\((a[0-7]|sr)\)$/i },
  {
    type: OperandType.AnDisp,
    exp: /([0-9a-f]\(a[0-7]\)|\([0-9a-f],a[0-7]\))$/i,
  },
  { type: OperandType.AnDispIx, exp: /a[0-7],d[0-7]\)$/i },
  {
    type: OperandType.PcDisp,
    exp: /([0-9a-f]\(pc\)|\([0-9a-f],pc\))$/i,
  },
  { type: OperandType.PcDispIx, exp: /pc,d[0-7]\)$/i },
  { type: OperandType.Imm, exp: /^#./i },
  { type: OperandType.RegList, exp: /(d|a)[0-7](\/|-)(d|a)[0-7]/i },
  { type: OperandType.AbsW, exp: /\.W$/i },
  { type: OperandType.AbsL, exp: /./i }, // Default
];
