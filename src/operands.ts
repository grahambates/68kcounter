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

export enum OperandGroup {
  M = "M",
  EA = "EA",
  DI = "DI",
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

export function isOperandGroup(v: string): v is OperandGroup {
  return Object.values(OperandGroup).includes(v as OperandGroup);
}

export const operandGroups = {
  [OperandGroup.EA]: [
    OperandType.Dn,
    OperandType.An,
    OperandType.AnIndir,
    OperandType.AnPostInc,
    OperandType.AnPreDec,
    OperandType.AnDisp,
    OperandType.AnDispIx,
    OperandType.PcDisp,
    OperandType.PcDispIx,
    OperandType.AbsW,
    OperandType.AbsL,
    OperandType.Imm,
  ],
  [OperandGroup.DI]: [OperandType.Dn, OperandType.An, OperandType.Imm],
  [OperandGroup.M]: [
    OperandType.AnIndir,
    OperandType.AnPostInc,
    OperandType.AnPreDec,
    OperandType.AnDisp,
    OperandType.AnDispIx,
    OperandType.PcDisp,
    OperandType.PcDispIx,
    OperandType.AbsW,
    OperandType.AbsL,
  ],
};

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
    // ignore
  }
}

/**
 * Look up type of an operand string
 */
export function lookupOperandType(operand: string): OperandType | null {
  const matching = types.find((t) => t.exp.exec(operand));
  return matching ? matching.type : null;
}

// Common regex components
const dn = "(d[0-7])";
const an = "(a[0-7]|sp)";
const rn = "([ad][0-7]|sp)";
const pc = "pc";
const op = "\\(\\s*";
const cp = "\\s*\\)";
const comma = "\\s*,\\s*";
const idx = `${rn}(\\.(w|l))?`;

/**
 * Regular expressions to identify operand type from text.
 */
const types: { type: OperandType; exp: RegExp }[] = [
  { type: OperandType.Dn, exp: new RegExp(`^${dn}$`, "i") },
  { type: OperandType.An, exp: new RegExp(`^${an}$`, "i") },
  {
    type: OperandType.AnIndir,
    exp: new RegExp(`^${op + an + cp}$`, "i"),
  },
  {
    type: OperandType.AnPostInc,
    // (An)+
    exp: new RegExp(`^${op + an + cp}\\+$`, "i"),
  },
  {
    type: OperandType.AnPreDec,
    // -(An)
    exp: new RegExp(`^-${op + an + cp}$`, "i"),
  },
  {
    type: OperandType.AnDispIx,
    // An,Idx)
    exp: new RegExp(an + comma + idx + cp, "i"),
  },
  {
    type: OperandType.AnDisp,
    exp: new RegExp(
      // d(An) | (d,An)
      `(\\w${op + an}|${op}\\w+${comma + an + cp}$)`,
      "i"
    ),
  },
  {
    type: OperandType.PcDispIx,
    // PC,Idx)
    exp: new RegExp(pc + comma + idx + cp, "i"),
  },
  {
    type: OperandType.PcDisp,
    exp: new RegExp(
      // d(PC) | (d,PC)
      `(\\w${op + pc}|${op}\\w+${comma + pc + cp}$)`,
      "i"
    ),
  },
  { type: OperandType.Imm, exp: /^#./i },
  {
    type: OperandType.RegList,
    // Rn[/-]Rn
    exp: new RegExp(`${rn}[\\/-]${rn}`, "i"),
  },
  { type: OperandType.AbsW, exp: /\.W$/i },
  { type: OperandType.AbsL, exp: /./i }, // Default
];
