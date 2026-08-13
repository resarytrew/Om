import { CircuitModel } from '../../core/circuit';
import { SimulationRuntime } from '../../core/simulation';
import {
  componentId,
  terminalId,
  type AmmeterComponent,
  type LampComponent,
  type ResistorComponent,
  type SwitchComponent,
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
  resistor2: componentId('resistor-02'),
  resistor2A: terminalId('resistor-02:a'),
  resistor2B: terminalId('resistor-02:b'),
  resistor3: componentId('resistor-03'),
  resistor3A: terminalId('resistor-03:a'),
  resistor3B: terminalId('resistor-03:b'),
  resistor4: componentId('resistor-04'),
  resistor4A: terminalId('resistor-04:a'),
  resistor4B: terminalId('resistor-04:b'),
  lamp: componentId('lamp-01'),
  lampA: terminalId('lamp-01:a'),
  lampB: terminalId('lamp-01:b'),
  switch: componentId('switch-01'),
  switchA: terminalId('switch-01:a'),
  switchB: terminalId('switch-01:b'),
  ammeter: componentId('ammeter-01'),
  ammeterPlus: terminalId('ammeter-01:+'),
  ammeterMinus: terminalId('ammeter-01:-'),
  voltmeter: componentId('voltmeter-01'),
  voltmeterPlus: terminalId('voltmeter-01:+'),
  voltmeterMinus: terminalId('voltmeter-01:-'),
} as const;

export const OHM_RESISTOR_COMPONENTS = [
  { id: ids.resistor, a: ids.resistorA, b: ids.resistorB, instrument: 'resistor' },
  { id: ids.resistor2, a: ids.resistor2A, b: ids.resistor2B, instrument: 'resistor-02' },
  { id: ids.resistor3, a: ids.resistor3A, b: ids.resistor3B, instrument: 'resistor-03' },
  { id: ids.resistor4, a: ids.resistor4A, b: ids.resistor4B, instrument: 'resistor-04' },
] as const;

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
    { id: ids.resistor2A, componentId: ids.resistor2, label: 'A', polarity: 'neutral' },
    { id: ids.resistor2B, componentId: ids.resistor2, label: 'B', polarity: 'neutral' },
    { id: ids.resistor3A, componentId: ids.resistor3, label: 'A', polarity: 'neutral' },
    { id: ids.resistor3B, componentId: ids.resistor3, label: 'B', polarity: 'neutral' },
    { id: ids.resistor4A, componentId: ids.resistor4, label: 'A', polarity: 'neutral' },
    { id: ids.resistor4B, componentId: ids.resistor4, label: 'B', polarity: 'neutral' },
    { id: ids.lampA, componentId: ids.lamp, label: 'A', polarity: 'neutral' },
    { id: ids.lampB, componentId: ids.lamp, label: 'B', polarity: 'neutral' },
    { id: ids.switchA, componentId: ids.switch, label: 'A', polarity: 'neutral' },
    { id: ids.switchB, componentId: ids.switch, label: 'B', polarity: 'neutral' },
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
    label: 'Резистор R1',
    terminals: [ids.resistorA, ids.resistorB],
    resistance: 3,
  };
  const resistor2: ResistorComponent = {
    id: ids.resistor2,
    kind: 'resistor',
    label: 'Резистор R2',
    terminals: [ids.resistor2A, ids.resistor2B],
    resistance: 3,
  };
  const resistor3: ResistorComponent = {
    id: ids.resistor3,
    kind: 'resistor',
    label: 'Резистор R3',
    terminals: [ids.resistor3A, ids.resistor3B],
    resistance: 3,
  };
  const resistor4: ResistorComponent = {
    id: ids.resistor4,
    kind: 'resistor',
    label: 'Резистор R4',
    terminals: [ids.resistor4A, ids.resistor4B],
    resistance: 3,
  };
  const lamp: LampComponent = {
    id: ids.lamp,
    kind: 'lamp',
    label: 'Лампа',
    terminals: [ids.lampA, ids.lampB],
    resistance: 12,
    ratedVoltage: 6,
  };
  const circuitSwitch: SwitchComponent = {
    id: ids.switch,
    kind: 'switch',
    label: 'Ключ',
    terminals: [ids.switchA, ids.switchB],
    closed: false,
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
  circuit.addComponent(resistor2, byComponent(resistor2.id));
  circuit.addComponent(resistor3, byComponent(resistor3.id));
  circuit.addComponent(resistor4, byComponent(resistor4.id));
  circuit.addComponent(lamp, byComponent(lamp.id));
  circuit.addComponent(circuitSwitch, byComponent(circuitSwitch.id));
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
