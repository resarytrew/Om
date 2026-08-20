import { describe, expect, it } from 'vitest';
import { createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';
import { referenceCircuitConnections } from '../src/experiments/ohms-law/referenceCircuits';

function build(mode: 'series' | 'parallel') {
  const runtime = createOhmsLawRuntime();
  for (const [from, to] of referenceCircuitConnections(mode)) {
    runtime.circuit.connect(from, to);
  }
  runtime.recalculate();
  return runtime;
}

describe('reference Ohm circuits', () => {
  it('builds two 3 Ω resistors in series', () => {
    const runtime = build('series');
    const result = runtime.getState().result;
    expect(result.status).toBe('closed');
    expect(result.equivalentResistance).toBeCloseTo(6, 8);
    expect(result.current).toBeCloseTo(1, 8);
    expect(result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(6, 8);
  });

  it('builds two 3 Ω resistors in parallel', () => {
    const runtime = build('parallel');
    const result = runtime.getState().result;
    expect(result.status).toBe('closed');
    expect(result.equivalentResistance).toBeCloseTo(1.5, 8);
    expect(result.current).toBeCloseTo(4, 8);
    expect(result.measurements[ids.resistor]?.current).toBeCloseTo(2, 8);
    expect(result.measurements[ids.resistor2]?.current).toBeCloseTo(2, 8);
    expect(result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(6, 8);
  });
});
