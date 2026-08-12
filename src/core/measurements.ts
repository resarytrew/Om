import type { SimulationResult } from './types';

export interface MeasurementRow {
  readonly id: number;
  readonly timestamp: number;
  readonly voltage: number;
  readonly current: number;
  readonly resistance: number;
  readonly power: number;
}

export class MeasurementStore {
  private rows: MeasurementRow[] = [];
  private nextId = 1;

  record(result: SimulationResult, resistance: number): MeasurementRow {
    const row: MeasurementRow = {
      id: this.nextId++,
      timestamp: Date.now(),
      voltage: result.sourceVoltage,
      current: result.current,
      resistance,
      power: result.power,
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
