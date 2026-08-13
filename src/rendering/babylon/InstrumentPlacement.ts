export type InstrumentId = 'source' | 'resistor' | 'ammeter' | 'voltmeter';

export interface BenchPoint {
  readonly x: number;
  readonly z: number;
}

export const STANDARD_INSTRUMENT_ANCHORS: Record<InstrumentId, BenchPoint> = {
  source: { x: -3.35, z: 1.45 },
  resistor: { x: -0.7, z: -0.75 },
  ammeter: { x: 3.55, z: -0.35 },
  voltmeter: { x: 1.48, z: 1.72 },
};

const HALF_FOOTPRINT: Record<InstrumentId, BenchPoint> = {
  source: { x: 1.48, z: 0.92 },
  resistor: { x: 1.46, z: 0.72 },
  ammeter: { x: 1.16, z: 0.72 },
  voltmeter: { x: 1.08, z: 0.72 },
};

const BENCH = {
  minX: -4.9,
  maxX: 4.9,
  minZ: -1.78,
  maxZ: 2.72,
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampInstrumentAnchor(id: InstrumentId, point: BenchPoint): BenchPoint {
  const half = HALF_FOOTPRINT[id];
  return {
    x: clamp(point.x, BENCH.minX + half.x, BENCH.maxX - half.x),
    z: clamp(point.z, BENCH.minZ + half.z, BENCH.maxZ - half.z),
  };
}

export function instrumentFromNodeName(name: string): InstrumentId | null {
  if (name.includes('source-01') || name.startsWith('source-')) return 'source';
  if (name.includes('resistor-01') || name.startsWith('resistor-') || name.startsWith('power-resistor-')) return 'resistor';
  if (name.includes('ammeter-01') || name.startsWith('ammeter-')) return 'ammeter';
  if (name.includes('voltmeter-01') || name.startsWith('voltmeter-')) return 'voltmeter';
  return null;
}
