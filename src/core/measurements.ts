import type { SimulationResult } from './types';

export interface MeasurementRow {
  readonly id: number;
  readonly timestamp: number;
  readonly voltage: number;
  readonly current: number;
  readonly resistance: number;
  readonly power: number;
}

export interface MeasurementOverride {
  readonly voltage?: number;
  readonly current?: number;
  readonly power?: number;
}

export class MeasurementStore {
  private rows: MeasurementRow[] = [];
  private nextId = 1;

  record(result: SimulationResult, resistance: number, override: MeasurementOverride = {}): MeasurementRow {
    const voltage = override.voltage ?? result.sourceVoltage;
    const current = override.current ?? result.current;
    const row: MeasurementRow = {
      id: this.nextId++,
      timestamp: Date.now(),
      voltage,
      current,
      resistance,
      power: override.power ?? voltage * current,
    };
    this.rows = [...this.rows, row];
    return row;
  }

  clear(): void {
    this.rows = [];
    this.nextId = 1;
  }

  all(): readonly MeasurementRow[] {
    return this.rows;
  }
}
