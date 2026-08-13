import { describe, expect, it } from 'vitest';
import {
  clampInstrumentAnchor,
  instrumentFromNodeName,
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
});
