export interface Arg {
  /** Generic type of argument */
  type: ArgType;
  /** Actual text value of this instance */
  value: string;
}

export enum ArgType {
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
 * Look up type of an argument string
 */
export function lookupArgType(arg: string): ArgType | null {
  const matching = argTypes.find((t) => t.exp.exec(arg));
  return matching ? matching.type : null;
}

/**
 * Regular expressions to identify argument type from text.
 */
const argTypes: { type: ArgType; exp: RegExp }[] = [
  { type: ArgType.DirectData, exp: /^d[0-7]$/i },
  { type: ArgType.DirectAddr, exp: /^(a[0-7]|sr)$/i },
  { type: ArgType.Indirect, exp: /^\((a[0-7]|sr)\)$/i },
  { type: ArgType.IndirectPost, exp: /^\((a[0-7]|sr)\)\+$/i },
  { type: ArgType.IndirectPre, exp: /^-\((a[0-7]|sr)\)$/i },
  {
    type: ArgType.IndirectDisp,
    exp: /([0-9a-f]\(a[0-7]\)|\([0-9a-f],a[0-7]\))$/i,
  },
  { type: ArgType.IndirectIx, exp: /a[0-7],d[0-7]\)$/i },
  {
    type: ArgType.IndirectPcDisp,
    exp: /([0-9a-f]\(pc\)|\([0-9a-f],pc\))$/i,
  },
  { type: ArgType.IndirectPcIx, exp: /pc,d[0-7]\)$/i },
  { type: ArgType.Immediate, exp: /^#./i },
  { type: ArgType.RegList, exp: /(d|a)[0-7](\/|-)(d|a)[0-7]/i },
  { type: ArgType.AbsoluteW, exp: /\.W$/i },
  { type: ArgType.AbsoluteL, exp: /./i }, // Default
];
