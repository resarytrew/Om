import { describe, expect, it } from 'vitest';
import { connectStandardCircuit, createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';

function closeSeriesCircuit(): ReturnType<typeof createOhmsLawRuntime> {
  const runtime = createOhmsLawRuntime();
  runtime.circuit.connect(ids.sourcePlus, ids.resistorA);
  runtime.circuit.connect(ids.resistorB, ids.ammeterPlus);
  runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
  runtime.recalculate();
  return runtime;
}

describe('Ohm circuit solver', () => {
  it('returns zero current for an open circuit', () => {
    const runtime = createOhmsLawRuntime();
    expect(runtime.getState().result.status).toBe('open');
    expect(runtime.getState().result.current).toBe(0);
  });

  it('solves a closed 6 V / 3 Ω series circuit', () => {
    const runtime = closeSeriesCircuit();
    const result = runtime.getState().result;
    expect(result.status).toBe('closed');
    expect(result.current).toBeCloseTo(6 / 3.02, 5);
    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(6 / 3.02, 5);
  });

  it('updates current when voltage and resistance change', () => {
    const runtime = closeSeriesCircuit();
    runtime.setVoltage(12);
    runtime.setResistance(6);
    expect(runtime.getState().result.current).toBeCloseTo(12 / 6.02, 5);
  });

  it('detects a direct short circuit path', () => {
    const runtime = createOhmsLawRuntime();
    runtime.circuit.connect(ids.sourcePlus, ids.ammeterPlus);
    runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
    runtime.recalculate();
    expect(runtime.getState().result.status).toBe('short-circuit');
    expect(runtime.getState().result.diagnostics.some((item) => item.code === 'SHORT_CIRCUIT')).toBe(true);
  });

  it('reads the voltmeter when connected in parallel with the resistor', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    const result = runtime.getState().result;
    expect(result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(result.current * 3, 5);
    expect(result.diagnostics.some((item) => item.code === 'VOLTMETER_NOT_PARALLEL')).toBe(false);
  });

  it('returns to zero current after a wire is removed', () => {
    const runtime = closeSeriesCircuit();
    const connection = runtime.circuit.snapshot().connections[0];
    expect(connection).toBeDefined();
    if (!connection) return;
    runtime.removeConnection(connection.id);
    expect(runtime.getState().result.status).toBe('open');
    expect(runtime.getState().result.current).toBe(0);
  });
});
