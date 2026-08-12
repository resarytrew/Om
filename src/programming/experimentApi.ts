import type { SimulationRuntime } from '../core/simulation';

export interface ExperimentApi {
  readonly source: {
    setVoltage(value: number): void;
  };
  readonly resistor: {
    setResistance(value: number): void;
  };
  readonly ammeter: {
    read(): number;
  };
  readonly experiment: {
    record(): void;
  };
}

export function createExperimentApi(runtime: SimulationRuntime): ExperimentApi {
  return {
    source: {
      setVoltage: (value) => runtime.setVoltage(value),
    },
    resistor: {
      setResistance: (value) => runtime.setResistance(value),
    },
    ammeter: {
      read: () => runtime.getState().result.current,
    },
    experiment: {
      record: () => runtime.captureMeasurement(),
    },
  };
}
