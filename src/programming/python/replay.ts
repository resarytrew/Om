import type { SimulationRuntime } from '../../core/simulation';
import { connectStandardCircuit } from '../../experiments/ohms-law/createOhmsLaw';
import type { PythonLabEvent } from './protocol';

export interface ReplayOptions {
  readonly signal?: AbortSignal;
  readonly onEvent?: (event: PythonLabEvent) => void;
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}

export async function replayPythonEvents(
  runtime: SimulationRuntime,
  events: readonly PythonLabEvent[],
  options: ReplayOptions = {},
): Promise<void> {
  for (const event of events) {
    if (options.signal?.aborted) return;
    options.onEvent?.(event);

    switch (event.type) {
      case 'connect-standard':
        connectStandardCircuit(runtime);
        break;
      case 'clear-measurements':
        runtime.clearMeasurements();
        break;
      case 'set-voltage':
        runtime.setVoltage(event.value);
        break;
      case 'set-resistance':
        runtime.setResistance(event.value);
        break;
      case 'wait':
        await delay(Math.round(event.seconds * 1000), options.signal);
        break;
      case 'record':
        runtime.captureMeasurement();
        break;
      case 'plot':
        break;
    }
  }
}

export function describePythonEvent(event: PythonLabEvent): string {
  switch (event.type) {
    case 'connect-standard':
      return 'experiment.connect_standard()';
    case 'clear-measurements':
      return 'experiment.clear_measurements()';
    case 'set-voltage':
      return `source.voltage = ${event.value.toFixed(2)} V`;
    case 'set-resistance':
      return `resistor.resistance = ${event.value.toFixed(2)} Ω`;
    case 'wait':
      return `wait(${event.seconds.toFixed(2)} s)`;
    case 'record':
      return `record U=${event.voltage.toFixed(2)} V · I=${event.current.toFixed(3)} A`;
    case 'plot':
      return `plot ${event.y}(${event.x})`;
  }
}
