import { CircuitModel } from '../../core/circuit';
import { SimulationRuntime } from '../../core/simulation';
import {
  componentId,
  terminalId,
  type AmmeterComponent,
  type ResistorComponent,
  type Terminal,
  type VoltageSourceComponent,
  type VoltmeterComponent,
} from '../../core/types';

export const ids = {
  source: componentId('source-01'),
  sourcePlus: terminalId('source-01:+'),
  sourceMinus: terminalId('source-01:-'),
  resistor: componentId('resistor-01'),
  resistorA: terminalId('resistor-01:a'),
  resistorB: terminalId('resistor-01:b'),
  ammeter: componentId('ammeter-01'),
  ammeterPlus: terminalId('ammeter-01:+'),
  ammeterMinus: terminalId('ammeter-01:-'),
  voltmeter: componentId('voltmeter-01'),
  voltmeterPlus: terminalId('voltmeter-01:+'),
  voltmeterMinus: terminalId('voltmeter-01:-'),
} as const;

function terminals(): Terminal[] {
  return [
    { id: ids.sourcePlus, componentId: ids.source, label: '+', polarity: 'positive' },
    { id: ids.sourceMinus, componentId: ids.source, label: '−', polarity: 'negative' },
    { id: ids.resistorA, componentId: ids.resistor, label: 'A', polarity: 'neutral' },
    { id: ids.resistorB, componentId: ids.resistor, label: 'B', polarity: 'neutral' },
    { id: ids.ammeterPlus, componentId: ids.ammeter, label: 'A', polarity: 'positive' },
    { id: ids.ammeterMinus, componentId: ids.ammeter, label: 'COM', polarity: 'negative' },
    { id: ids.voltmeterPlus, componentId: ids.voltmeter, label: 'V', polarity: 'positive' },
    { id: ids.voltmeterMinus, componentId: ids.voltmeter, label: 'COM', polarity: 'negative' },
  ];
}

export function createOhmsLawRuntime(): SimulationRuntime {
  const circuit = new CircuitModel();
  const allTerminals = terminals();
  const byComponent = (id: string) => allTerminals.filter((terminal) => terminal.componentId === id);

  const source: VoltageSourceComponent = {
    id: ids.source,
    kind: 'voltage-source',
    label: 'Источник',
    terminals: [ids.sourcePlus, ids.sourceMinus],
    voltage: 6,
    enabled: true,
    internalResistance: 0,
  };
  const resistor: ResistorComponent = {
    id: ids.resistor,
    kind: 'resistor',
    label: 'Резистор',
    terminals: [ids.resistorA, ids.resistorB],
    resistance: 3,
  };
  const ammeter: AmmeterComponent = {
    id: ids.ammeter,
    kind: 'ammeter',
    label: 'Амперметр',
    terminals: [ids.ammeterPlus, ids.ammeterMinus],
    range: 5,
    internalResistance: 0.02,
  };
  const voltmeter: VoltmeterComponent = {
    id: ids.voltmeter,
    kind: 'voltmeter',
    label: 'Вольтметр',
    terminals: [ids.voltmeterPlus, ids.voltmeterMinus],
    range: 12,
    internalResistance: 1_000_000,
  };

  circuit.addComponent(source, byComponent(source.id));
  circuit.addComponent(resistor, byComponent(resistor.id));
  circuit.addComponent(ammeter, byComponent(ammeter.id));
  circuit.addComponent(voltmeter, byComponent(voltmeter.id));

  return new SimulationRuntime(circuit);
}

export function connectStandardCircuit(runtime: SimulationRuntime): void {
  runtime.circuit.clearConnections();
  runtime.circuit.connect(ids.sourcePlus, ids.resistorA);
  runtime.circuit.connect(ids.resistorB, ids.ammeterPlus);
  runtime.circuit.connect(ids.ammeterMinus, ids.sourceMinus);
  runtime.circuit.connect(ids.voltmeterPlus, ids.resistorA);
  runtime.circuit.connect(ids.voltmeterMinus, ids.resistorB);
  runtime.recalculate();
}
