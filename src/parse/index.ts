import { Calculation, instructionTimings, Timing } from "../timings";
import { Directives, Directive } from "../syntax";
import { StatementNode, InstructionStatement } from "./nodes";
import evaluate, { Variables } from "./evaluate";
import statementSize from "../sizes";

export interface Line {
  statement: StatementNode;
  timings?: Timing[] | null;
  calculation?: Calculation;
  bytes?: number;
}

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  const inputLines = input
    .replace(/\r\n/, "\n")
    .replace(/\r/, "\n")
    .split("\n");

  // Parse individual lines:
  const lines = inputLines.map(
    (l): Line => ({ statement: new StatementNode(l) })
  );

  // Process assignment directives to variables and calculate byte sizes:
  // These need to be done together as some expressions use byte offsets of labels.

  const vars: Variables = {};

  // Do two passes to catch back references.
  for (let i = 0; i < 2; i++) {
    let bytes = 0;

    for (const i in lines) {
      const line = lines[i];
      const statement = line.statement;
      const { label, opcode, operands } = statement;

      // Assign running total of bytes to labels names
      // This allows expressions to get byte count from ranges e.g. `dcb.b END-START`
      if (label && !opcode) {
        vars[label.text] = bytes;
      }

      if (statement.isDirective()) {
        // Variable Assignment:
        if (
          label &&
          vars[label.text] === undefined &&
          assignments.includes(statement.opcode.op.name) &&
          operands[0]
        ) {
          const value = evaluate(operands[0].text, vars);
          if (value) {
            vars[label.text] = value;
          }
        }
      }

      // Calculate byte size of this statement:
      if (!line.bytes) {
        line.bytes = statementSize(statement, vars);
      }
      bytes += line.bytes;
    }
  }

  // Add instruction timings:
  for (const line of lines) {
    if (line.statement.isInstruction()) {
      const statement = line.statement as InstructionStatement;
      const timingResult = instructionTimings(statement, vars);
      if (timingResult) {
        line.timings = timingResult.timings;
        line.calculation = timingResult.calculation;
      }
    }
  }

  return lines;
}

const assignments: Directive[] = [
  Directives["="],
  Directives.EQU,
  Directives.FEQU,
];
