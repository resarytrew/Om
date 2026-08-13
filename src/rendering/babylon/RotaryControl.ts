export const ROTARY_SWEEP = Math.PI * 1.5;
const HALF_SWEEP = ROTARY_SWEEP / 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeAngleDelta(delta: number): number {
  let normalized = delta;
  while (normalized > Math.PI) normalized -= Math.PI * 2;
  while (normalized < -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

export function clampRotaryTravel(
  startValue: number,
  travel: number,
  maxValue = 12,
): number {
  const safeMax = Math.max(maxValue, Number.EPSILON);
  const clampedStart = clamp(startValue, 0, safeMax);
  const minTravel = -(clampedStart / safeMax) * ROTARY_SWEEP;
  const maxTravel = ((safeMax - clampedStart) / safeMax) * ROTARY_SWEEP;
  return clamp(travel, minTravel, maxTravel);
}

export function rotaryTravelToValue(
  startValue: number,
  travel: number,
  maxValue = 12,
): number {
  const safeMax = Math.max(maxValue, Number.EPSILON);
  const clampedTravel = clampRotaryTravel(startValue, travel, safeMax);
  return clamp(startValue + (clampedTravel / ROTARY_SWEEP) * safeMax, 0, safeMax);
}

export function valueToKnobRotation(value: number, maxValue = 12): number {
  const safeMax = Math.max(maxValue, Number.EPSILON);
  const ratio = clamp(value / safeMax, 0, 1);
  // The index mark travels clockwise from about 7:30 to 4:30 over 270°.
  return HALF_SWEEP - ratio * ROTARY_SWEEP;
}
