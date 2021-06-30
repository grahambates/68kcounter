import { InstructionTiming, instructionTimings } from "../timings";
import { Directives, Directive } from "../syntax";
import {
  DirectiveStatement,
  InstructionStatement,
  LabelStatement,
  MacroStatement,
  StatementNode,
} from "./nodes";
import evaluate, { Variables } from "./evaluate";
import statementSize from "../sizes";
import { calculateTotals } from "../totals";

export interface Line {
  statement: StatementNode;
  macroLines?: Line[];
  bytes?: number;
  bss?: boolean;
  timing?: InstructionTiming;
}

export default class Parser {
  /** Variable/constants state */
  private vars: Variables = {};

  /** Macro definitions */
  private macros: Record<string, StatementNode[]> = {};

  /** Running total of parsed statement bytes sizes */
  private totalBytes = 0;

  /** The name of the macro currently being defined */
  private currentMacro: string | null = null;

  /** Start of the current repeating group */
  private reptStart: Line | null = null;

  /** Statements in the current repeating group */
  private reptStatements: StatementNode[] = [];

  /** Are we currently in a BSS section */
  private bss = false;

  // Directive groups:

  private assignments: Directive[] = [
    Directives["="],
    Directives.EQU,
    Directives.FEQU,
    Directives.SET,
  ];

  private sections: Directive[] = [
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

  /**
   * Parse multiple lines of ASM code
   */
  parse(input: string): Line[] {
    // Split input into lines
    const inputLines = input
      .replace(/\r\n/, "\n")
      .replace(/\r/, "\n")
      .split("\n");

    // Parse individual statements:
    const statements = inputLines.map((l) => new StatementNode(l));

    // Now do processing to add size/timing info and expand macros:

    // Reset state
    this.vars = {};
    this.macros = {};

    // Needs two passes to catch all references.
    let lines: Line[] = [];
    for (let i = 0; i < 2; i++) {
      lines = this.processStatements(statements);
    }

    return lines;
  }

  /**
   * Add size and timing info to statements
   */
  private processStatements(statements: StatementNode[]): Line[] {
    this.totalBytes = 0;
    this.currentMacro = null;
    this.bss = false;
    this.reptStart = null;
    this.reptStatements = [];

    return statements.map(this.processStatement.bind(this));
  }

  private processStatement(statement: StatementNode): Line {
    let line: Line = { statement };

    // Currently defining a macro - store statements against this name rather than processing now
    if (this.currentMacro) {
      if (statement.opcode?.op.name === Directives.ENDM) {
        // End macro
        this.currentMacro = null;
      } else {
        // Add statement to macro
        this.macros[this.currentMacro].push(statement);
      }
      return line;
    }

    // Inside repeating section:
    if (this.reptStart) {
      if (statement.opcode?.op.name === Directives.ENDR) {
        // End of repeat
        line.macroLines = [];
        // Expand and process repeated statements
        const countOp = this.reptStart.statement.operands[0]?.text;
        const reptCount = evaluate(countOp) || 0;
        const statements = this.reptStatements;

        this.reptStart = null;
        this.reptStatements = [];

        // TODO: support REPTN
        for (let i = 0; i < reptCount; i++) {
          line.macroLines = [
            ...line.macroLines,
            ...this.processStatements(statements),
          ];
        }
      } else {
        // Add statement to repeated list
        this.reptStatements.push(statement);
      }
    }

    // Process types:
    else if (statement.isLabel()) {
      line = this.processLabel(statement);
    } else if (statement.isMacro()) {
      line = this.processMacro(statement);
    } else if (statement.isDirective()) {
      line = this.processDirective(statement);
    } else if (statement.isInstruction()) {
      line = this.processInstruction(statement);
    }

    // Calculate total of lines added by macro/rept:
    if (line.macroLines) {
      const macroTotals = calculateTotals(line.macroLines);
      line.bytes = macroTotals.bytes;
      if (macroTotals.min[0]) {
        line.timing = macroTotals.isRange
          ? {
              values: [macroTotals.min, macroTotals.max],
              labels: ["Min", "Max"],
            }
          : {
              values: [macroTotals.min],
              labels: [],
            };
      }
    }

    // Calculate byte size of this statement:
    else if (!line.bytes) {
      line.bytes = statementSize(statement, this.vars);
      line.bss = this.bss;
    }
    this.totalBytes += line.bytes;

    return line;
  }

  private processLabel(statement: StatementNode & LabelStatement) {
    // Assign running total of bytes to labels names
    // This allows expressions to get byte count from ranges e.g. `dcb.b END-START`
    this.vars[statement.label.text] = this.totalBytes;
    return { statement, bytes: 0, bss: this.bss };
  }

  private processMacro(statement: StatementNode & MacroStatement) {
    const line: Line = { statement };
    const macroName = statement.opcode.op.text;
    if (this.macros[macroName]) {
      const macroStatements = this.macros[macroName].map(
        ({ text }): StatementNode => {
          for (let i = 1; i <= statement.operands.length; i++) {
            const placeholder = "\\" + i;
            text = text.replace(placeholder, statement.operands[i - 1].text);
          }
          return new StatementNode(text);
        }
      );
      line.macroLines = this.processStatements(macroStatements);
    }
    return line;
  }

  private processDirective(statement: StatementNode & DirectiveStatement) {
    const line: Line = { statement };

    // Variable Assignment:
    if (
      statement.label &&
      this.assignments.includes(statement.opcode.op.name) &&
      statement.operands[0]
    ) {
      const value = evaluate(statement.operands[0].text, this.vars);
      if (value) {
        this.vars[statement.label.text] = value;
      }
    }

    // Macro definition:
    else if (statement.opcode.op.name === Directives.MACRO) {
      const macroName = statement.label
        ? statement.label.text
        : statement.operands[0]?.text;
      if (macroName) {
        this.currentMacro = macroName.toUpperCase();
        this.macros[this.currentMacro] = [];
      }
    }

    // Rept start:
    else if (statement.opcode.op.name === Directives.REPT) {
      this.reptStart = line;
    }

    // Section:
    else if (this.sections.includes(statement.opcode.op.name)) {
      // Is this a BSS section?
      this.bss =
        statement.opcode.op.name.includes("BSS") ||
        statement.operands.some((o) => o.text.match(/^bss/i));
    }
    return line;
  }

  private processInstruction(statement: StatementNode & InstructionStatement) {
    const line: Line = {
      statement,
      bss: this.bss,
      timing: instructionTimings(statement, this.vars) || undefined,
    };
    return line;
  }
}
