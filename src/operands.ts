export interface Operand {
  /** Generic type of operand */
  type: OperandType;
  /** Actual text value of this instance */
  value: string;
}

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
