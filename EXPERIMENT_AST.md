# Experiment AST

`Experiment AST` is the neutral programming representation between the visual editor, the laboratory runtime and Python.

```text
Blockly workspace
      ↓
workspaceToExperimentProgram
      ↓
Experiment AST
      ├── executeExperimentProgram → SimulationRuntime → Physics Core / Babylon / Data
      └── experimentProgramToPython → Monaco → Pyodide
```

The visual editor therefore does not own physics and does not generate an independent simulation.

## Current statements

- `connect-standard`
- `clear-measurements`
- `set-resistance`
- `sweep-voltage`
- `wait`
- `measure-current`
- `record`
- `plot`

Every AST node keeps `sourceBlockId`, which lets the executor highlight the currently running Blockly block.

## Why the AST exists

A direct Blockly → Python pipeline would make Python the hidden execution engine for every visual experiment and would tightly couple visual blocks to one textual language. The AST instead gives us one domain language for experiments. Future clients can include Rive-guided scenarios, teacher-authored sequences, recorded macros and an AI tutor without duplicating the physics runtime.
