import { describe, expect, it } from 'vitest';
import {
  clampInstrumentAnchor,
  instrumentFromNodeName,
  instrumentHalfExtents,
  normalizeInstrumentRotation,
  STANDARD_INSTRUMENT_ANCHORS,
} from '../src/rendering/babylon/InstrumentPlacement';

describe('instrument placement', () => {
  it('recognizes meshes belonging to every Ohm-law instrument', () => {
    expect(instrumentFromNodeName('source-front-panel')).toBe('source');
    expect(instrumentFromNodeName('terminal:source-01:+')).toBe('source');
    expect(instrumentFromNodeName('power-resistor-body')).toBe('resistor');
    expect(instrumentFromNodeName('ammeter-dial-glass')).toBe('ammeter');
    expect(instrumentFromNodeName('voltmeter-needle-pivot')).toBe('voltmeter');
    expect(instrumentFromNodeName('bench-mat')).toBeNull();
  });

  it('keeps instrument anchors inside the usable bench area', () => {
    const source = clampInstrumentAnchor('source', { x: -100, z: 100 });
    expect(source.x).toBeGreaterThan(-4.9);
    expect(source.z).toBeLessThan(2.72);

    const resistor = clampInstrumentAnchor('resistor', STANDARD_INSTRUMENT_ANCHORS.resistor);
    expect(resistor).toEqual(STANDARD_INSTRUMENT_ANCHORS.resistor);
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
    expect(rotated.x).toBeLessThan(4.9);
    expect(rotated.z).toBeGreaterThan(-1.78);
  });
});
