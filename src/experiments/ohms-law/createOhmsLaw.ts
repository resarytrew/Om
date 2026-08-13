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

export type InstrumentModel = 'ideal' | 'real';

export const OHM_INSTRUMENT_MODELS = {
  ideal: {
    sourceInternalResistance: 0,
    ammeterInternalResistance: 0,
    voltmeterInternalResistance: Number.POSITIVE_INFINITY,
  },
  real: {
    // A regulated school bench supply is treated as an ideal voltage source.
    // Non-ideal measurement is introduced by the meters themselves.
    sourceInternalResistance: 0,
    ammeterInternalResistance: 0.02,
    voltmeterInternalResistance: 1_000_000,
  },
} as const;

export function setOhmsLawInstrumentModel(runtime: SimulationRuntime, model: InstrumentModel): void {
  const config = OHM_INSTRUMENT_MODELS[model];
  const components = runtime.circuit.snapshot().components;
  const source = components.find((component): component is VoltageSourceComponent => component.kind === 'voltage-source');
  const ammeter = components.find((component): component is AmmeterComponent => component.kind === 'ammeter');
  const voltmeter = components.find((component): component is VoltmeterComponent => component.kind === 'voltmeter');

  if (source) source.internalResistance = config.sourceInternalResistance;
  if (ammeter) ammeter.internalResistance = config.ammeterInternalResistance;
  if (voltmeter) voltmeter.internalResistance = config.voltmeterInternalResistance;
  runtime.recalculate();
}

export function getOhmsLawInstrumentModel(runtime: SimulationRuntime): InstrumentModel {
  const ammeter = runtime.circuit
    .snapshot()
    .components.find((component): component is AmmeterComponent => component.kind === 'ammeter');
  return ammeter && ammeter.internalResistance > 0 ? 'real' : 'ideal';
}

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
    internalResistance: 0,
  };
  const voltmeter: VoltmeterComponent = {
    id: ids.voltmeter,
    kind: 'voltmeter',
    label: 'Вольтметр',
    terminals: [ids.voltmeterPlus, ids.voltmeterMinus],
    range: 12,
    internalResistance: Number.POSITIVE_INFINITY,
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
