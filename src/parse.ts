import * as expEval from "expression-eval";
import { Calculation, instructionTimings, Timing } from "./timings";
import instructionLength from "./instructionLength";
import {
  AddressingModes,
  Qualifiers,
  Directives,
  Directive as DirectiveName,
  mnemonicGroups,
  Qualifier,
  Mnemonics,
} from "./syntax";
import {
  DirectiveToken,
  MnemonicToken,
  OperandToken,
  QualifierToken,
  Token,
  tokenize,
} from "./tokens";

export interface Line {
  text: string;
  label?: Token;
  comment?: Token;

  instruction?: Instruction;
  directive?: Directive;

  timings?: Timing[] | null;
  calculation?: Calculation;
  bytes?: number;
}

export interface Instruction {
  mnemonic: MnemonicToken;
  qualifier?: QualifierToken;
  operands: OperandToken[];
}

export interface Directive {
  name: DirectiveToken;
  qualifier?: QualifierToken;
  args?: Token[];
}

const assignments: DirectiveName[] = [
  Directives["="],
  Directives.EQU,
  Directives.FEQU,
];

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  const inputLines = input
    .replace(/\r\n/, "\n")
    .replace(/\r/, "\n")
    .split("\n");

  // Initial parse of input lines:
  const lines = inputLines.map((l) => parseLine(l));

  // Now do additional parsing to add size and timing information.
  // For this we need context from the rest of the document.

  // Track variables
  const vars: Record<string, number> = {};

  // Do two passes to catch back references:
  for (let i = 0; i < 2; i++) {
    let bytes = 0;

    for (const i in lines) {
      const line = lines[i];

      // Assign running total of bytes to labels names
      // This allows expressions to get byte count from ranges e.g. `dcb.b END-START`
      if (line.label && !line.directive) {
        vars[line.label.text] = bytes;
      }

      if (line.directive) {
        const { name: directive, qualifier, args } = line.directive;

        // Variable Assignment:
        if (
          line.label &&
          vars[line.label.text] === undefined &&
          assignments.includes(directive.value) &&
          args &&
          args[0]
        ) {
          const value = evalImmediate(args[0].text, vars);
          if (value) {
            vars[line.label.text] = value;
          }
          continue;
        }

        // Get size of memory blocks:
        if (!line.bytes) {
          // DC:
          if (directive.value === Directives.DC && qualifier && args) {
            if (qualifier.value === Qualifiers.B) {
              line.bytes = byteCount(args);
            } else {
              line.bytes = args.length * qualifierBytes[qualifier.value];
            }
          } else if (directive.value === Directives.DB && args) {
            line.bytes = byteCount(args);
          } else if (directive.value === Directives.DW && args) {
            line.bytes = args.length * 2;
          } else if (directive.value === Directives.DL && args) {
            line.bytes = args.length * 4;
          }

          // DCB / DS:
          else if (
            (directive.value === Directives.DCB ||
              directive.value === Directives.DS) &&
            qualifier &&
            args &&
            args[0]
          ) {
            const n = evalImmediate(args[0].text, vars);
            if (n) {
              const bytes = qualifierBytes[qualifier.value];
              line.bytes = bytes * n;
            }
          }
        }
      }

      // Process instruction:
      if (line.instruction) {
        const { mnemonic, operands } = line.instruction;

        // Evaluate immediate values where required for timing calculations:
        if (
          operands[0]?.value === undefined &&
          (mnemonicGroups.SHIFT.includes(mnemonic.value) ||
            mnemonic.value === Mnemonics.MULS ||
            mnemonic.value === Mnemonics.MULU)
        ) {
          const mode = operands[0].addressingMode;
          if (mode === AddressingModes.Imm) {
            operands[0].value = evalImmediate(operands[0].text, vars);
          }
        }

        // Lookup timings:
        if (!line.timings || operands[0]?.value) {
          const timingResult = instructionTimings(line.instruction);
          if (timingResult) {
            line.timings = timingResult.timings;
            line.calculation = timingResult.calculation;
          }
        }

        // Get bytes from instruction length:
        if (!line.bytes) {
          line.bytes = instructionLength(line.instruction) * 2;
        }
      }

      if (line.bytes) bytes += line.bytes;
    }
  }

  return lines;
}

/**
 * Parse a single line of ASM code
 */
export function parseLine(text: string): Line {
  const line: Line = { text };

  const tokens = tokenize(text);
  if (!tokens.length) {
    return line;
  }

  line.comment = tokens.find((t) => t.type === "Comment");
  line.label = tokens.find((t) => t.type === "Label");

  const qualifier = tokens.find(
    (t) => t.type === "Qualifier"
  ) as QualifierToken;

  // Instruction:
  const mnemonic = tokens.find((t) => t.type === "Mnemonic") as MnemonicToken;
  if (mnemonic) {
    const operands = tokens.filter(
      (t) => t.type === "Operand"
    ) as OperandToken[];
    line.instruction = { mnemonic, qualifier, operands };
    return line;
  }

  // Directive:
  const directive = tokens.find(
    (t) => t.type === "Directive"
  ) as DirectiveToken;
  if (directive) {
    const args = tokens.filter((t) =>
      ["Operand", "String", "Unknown"].includes(t.type)
    );
    line.directive = {
      name: directive,
      qualifier,
      args,
    };
  }

  return line;
}

const qualifierBytes: Record<Qualifier, number> = {
  [Qualifiers.B]: 1,
  [Qualifiers.W]: 2,
  [Qualifiers.L]: 4,
  [Qualifiers.S]: 4,
  [Qualifiers.D]: 8,
  [Qualifiers.Q]: 8,
  [Qualifiers.X]: 12,
};

/**
 * Get byte count for a list of args on dc.b / db
 *
 * Handles quoted strings as well as individual byte values.
 */
function byteCount(args: Token[]): number {
  let count = 0;
  for (const arg of args) {
    if (arg.text.match(/^['"].*['"]$/)) {
      count += arg.text.length - 2;
    } else {
      count++;
    }
  }
  return count;
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
  // Transform ASM expression syntax to be compatible with `expression-eval`
  val = val
    // Remove immediate prefix
    .replace(/^#/, "")
    // Hex
    .replace(/\$([0-9a-f]+)/gi, (_, p1) => eval("0x" + p1))
    // Binary
    .replace(/%([0-1]+)/gi, (_, p1) => eval("0b" + p1))
    // Octal
    .replace(/@([0-7]+)/gi, (_, p1) => eval("0o" + p1))
    // OR
    .replace(/(?<=[a-z0-9_])!(?=[a-z0-9_])/g, "|")
    // XOR
    .replace(/(?<=[a-z0-9_])~(?=[a-z0-9_])/g, "^");

  try {
    const ast = expEval.parse(val);
    return expEval.eval(ast, vars);
  } catch (e) {
    // ignore
  }
}
