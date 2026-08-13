import { describe, expect, it } from 'vitest';
import {
  BENCH_BOUNDS,
  clampInstrumentAnchor,
  instrumentFromNodeName,
  instrumentHalfExtents,
  normalizeInstrumentRotation,
  smoothInstrumentRotation,
  STANDARD_INSTRUMENT_ANCHORS,
} from '../src/rendering/babylon/InstrumentPlacement';

describe('instrument placement', () => {
  it('recognizes meshes belonging to every Ohm-law instrument', () => {
    expect(instrumentFromNodeName('source-front-panel')).toBe('source');
    expect(instrumentFromNodeName('terminal:source-01:+')).toBe('source');
    expect(instrumentFromNodeName('power-resistor-body')).toBe('resistor');
    expect(instrumentFromNodeName('resistor-02-body')).toBe('resistor-02');
    expect(instrumentFromNodeName('resistor-03-base')).toBe('resistor-03');
    expect(instrumentFromNodeName('resistor-04-label')).toBe('resistor-04');
    expect(instrumentFromNodeName('switch-01-lever')).toBe('switch');
    expect(instrumentFromNodeName('lamp-01-bulb')).toBe('lamp');
    expect(instrumentFromNodeName('ammeter-dial-glass')).toBe('ammeter');
    expect(instrumentFromNodeName('voltmeter-needle-pivot')).toBe('voltmeter');
    expect(instrumentFromNodeName('bench-mat')).toBeNull();
  });

  it('keeps instrument anchors inside the expanded usable bench area', () => {
    const source = clampInstrumentAnchor('source', { x: -100, z: 100 });
    expect(source.x).toBeGreaterThan(BENCH_BOUNDS.minX);
    expect(source.z).toBeLessThan(BENCH_BOUNDS.maxZ);

    const resistor = clampInstrumentAnchor('resistor', STANDARD_INSTRUMENT_ANCHORS.resistor);
    expect(resistor).toEqual(STANDARD_INSTRUMENT_ANCHORS.resistor);

    for (const id of ['resistor-02', 'resistor-03', 'resistor-04', 'switch', 'lamp'] as const) {
      expect(clampInstrumentAnchor(id, STANDARD_INSTRUMENT_ANCHORS[id])).toEqual(STANDARD_INSTRUMENT_ANCHORS[id]);
    }
  });

  it('expands the axis-aligned footprint when an instrument is rotated', () => {
    const flat = instrumentHalfExtents('source', 0);
    const quarter = instrumentHalfExtents('source', Math.PI / 2);
    expect(quarter.x).toBeCloseTo(flat.z, 6);
    expect(quarter.z).toBeCloseTo(flat.x, 6);

    const diagonal = instrumentHalfExtents('source', Math.PI / 4);
    expect(diagonal.x).toBeGreaterThan(flat.z);
    expect(diagonal.z).toBeGreaterThan(flat.z);
  });

  it('normalizes arbitrary rotation angles and clamps using the rotated footprint', () => {
    expect(normalizeInstrumentRotation(Math.PI * 3)).toBeCloseTo(Math.PI, 6);
    expect(normalizeInstrumentRotation(Number.NaN)).toBe(0);

    const rotated = clampInstrumentAnchor('ammeter', { x: 100, z: -100 }, Math.PI / 2);
    expect(rotated.x).toBeLessThan(BENCH_BOUNDS.maxX);
    expect(rotated.z).toBeGreaterThan(BENCH_BOUNDS.minZ);
  });

  it('smoothly approaches a target rotation without jumping across the wrap boundary', () => {
    const current = Math.PI - 0.08;
    const target = -Math.PI + 0.08;
    const next = smoothInstrumentRotation(current, target, 1 / 60, 11);
    const travelled = Math.abs(normalizeInstrumentRotation(next - current));
    expect(travelled).toBeGreaterThan(0);
    expect(travelled).toBeLessThan(0.08);

    let value = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      value = smoothInstrumentRotation(value, Math.PI / 2, 1 / 60, 11);
    }
    expect(value).toBeCloseTo(Math.PI / 2, 3);
  });
});
