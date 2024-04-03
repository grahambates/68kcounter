import { AddressingMode, AddressingModes } from "../syntax";

/**
 * Look up addressing mode of an operand string
 */
export default function operandMode(operand: string): AddressingMode {
  const match = addressingModePatterns.find((t) => t.exp.exec(operand));
  return match ? match.type : AddressingModes.AbsL;
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
const addressingModePatterns: { type: AddressingMode; exp: RegExp }[] = [
  { type: AddressingModes.Dn, exp: new RegExp(`^${dn}$`, "i") },
  { type: AddressingModes.An, exp: new RegExp(`^${an}$`, "i") },
  {
    type: AddressingModes.AnIndir,
    exp: new RegExp(`^${op + an + cp}$`, "i"),
  },
  {
    type: AddressingModes.AnPostInc,
    // (An)+
    exp: new RegExp(`^${op + an + cp}\\+$`, "i"),
  },
  {
    type: AddressingModes.AnPreDec,
    // -(An)
    exp: new RegExp(`^-${op + an + cp}$`, "i"),
  },
  {
    type: AddressingModes.AnDispIx,
    // An,Idx)
    exp: new RegExp(an + comma + idx + cp, "i"),
  },
  {
    type: AddressingModes.AnDisp,
    exp: new RegExp(
      // d(An) | (d,An)
      `(\\w${op + an}|${op}[-\\w]+${comma + an + cp}$)`,
      "i"
    ),
  },
  {
    type: AddressingModes.PcDispIx,
    // PC,Idx)
    exp: new RegExp(pc + comma + idx + cp, "i"),
  },
  {
    type: AddressingModes.PcDisp,
    exp: new RegExp(
      // d(PC) | (d,PC)
      `(\\w${op + pc}|${op}[-\\w]+${comma + pc + cp}$)`,
      "i"
    ),
  },
  { type: AddressingModes.Imm, exp: /^#./i },
  {
    type: AddressingModes.RegList,
    // Rn[/-]Rn
    exp: new RegExp(`${rn}[\\/-]${rn}`, "i"),
  },
  { type: AddressingModes.CCR, exp: /^ccr$/i },
  { type: AddressingModes.SR, exp: /^sr$/i },
  { type: AddressingModes.USP, exp: /^usp$/i },
  { type: AddressingModes.AbsW, exp: /\.W$/i },
];
