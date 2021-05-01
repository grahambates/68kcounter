import { Calculation, instructionTimings, Timing } from "../timings";
import { Directives, Directive } from "../syntax";
import { StatementNode } from "./nodes";
import evaluate, { Variables } from "./evaluate";
import statementSize from "../sizes";
import { calculateTotals } from "../totals";

export interface Line {
  statement: StatementNode;
  macroLines?: Line[];
  bytes: number;
  bss: boolean;
  timings?: Timing[] | null;
  calculation?: Calculation;
}

type Macros = Record<string, StatementNode[]>;

/**
 * Parse multiple lines of ASM code
 */
export default function parse(input: string): Line[] {
  const inputLines = input
    .replace(/\r\n/, "\n")
    .replace(/\r/, "\n")
    .split("\n");

  // Parse individual statements:
  const statements = inputLines.map((l) => new StatementNode(l));

  // Process assignment directives to variables and calculate byte sizes:
  // These need to be done together as some expressions use byte offsets of labels.

  const vars: Variables = {};
  const macros: Macros = {};
  let lines: Line[] = [];

  // Do two passes to catch all references.
  for (let i = 0; i < 2; i++) {
    lines = processStatements(statements, vars, macros);
  }

  return lines;
}

/**
 * Add size and timing info to statements
 */
function processStatements(
  statements: StatementNode[],
  vars: Variables,
  macros: Macros
): Line[] {
  let totalBytes = 0;
  // The name of the macro currently being defined
  let currentMacro: string | null = null;
  let bss = false;

  let reptStart: Line | null = null;
  let reptStatements: StatementNode[] = [];

  return statements.map(
    (statement: StatementNode): Line => {
      const line: Line = { statement, bytes: 0, bss };
      const { label, operands } = statement;

      // Currently defining a macro - store statements against this name rather than processing now
      if (currentMacro) {
        if (
          statement.isDirective() &&
          statement.opcode.op.name === Directives.ENDM
        ) {
          // End macro
          currentMacro = null;
        } else {
          // Add statement to macro
          macros[currentMacro].push(statement);
        }
        return line;
      }

      // Inside repeating section:
      else if (reptStart) {
        if (
          statement.isDirective() &&
          statement.opcode.op.name === Directives.ENDR
        ) {
          // End of repeat
          line.macroLines = [];
          // Expand and process repeated statements
          const countOp = reptStart.statement.operands[0];
          const reptCount = (countOp && evaluate(countOp.text)) || 0;
          for (let i = 0; i < reptCount; i++) {
            line.macroLines = [
              ...line.macroLines,
              ...processStatements(reptStatements, vars, macros),
            ];
          }
          reptStart = null;
          reptStatements = [];
        } else {
          // Add statement to repeated list
          reptStatements.push(statement);
        }
      }

      // Statement contains only label:
      else if (statement.isLabel()) {
        // Assign running total of bytes to labels names
        // This allows expressions to get byte count from ranges e.g. `dcb.b END-START`
        vars[statement.label.text] = totalBytes;
      }

      // Macro invocation:
      else if (statement.isMacro()) {
        const macroName = statement.opcode.op.text;
        if (macros[macroName]) {
          const macroStatements = macros[macroName].map(
            ({ text }): StatementNode => {
              for (let i = 1; i <= operands.length; i++) {
                const placeholder = "\\" + i;
                text = text.replace(placeholder, operands[i - 1].text);
              }
              return new StatementNode(text);
            }
          );
          line.macroLines = processStatements(macroStatements, vars, macros);
        }
      }

      // Assembler directive psuedo-opcodes
      else if (statement.isDirective()) {
        // Variable Assignment:
        if (
          label &&
          assignments.includes(statement.opcode.op.name) &&
          operands[0]
        ) {
          const value = evaluate(operands[0].text, vars);
          if (value) {
            vars[label.text] = value;
          }
        }

        // Macro definition:
        else if (
          statement.opcode.op.name === Directives.MACRO &&
          statement.label
        ) {
          currentMacro = statement.label.text.toUpperCase();
          macros[currentMacro] = [];
        }

        // Rept start:
        else if (statement.opcode.op.name === Directives.REPT) {
          reptStart = line;
        }

        // Section:
        else if (sections.includes(statement.opcode.op.name)) {
          // Is this a BSS section?
          bss =
            statement.opcode.op.name.includes("BSS") ||
            statement.operands.some((o) => o.text.match(/^bss/i));
        }
      }

      // Instruction opcodes:
      else if (statement.isInstruction()) {
        // Get instruction timings:
        const timingResult = instructionTimings(statement, vars);
        if (timingResult) {
          line.timings = timingResult.timings;
          line.calculation = timingResult.calculation;
        }
      }

      // Calculate total of lines added by macro/rept:
      if (line.macroLines) {
        const macroTotals = calculateTotals(line.macroLines);
        line.bytes = macroTotals.bytes;
        line.timings = macroTotals.isRange
          ? [macroTotals.min, macroTotals.max]
          : [macroTotals.min];
      }

      // Calculate byte size of this statement:
      if (!line.bytes) {
        line.bytes = statementSize(statement, vars);
      }
      totalBytes += line.bytes;

      return line;
    }
  );
}

const assignments: Directive[] = [
  Directives["="],
  Directives.EQU,
  Directives.FEQU,
  Directives.SET,
];

const sections: Directive[] = [
  Directives.SECTION,
  Directives.BSS,
  Directives.BSS_C,
  Directives.BSS_F,
  Directives.DATA,
  Directives.DATA_C,
  Directives.DATA_F,
  Directives.CODE,
  Directives.CODE_C,
  Directives.CODE_F,
];
