export type InstrumentId =
  | 'source'
  | 'resistor'
  | 'resistor-02'
  | 'resistor-03'
  | 'resistor-04'
  | 'switch'
  | 'lamp'
  | 'ammeter'
  | 'voltmeter';

export interface BenchPoint {
  readonly x: number;
  readonly z: number;
}

export const STANDARD_INSTRUMENT_ANCHORS: Record<InstrumentId, BenchPoint> = {
  source: { x: -3.35, z: 1.45 },
  resistor: { x: -0.7, z: -0.75 },
  'resistor-02': { x: 2.05, z: -2.35 },
  'resistor-03': { x: -3.85, z: -2.35 },
  'resistor-04': { x: 5.0, z: -2.35 },
  switch: { x: -0.7, z: 3.0 },
  lamp: { x: 5.2, z: 2.55 },
  ammeter: { x: 3.55, z: -0.35 },
  voltmeter: { x: 1.48, z: 1.72 },
};

const HALF_FOOTPRINT: Record<InstrumentId, BenchPoint> = {
  source: { x: 1.48, z: 0.92 },
  resistor: { x: 1.46, z: 0.72 },
  'resistor-02': { x: 1.08, z: 0.62 },
  'resistor-03': { x: 1.08, z: 0.62 },
  'resistor-04': { x: 1.08, z: 0.62 },
  switch: { x: 1.0, z: 0.68 },
  lamp: { x: 0.92, z: 0.82 },
  ammeter: { x: 1.16, z: 0.72 },
  voltmeter: { x: 1.08, z: 0.72 },
};

export const BENCH_BOUNDS = {
  minX: -6.6,
  maxX: 6.6,
  minZ: -3.55,
  maxZ: 3.72,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeInstrumentRotation(angle: number): number {
  if (!Number.isFinite(angle)) return 0;
  let normalized = angle % (Math.PI * 2);
  if (normalized > Math.PI) normalized -= Math.PI * 2;
  if (normalized <= -Math.PI) normalized += Math.PI * 2;
  return normalized;
}

export function smoothInstrumentRotation(
  current: number,
  target: number,
  dt: number,
  responsiveness = 11,
): number {
  const normalizedCurrent = normalizeInstrumentRotation(current);
  const normalizedTarget = normalizeInstrumentRotation(target);
  const delta = normalizeInstrumentRotation(normalizedTarget - normalizedCurrent);
  if (Math.abs(delta) < 1e-4) return normalizedTarget;
  const factor = 1 - Math.exp(-Math.max(0, dt) * Math.max(0.1, responsiveness));
  return normalizeInstrumentRotation(normalizedCurrent + delta * factor);
}

export function instrumentHalfExtents(id: InstrumentId, rotationY = 0): BenchPoint {
  const half = HALF_FOOTPRINT[id];
  const angle = normalizeInstrumentRotation(rotationY);
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return {
    x: half.x * c + half.z * s,
    z: half.x * s + half.z * c,
  };
}

export function clampInstrumentAnchor(id: InstrumentId, point: BenchPoint, rotationY = 0): BenchPoint {
  const half = instrumentHalfExtents(id, rotationY);
  return {
    x: clamp(point.x, BENCH_BOUNDS.minX + half.x, BENCH_BOUNDS.maxX - half.x),
    z: clamp(point.z, BENCH_BOUNDS.minZ + half.z, BENCH_BOUNDS.maxZ - half.z),
  };
}

export function instrumentFromNodeName(name: string): InstrumentId | null {
  if (name.includes('resistor-04')) return 'resistor-04';
  if (name.includes('resistor-03')) return 'resistor-03';
  if (name.includes('resistor-02')) return 'resistor-02';
  if (name.includes('switch-01') || name.startsWith('switch-')) return 'switch';
  if (name.includes('lamp-01') || name.startsWith('lamp-')) return 'lamp';
  if (name.includes('source-01') || name.startsWith('source-')) return 'source';
  if (name.includes('resistor-01') || name.startsWith('resistor-') || name.startsWith('power-resistor-')) return 'resistor';
  if (name.includes('ammeter-01') || name.startsWith('ammeter-')) return 'ammeter';
  if (name.includes('voltmeter-01') || name.startsWith('voltmeter-')) return 'voltmeter';
  return null;
}
