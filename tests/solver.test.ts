import { describe, expect, it } from 'vitest';
import {
  connectStandardCircuit,
  createOhmsLawRuntime,
  ids,
  setOhmsLawInstrumentModel,
} from '../src/experiments/ohms-law/createOhmsLaw';

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
    expect(result.current).toBeCloseTo(6 / 3, 8);
    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(6 / 3, 8);
  });

  it('updates current when voltage and resistance change', () => {
    const runtime = closeSeriesCircuit();
    runtime.setVoltage(12);
    runtime.setResistance(6);
    expect(runtime.getState().result.current).toBeCloseTo(12 / 6, 8);
  });

  it('turns source output off without forgetting the voltage setpoint', () => {
    const runtime = closeSeriesCircuit();
    runtime.setVoltage(9);
    expect(runtime.getState().result.current).toBeCloseTo(3, 8);

    runtime.setSourceEnabled(false);
    expect(runtime.getState().result.current).toBe(0);
    expect(runtime.getState().result.sourceVoltage).toBe(9);

    runtime.setSourceEnabled(true);
    expect(runtime.getState().result.current).toBeCloseTo(3, 8);
    expect(runtime.getState().result.sourceVoltage).toBe(9);
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

  it('models finite meter resistance in real-instrument mode', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    runtime.setVoltage(12);
    runtime.setResistance(3);
    setOhmsLawInstrumentModel(runtime, 'real');

    const parallelLoad = 1 / (1 / 3 + 1 / 1_000_000);
    const expectedCurrent = 12 / (parallelLoad + 0.02);
    const expectedVoltage = expectedCurrent * parallelLoad;
    const result = runtime.getState().result;

    expect(result.current).toBeCloseTo(expectedCurrent, 8);
    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(expectedCurrent, 8);
    expect(result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(expectedVoltage, 8);
    expect(result.measurements[ids.resistor]?.current).toBeCloseTo(expectedVoltage / 3, 8);

    runtime.captureMeasurement();
    const row = runtime.measurements.all()[0];
    expect(row?.voltage).toBeCloseTo(expectedVoltage, 8);
    expect(row?.current).toBeCloseTo(expectedCurrent, 8);
  });

  it('returns to exact school-model values after switching back to ideal instruments', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    runtime.setVoltage(12);
    runtime.setResistance(3);
    setOhmsLawInstrumentModel(runtime, 'real');
    setOhmsLawInstrumentModel(runtime, 'ideal');
    expect(runtime.getState().result.current).toBeCloseTo(4, 10);
    expect(runtime.getState().result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(12, 10);
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

  it('adds several resistors to one real series circuit', () => {
    const runtime = createOhmsLawRuntime();
    runtime.circuit.connect(ids.sourcePlus, ids.resistorA);
    runtime.circuit.connect(ids.resistorB, ids.resistor2A);
    runtime.circuit.connect(ids.resistor2B, ids.ammeterPlus);
    runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
    runtime.recalculate();
    expect(runtime.getState().result.status).toBe('closed');
    expect(runtime.getState().result.current).toBeCloseTo(1, 8);
    expect(runtime.getState().result.equivalentResistance).toBeCloseTo(6, 8);
  });

  it('uses the key to physically open and close the series branch', () => {
    const runtime = createOhmsLawRuntime();
    runtime.circuit.connect(ids.sourcePlus, ids.switchA);
    runtime.circuit.connect(ids.switchB, ids.resistorA);
    runtime.circuit.connect(ids.resistorB, ids.ammeterPlus);
    runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
    runtime.recalculate();
    expect(runtime.getState().result.status).toBe('open');

    const key = runtime.circuit.snapshot().components.find((component) => component.id === ids.switch);
    expect(key?.kind).toBe('switch');
    if (key?.kind !== 'switch') return;
    key.closed = true;
    runtime.recalculate();
    expect(runtime.getState().result.status).toBe('closed');
    expect(runtime.getState().result.current).toBeCloseTo(2, 8);
  });

  it('treats the lamp as an electrical load', () => {
    const runtime = createOhmsLawRuntime();
    runtime.circuit.connect(ids.sourcePlus, ids.lampA);
    runtime.circuit.connect(ids.lampB, ids.ammeterPlus);
    runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
    runtime.recalculate();
    const result = runtime.getState().result;
    expect(result.status).toBe('closed');
    expect(result.current).toBeCloseTo(0.5, 8);
    expect(result.measurements[ids.lamp]?.voltage).toBeCloseTo(6, 8);
    expect(result.measurements[ids.lamp]?.power).toBeCloseTo(3, 8);
  });
});
