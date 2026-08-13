import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      throw new Error(`Missing fragment in ${path}: ${from.slice(0, 180)}`);
    }
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/experiments/ohms-law/createOhmsLaw.ts', [
  [
`export const ids = {
  source: componentId('source-01'),`,
`export const ids = {
  source: componentId('source-01'),`,
  ],
  [
`} as const;

function terminals(): Terminal[] {`,
`} as const;

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

function terminals(): Terminal[] {`,
  ],
  ['    internalResistance: 0.02,', '    internalResistance: 0,'],
  ['    internalResistance: 1_000_000,', '    internalResistance: Number.POSITIVE_INFINITY,'],
]);

patch('src/core/solver.ts', [
  [
`  const totalResistance =
    resistors.reduce((sum, resistor) => sum + Math.max(resistor.resistance, 1e-9), 0) +
    ammeters.reduce((sum, ammeter) => sum + Math.max(ammeter.internalResistance, 0), 0) +
    Math.max(source.internalResistance, 0);
  const current = source.voltage / totalResistance;
  const power = source.voltage * current;

  for (const resistor of resistors) {
    measurements[resistor.id] = {
      current,
      voltage: current * resistor.resistance,
      power: current * current * resistor.resistance,
    };
  }`,
`  const nodes = wireNodes(snapshot);
  const voltmeters = snapshot.components.filter((component): component is VoltmeterComponent => component.kind === 'voltmeter');
  const targetResistor = resistors[0];
  const parallelVoltmeters = targetResistor
    ? voltmeters.filter((voltmeter) => isAcross(voltmeter, targetResistor, nodes))
    : [];

  // The first resistor is the measured load in the Ohm-law experiment. A real
  // voltmeter is a finite resistance connected in parallel with that load.
  // An ideal voltmeter has R = Infinity and therefore contributes zero conductance.
  const targetConductance = targetResistor
    ? 1 / Math.max(targetResistor.resistance, 1e-9) + parallelVoltmeters.reduce((sum, voltmeter) => {
        if (!Number.isFinite(voltmeter.internalResistance)) return sum;
        return sum + 1 / Math.max(voltmeter.internalResistance, 1e-9);
      }, 0)
    : 0;
  const targetEquivalentResistance = targetResistor && targetConductance > 0
    ? 1 / targetConductance
    : 0;
  const remainingSeriesResistance = resistors
    .slice(1)
    .reduce((sum, resistor) => sum + Math.max(resistor.resistance, 1e-9), 0);
  const totalResistance =
    targetEquivalentResistance +
    remainingSeriesResistance +
    ammeters.reduce((sum, ammeter) => sum + Math.max(ammeter.internalResistance, 0), 0) +
    Math.max(source.internalResistance, 0);
  const current = source.voltage / totalResistance;
  const power = source.voltage * current;
  const targetVoltage = targetResistor ? current * targetEquivalentResistance : 0;

  for (const [index, resistor] of resistors.entries()) {
    const voltage = index === 0 ? targetVoltage : current * resistor.resistance;
    const resistorCurrent = voltage / Math.max(resistor.resistance, 1e-9);
    measurements[resistor.id] = {
      current: resistorCurrent,
      voltage,
      power: voltage * resistorCurrent,
    };
  }`,
  ],
  [
`  const nodes = wireNodes(snapshot);
  const voltmeters = snapshot.components.filter((component): component is VoltmeterComponent => component.kind === 'voltmeter');
  const targetResistor = resistors[0];
  for (const voltmeter of voltmeters) {
    if (targetResistor && isAcross(voltmeter, targetResistor, nodes)) {
      measurements[voltmeter.id] = { voltage: current * targetResistor.resistance };
    } else {`,
`  for (const voltmeter of voltmeters) {
    if (targetResistor && isAcross(voltmeter, targetResistor, nodes)) {
      measurements[voltmeter.id] = { voltage: targetVoltage };
    } else {`,
  ],
]);

patch('src/core/measurements.ts', [
  [
`export class MeasurementStore {
  private rows: MeasurementRow[] = [];`,
`export interface MeasurementOverride {
  readonly voltage?: number;
  readonly current?: number;
  readonly power?: number;
}

export class MeasurementStore {
  private rows: MeasurementRow[] = [];`,
  ],
  [
`  record(result: SimulationResult, resistance: number): MeasurementRow {
    const row: MeasurementRow = {
      id: this.nextId++,
      timestamp: Date.now(),
      voltage: result.sourceVoltage,
      current: result.current,
      resistance,
      power: result.power,
    };`,
`  record(result: SimulationResult, resistance: number, override: MeasurementOverride = {}): MeasurementRow {
    const voltage = override.voltage ?? result.sourceVoltage;
    const current = override.current ?? result.current;
    const row: MeasurementRow = {
      id: this.nextId++,
      timestamp: Date.now(),
      voltage,
      current,
      resistance,
      power: override.power ?? voltage * current,
    };`,
  ],
]);

patch('src/core/simulation.ts', [
  [
`  VoltageSourceComponent,
  ResistorComponent,
} from './types';`,
`  VoltageSourceComponent,
  ResistorComponent,
  AmmeterComponent,
  VoltmeterComponent,
} from './types';`,
  ],
  [
`  captureMeasurement(): void {
    const result = this.state.result;
    if (result.status !== 'closed' || !Number.isFinite(result.current)) return;
    const resistor = this.circuit
      .snapshot()
      .components.find((component): component is ResistorComponent => component.kind === 'resistor');
    if (!resistor) return;
    this.measurements.record(result, resistor.resistance);
    this.publish();
  }`,
`  captureMeasurement(): void {
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
  }`,
  ],
]);

patch('src/ui/renderApp.ts', [
  [
`import { connectStandardCircuit } from '../experiments/ohms-law/createOhmsLaw';`,
`import {
  connectStandardCircuit,
  getOhmsLawInstrumentModel,
  setOhmsLawInstrumentModel,
  type InstrumentModel,
} from '../experiments/ohms-law/createOhmsLaw';`,
  ],
  [
`          <div class="range-label"><span>0.5 Ω</span><span>20 Ω</span></div>
          <div class="button-stack">`,
`          <div class="range-label"><span>0.5 Ω</span><span>20 Ω</span></div>
          <div class="instrument-model-card">
            <div class="instrument-model-head">
              <span><b>Модель приборов</b><small>Погрешность измерительной цепи</small></span>
            </div>
            <div class="instrument-model-toggle" role="group" aria-label="Модель измерительных приборов">
              <button type="button" class="instrument-model-button active" data-instrument-model="ideal" aria-pressed="true">Идеальные</button>
              <button type="button" class="instrument-model-button" data-instrument-model="real" aria-pressed="false">Реальные</button>
            </div>
            <div id="instrument-model-note" class="instrument-model-note">Rₐ = 0 Ω · Rᵥ = ∞ · U и I соответствуют идеальной модели.</div>
          </div>
          <div class="button-stack">`,
  ],
  [
`  resistance.addEventListener('input', () => runtime.setResistance(Number(resistance.value)));
  preset.addEventListener('click', () => connectStandardCircuit(runtime));`,
`  resistance.addEventListener('input', () => runtime.setResistance(Number(resistance.value)));
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-instrument-model]')) {
    button.addEventListener('click', () => {
      const nextModel = button.dataset.instrumentModel as InstrumentModel | undefined;
      if (!nextModel || nextModel === getOhmsLawInstrumentModel(runtime)) return;
      setOhmsLawInstrumentModel(runtime, nextModel);
      runtime.clearMeasurements();
    });
  }
  preset.addEventListener('click', () => connectStandardCircuit(runtime));`,
  ],
  [
`  if (resistanceOutput) resistanceOutput.value = \`${fmt(resistanceValue)} Ω\`;

  const status = root.querySelector<HTMLElement>('#circuit-status');`,
`  if (resistanceOutput) resistanceOutput.value = \`${fmt(resistanceValue)} Ω\`;

  const instrumentModel = getOhmsLawInstrumentModel(runtime);
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-instrument-model]')) {
    const active = button.dataset.instrumentModel === instrumentModel;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
  const modelNote = root.querySelector<HTMLElement>('#instrument-model-note');
  if (modelNote) {
    modelNote.textContent = instrumentModel === 'ideal'
      ? 'Rₐ = 0 Ω · Rᵥ = ∞ · основной учебный режим: I = U / R.'
      : 'Rₐ = 0.02 Ω · Rᵥ = 1 МОм · учитывается нагрузка вольтметра и сопротивление амперметра.';
  }

  const status = root.querySelector<HTMLElement>('#circuit-status');`,
  ],
  [
`  const terminal = root.querySelector<HTMLElement>('#terminal-lines');
  if (terminal) {
    const last = rows.at(-1);
    terminal.innerHTML = [
      \`<div><span>&gt;</span> circuit.status <b>\${state.result.status}</b></div>\`,
      \`<div><span>&gt;</span> source.voltage <b>\${fmt(voltageValue)} V</b></div>\`,
      \`<div><span>&gt;</span> resistor.resistance <b>\${fmt(resistanceValue)} Ω</b></div>\`,
      \`<div><span>&gt;</span> ammeter.read() <b>\${Number.isFinite(state.result.current) ? \`\${fmt(state.result.current, 3)} A\` : 'OVERLOAD'}</b></div>\`,`,
`  const terminal = root.querySelector<HTMLElement>('#terminal-lines');
  if (terminal) {
    const last = rows.at(-1);
    const ammeter = snapshot.components.find((component) => component.kind === 'ammeter');
    const voltmeter = snapshot.components.find((component) => component.kind === 'voltmeter');
    const ammeterValue = ammeter ? state.result.measurements[ammeter.id]?.current ?? state.result.current : state.result.current;
    const voltmeterValue = voltmeter ? state.result.measurements[voltmeter.id]?.voltage ?? 0 : 0;
    terminal.innerHTML = [
      \`<div><span>&gt;</span> instruments.model <b>\${instrumentModel}</b></div>\`,
      \`<div><span>&gt;</span> circuit.status <b>\${state.result.status}</b></div>\`,
      \`<div><span>&gt;</span> source.voltage <b>\${fmt(voltageValue)} V</b></div>\`,
      \`<div><span>&gt;</span> resistor.resistance <b>\${fmt(resistanceValue)} Ω</b></div>\`,
      \`<div><span>&gt;</span> voltmeter.read() <b>\${fmt(voltmeterValue, 3)} V</b></div>\`,
      \`<div><span>&gt;</span> ammeter.read() <b>\${Number.isFinite(ammeterValue) ? \`\${fmt(ammeterValue, 3)} A\` : 'OVERLOAD'}</b></div>\`,`,
  ],
]);

patch('src/styles.css', [
  [
`.button-stack { display: grid; gap: 9px; margin-top: 30px; }`,
`.instrument-model-card {
  margin-top: 24px;
  padding: 14px;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: #10151a;
}
.instrument-model-head span { display: grid; gap: 3px; }
.instrument-model-head b { font-size: 13px; color: #d7dfe4; }
.instrument-model-head small { color: var(--muted); font-size: 11px; }
.instrument-model-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-top: 11px;
  padding: 4px;
  border: 1px solid #29343d;
  border-radius: 8px;
  background: #0b1014;
}
.instrument-model-button {
  min-height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #84919b;
  cursor: pointer;
  font-size: 12px;
}
.instrument-model-button.active {
  border-color: #315a6a;
  background: #142831;
  color: #c9f2ff;
}
.instrument-model-note {
  margin-top: 10px;
  color: #7f8c95;
  font: 10.5px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
}
.button-stack { display: grid; gap: 9px; margin-top: 22px; }`,
  ],
]);

patch('tests/solver.test.ts', [
  [
`import { connectStandardCircuit, createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';`,
`import {
  connectStandardCircuit,
  createOhmsLawRuntime,
  ids,
  setOhmsLawInstrumentModel,
} from '../src/experiments/ohms-law/createOhmsLaw';`,
  ],
  ['    expect(result.current).toBeCloseTo(6 / 3.02, 5);', '    expect(result.current).toBeCloseTo(6 / 3, 8);'],
  ['    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(6 / 3.02, 5);', '    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(6 / 3, 8);'],
  ['    expect(runtime.getState().result.current).toBeCloseTo(12 / 6.02, 5);', '    expect(runtime.getState().result.current).toBeCloseTo(12 / 6, 8);'],
  [
`  it('returns to zero current after a wire is removed', () => {`,
`  it('models finite meter resistance in real-instrument mode', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    runtime.setVoltage(12);
    runtime.setResistance(3);
    setOhmsLawInstrumentModel(runtime, 'real');

    const parallelLoad = 1 / (1 / 3 + 1 / 1_000_000);
    const expectedCurrent = 12 / (parallelLoad + 0.02);
    const expectedVoltage = expectedCurrent * parallelLoad;
    const result = runtime.getState().result;

    expect(result.current).toBeCloseTo(expectedCurrent, 8);
    expect(result.measurements[ids.ammeter]?.current).toBeCloseTo(expectedCurrent, 8);
    expect(result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(expectedVoltage, 8);
    expect(result.measurements[ids.resistor]?.current).toBeCloseTo(expectedVoltage / 3, 8);

    runtime.captureMeasurement();
    const row = runtime.measurements.all()[0];
    expect(row?.voltage).toBeCloseTo(expectedVoltage, 8);
    expect(row?.current).toBeCloseTo(expectedCurrent, 8);
  });

  it('returns to exact school-model values after switching back to ideal instruments', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    runtime.setVoltage(12);
    runtime.setResistance(3);
    setOhmsLawInstrumentModel(runtime, 'real');
    setOhmsLawInstrumentModel(runtime, 'ideal');
    expect(runtime.getState().result.current).toBeCloseTo(4, 10);
    expect(runtime.getState().result.measurements[ids.voltmeter]?.voltage).toBeCloseTo(12, 10);
  });

  it('returns to zero current after a wire is removed', () => {`,
  ],
]);

patch('tests/pythonReplay.test.ts', [
  ['  { type: \'record\', voltage: 6, resistance: 3, current: 6 / 3.02, power: 36 / 3.02 },', "  { type: 'record', voltage: 6, resistance: 3, current: 2, power: 12 },"],
  ['    expect(runtime.getState().result.current).toBeCloseTo(6 / 3.02, 8);', '    expect(runtime.getState().result.current).toBeCloseTo(2, 8);'],
]);

patch('tests/experimentAst.test.ts', [
  ['    expect(rows[2]?.current).toBeCloseTo(6 / 3.02, 8);', '    expect(rows[2]?.current).toBeCloseTo(2, 8);'],
]);
