import Parser, { Line } from "./Parser";

export * from "./Parser";
export * from "./nodes";

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  const parser = new Parser();
  return parser.parse(input);
}
