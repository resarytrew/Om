export const METER_ZERO_ANGLE = 1.03;
export const METER_FULL_SCALE_ANGLE = -1.03;

export function meterNeedleAngle(value: number, range: number): number {
  const safeRange = Number.isFinite(range) && range > 0 ? range : 1;
  const safeValue = Number.isFinite(value) ? value : safeRange;
  const clamped = Math.min(safeRange, Math.max(0, safeValue));
  const ratio = clamped / safeRange;
  return METER_ZERO_ANGLE + (METER_FULL_SCALE_ANGLE - METER_ZERO_ANGLE) * ratio;
}

export function clampMeterAngle(angle: number): number {
  if (!Number.isFinite(angle)) return METER_ZERO_ANGLE;
  return Math.min(METER_ZERO_ANGLE, Math.max(METER_FULL_SCALE_ANGLE, angle));
}
