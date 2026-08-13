import { describe, expect, it } from 'vitest';
import {
  ROTARY_SWEEP,
  clampRotaryTravel,
  normalizeAngleDelta,
  rotaryTravelToValue,
  valueToKnobRotation,
} from '../src/rendering/babylon/RotaryControl';

describe('rotary voltage control', () => {
  it('maps 0, midpoint and full scale across a 270 degree sweep', () => {
    expect(valueToKnobRotation(0)).toBeCloseTo(ROTARY_SWEEP / 2, 10);
    expect(valueToKnobRotation(6)).toBeCloseTo(0, 10);
    expect(valueToKnobRotation(12)).toBeCloseTo(-ROTARY_SWEEP / 2, 10);
  });

  it('increases value with clockwise pointer travel and clamps at the stops', () => {
    expect(rotaryTravelToValue(6, ROTARY_SWEEP / 4)).toBeCloseTo(9, 10);
    expect(rotaryTravelToValue(6, ROTARY_SWEEP)).toBeCloseTo(12, 10);
    expect(rotaryTravelToValue(6, -ROTARY_SWEEP)).toBeCloseTo(0, 10);
    expect(clampRotaryTravel(6, ROTARY_SWEEP)).toBeCloseTo(ROTARY_SWEEP / 2, 10);
  });

  it('normalizes wraparound angle changes without a sudden jump', () => {
    expect(normalizeAngleDelta(-Math.PI * 1.9)).toBeCloseTo(Math.PI * 0.1, 10);
    expect(normalizeAngleDelta(Math.PI * 1.9)).toBeCloseTo(-Math.PI * 0.1, 10);
  });
});
