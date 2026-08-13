import { describe, expect, it } from 'vitest';
import { createOhmsLawRuntime } from '../src/experiments/ohms-law/createOhmsLaw';
import { executeExperimentProgram } from '../src/programming/ast/execute';
import { experimentProgramToPython } from '../src/programming/ast/toPython';
import type { ExperimentProgram } from '../src/programming/ast/types';

const program: ExperimentProgram = {
  version: 1,
  statements: [
    { type: 'connect-standard', sourceBlockId: 'connect' },
    { type: 'clear-measurements', sourceBlockId: 'clear' },
    { type: 'set-resistance', value: 3, sourceBlockId: 'resistance' },
    {
      type: 'sweep-voltage',
      from: 2,
      to: 6,
      step: 2,
      sourceBlockId: 'sweep',
      body: [
        { type: 'measure-current', sourceBlockId: 'measure' },
        { type: 'record', sourceBlockId: 'record' },
      ],
    },
    { type: 'plot', x: 'U', y: 'I', sourceBlockId: 'plot' },
  ],
};

describe('Experiment AST', () => {
  it('executes against the shared SimulationRuntime', async () => {
    const runtime = createOhmsLawRuntime();
    await executeExperimentProgram(runtime, program);

    const rows = runtime.measurements.all();
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.voltage)).toEqual([2, 4, 6]);
    expect(rows[2]?.current).toBeCloseTo(2, 8);
    expect(runtime.getState().result.status).toBe('closed');
  });

  it('generates equivalent student-facing Python', () => {
    const code = experimentProgramToPython(program);
    expect(code).toContain('from physics_lab import *');
    expect(code).toContain('for voltage in np.arange(2, 6 + 2 / 2, 2):');
    expect(code).toContain('source.voltage = float(voltage)');
    expect(code).toContain('current = ammeter.read()');
    expect(code).toContain('experiment.record()');
    expect(code).toContain('experiment.plot("U", "I")');
  });
});
