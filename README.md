![Output window screenshot](images/icon.png)

# 68k Counter

Analyses 68000 assembly source to profile resource and size data. For each instruction it will tell you.

- CPU cycles
- Bus read cycles
- Bus write cycles
- Size in words

## Usage:

### Web app

You can try out the tool in a <a href="https://68kcounter-web.vercel.app/">web-based version</a>.

### CLI

To analyse a source file run:

`npx 68kcounter mysource.s`

This will output each line prefixed with profile data in the following format:

`[cycles]([reads]/[writes]) [size]`

### VS Code extension

Available as <a href="https://marketplace.visualstudio.com/items?itemName=gigabates.68kcounter">VS Code extension</a> to provide live annotations and totals.

![Output window screenshot](https://github.com/grahambates/68kcounter-vscode/raw/HEAD/images/demo.gif)

## Limitations:

- Because it analyses your pre-assembled source, it can't take into account
  optimisations made by your assembler.
- Total timings for a whole file are pretty meaningless as it doesn't take
  into account branching etc, but it can be useful for smaller blocks.
- While it adds profile information inside any macro definitions, it doesn't
  currently process macro invocations
- Where timings are based on an 'n' multiplier from an immediate value, it
  will parse simple expressions but doesn't currently substitute constants
  defined elsewhere.
