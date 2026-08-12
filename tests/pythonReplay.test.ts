import { describe, expect, it } from 'vitest';
import { createOhmsLawRuntime } from '../src/experiments/ohms-law/createOhmsLaw';
import { replayPythonEvents } from '../src/programming/python/replay';
import type { PythonLabEvent } from '../src/programming/python/protocol';

const events: PythonLabEvent[] = [
  { type: 'connect-standard' },
  { type: 'clear-measurements' },
  { type: 'set-resistance', value: 3 },
  { type: 'set-voltage', value: 6 },
  { type: 'record', voltage: 6, resistance: 3, current: 6 / 3.02, power: 36 / 3.02 },
  { type: 'plot', x: 'U', y: 'I' },
];

describe('Python event replay', () => {
  it('drives the same SimulationRuntime as manual mode', async () => {
    const runtime = createOhmsLawRuntime();
    await replayPythonEvents(runtime, events);

    expect(runtime.getState().result.status).toBe('closed');
    expect(runtime.getState().result.current).toBeCloseTo(6 / 3.02, 8);
    expect(runtime.measurements.all()).toHaveLength(1);
    expect(runtime.measurements.all()[0]?.voltage).toBe(6);
    expect(runtime.measurements.all()[0]?.resistance).toBe(3);
  });
});
