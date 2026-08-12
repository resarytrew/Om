import type { SimulationRuntime } from '../../core/simulation';
import type {
  AmmeterComponent,
  ResistorComponent,
  VoltageSourceComponent,
} from '../../core/types';
import type { PythonInitialState } from './protocol';

export function createPythonInitialState(runtime: SimulationRuntime): PythonInitialState {
  const snapshot = runtime.circuit.snapshot();
  const source = snapshot.components.find(
    (component): component is VoltageSourceComponent => component.kind === 'voltage-source',
  );
  const resistor = snapshot.components.find(
    (component): component is ResistorComponent => component.kind === 'resistor',
  );
  const ammeter = snapshot.components.find(
    (component): component is AmmeterComponent => component.kind === 'ammeter',
  );

  if (!source || !resistor || !ammeter) {
    throw new Error('Python mode requires a source, resistor, and ammeter.');
  }

  return {
    voltage: source.voltage,
    resistance: resistor.resistance,
    circuitStatus: runtime.getState().result.status,
    seriesResistanceOffset: source.internalResistance + ammeter.internalResistance,
    ammeterRange: ammeter.range,
  };
}
