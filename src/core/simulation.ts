import { CircuitModel } from './circuit';
import { MeasurementStore } from './measurements';
import { solveCircuit } from './solver';
import type {
  ConnectionId,
  SimulationResult,
  TerminalId,
  VoltageSourceComponent,
  ResistorComponent,
  AmmeterComponent,
  VoltmeterComponent,
} from './types';

export interface SimulationState {
  readonly result: SimulationResult;
  readonly selectedTerminal: TerminalId | null;
}

type Listener = (state: SimulationState) => void;

export class SimulationRuntime {
  readonly circuit: CircuitModel;
  readonly measurements = new MeasurementStore();
  private listeners = new Set<Listener>();
  private selectedTerminal: TerminalId | null = null;
  private state: SimulationState;

  constructor(circuit: CircuitModel) {
    this.circuit = circuit;
    this.state = { result: solveCircuit(circuit.snapshot()), selectedTerminal: null };
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): SimulationState {
    return this.state;
  }

  setVoltage(value: number): void {
    const source = this.circuit
      .snapshot()
      .components.find((component): component is VoltageSourceComponent => component.kind === 'voltage-source');
    if (!source) return;
    source.voltage = Math.min(12, Math.max(0, value));
    this.recalculate();
  }

  setSourceEnabled(enabled: boolean): void {
    const source = this.circuit
      .snapshot()
      .components.find((component): component is VoltageSourceComponent => component.kind === 'voltage-source');
    if (!source || source.enabled === enabled) return;
    source.enabled = enabled;
    this.recalculate();
  }

  setResistance(value: number): void {
    const resistor = this.circuit
      .snapshot()
      .components.find((component): component is ResistorComponent => component.kind === 'resistor');
    if (!resistor) return;
    resistor.resistance = Math.min(20, Math.max(0.5, value));
    this.recalculate();
  }

  chooseTerminal(terminal: TerminalId): void {
    if (!this.selectedTerminal) {
      this.selectedTerminal = terminal;
      this.publish();
      return;
    }
    if (this.selectedTerminal === terminal) {
      this.selectedTerminal = null;
      this.publish();
      return;
    }
    this.circuit.connect(this.selectedTerminal, terminal);
    this.selectedTerminal = null;
    this.recalculate();
  }

  cancelTerminalSelection(): void {
    if (!this.selectedTerminal) return;
    this.selectedTerminal = null;
    this.publish();
  }

  removeConnection(id: ConnectionId): void {
    this.circuit.disconnect(id);
    this.recalculate();
  }

  clearConnections(): void {
    this.circuit.clearConnections();
    this.selectedTerminal = null;
    this.recalculate();
  }

  captureMeasurement(): void {
    const result = this.state.result;
    if (result.status !== 'closed' || !Number.isFinite(result.current)) return;
    const components = this.circuit.snapshot().components;
    const resistor = components.find((component): component is ResistorComponent => component.kind === 'resistor');
    const ammeter = components.find((component): component is AmmeterComponent => component.kind === 'ammeter');
    const voltmeter = components.find((component): component is VoltmeterComponent => component.kind === 'voltmeter');
    if (!resistor) return;

    // A laboratory measurement records what the meters actually show. In the
    // ideal mode these values coincide with the source voltage and circuit current;
    // in the real mode they expose meter loading and ammeter burden resistance.
    const measuredVoltage = voltmeter
      ? result.measurements[voltmeter.id]?.voltage ?? result.sourceVoltage
      : result.sourceVoltage;
    const measuredCurrent = ammeter
      ? result.measurements[ammeter.id]?.current ?? result.current
      : result.current;
    this.measurements.record(result, resistor.resistance, {
      voltage: measuredVoltage,
      current: measuredCurrent,
      power: measuredVoltage * measuredCurrent,
    });
    this.publish();
  }

  clearMeasurements(): void {
    this.measurements.clear();
    this.publish();
  }

  recalculate(): void {
    this.state = {
      result: solveCircuit(this.circuit.snapshot()),
      selectedTerminal: this.selectedTerminal,
    };
    this.publish();
  }

  private publish(): void {
    this.state = { ...this.state, selectedTerminal: this.selectedTerminal };
    for (const listener of this.listeners) listener(this.state);
  }
}
