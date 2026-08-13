import { describe, expect, it } from 'vitest';
import {
  METER_FULL_SCALE_ANGLE,
  METER_ZERO_ANGLE,
  clampMeterAngle,
  meterNeedleAngle,
} from '../src/rendering/babylon/MeterScale';

describe('analog meter scale', () => {
  it('maps zero and full-scale readings to the mechanical end stops', () => {
    expect(meterNeedleAngle(0, 5)).toBeCloseTo(METER_ZERO_ANGLE, 8);
    expect(meterNeedleAngle(5, 5)).toBeCloseTo(METER_FULL_SCALE_ANGLE, 8);
  });

  it('maps a half-scale reading to the centre of the dial', () => {
    expect(meterNeedleAngle(2.5, 5)).toBeCloseTo(0, 8);
  });

  it('clamps readings outside the instrument range', () => {
    expect(meterNeedleAngle(-20, 5)).toBeCloseTo(METER_ZERO_ANGLE, 8);
    expect(meterNeedleAngle(20, 5)).toBeCloseTo(METER_FULL_SCALE_ANGLE, 8);
  });

  it('keeps invalid angles inside safe mechanical limits', () => {
    expect(clampMeterAngle(Number.NaN)).toBe(METER_ZERO_ANGLE);
    expect(clampMeterAngle(50)).toBe(METER_ZERO_ANGLE);
    expect(clampMeterAngle(-50)).toBe(METER_FULL_SCALE_ANGLE);
  });
});
