# 68k Counter

Analyses 68000 assembly source to profile resource and size data. For each instruction it will tell you.

- CPU cycles
- Bus read cycles
- Bus write cycles
- Size in words

## Limitations:

- Because it analyses your pre-assembled source, it can't take into account
  optimisations made by your assembler.
- While it adds profile information inside any macro definitions, it doesn't
  process macro invocations
- Where timings are based on an 'n' multiplier from an immediate value, it
  will parse simple expressions but doesn't currently substitute constants
  defined elsewhere.

## CLI usage

To analyse a source file run:

`npx 68kcounter mysource.s`

This will output each line prefixed with profile data in the following format:

`[cycles]([reads]/[writes]) [size] |`
