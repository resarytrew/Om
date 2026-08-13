import { readFileSync, writeFileSync } from 'node:fs';

function assertContains(path, fragment) {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(fragment)) throw new Error(`Core patch did not reach ${path}: ${fragment}`);
}

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

assertContains('src/experiments/ohms-law/createOhmsLaw.ts', 'OHM_INSTRUMENT_MODELS');
assertContains('src/core/solver.ts', 'targetEquivalentResistance');
assertContains('src/core/simulation.ts', 'measuredVoltage');
assertContains('src/core/measurements.ts', 'MeasurementOverride');

patch('src/ui/renderApp.ts', [
  [
    "import { connectStandardCircuit } from '../experiments/ohms-law/createOhmsLaw';",
    "import {\n  connectStandardCircuit,\n  getOhmsLawInstrumentModel,\n  setOhmsLawInstrumentModel,\n  type InstrumentModel,\n} from '../experiments/ohms-law/createOhmsLaw';",
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
            <div id="instrument-model-note" class="instrument-model-note">Rₐ = 0 Ω · Rᵥ = ∞ · основной учебный режим: I = U / R.</div>
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
`  const status = root.querySelector<HTMLElement>('#circuit-status');`,
`  const instrumentModel = getOhmsLawInstrumentModel(runtime);
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
`  if (terminal) {
    const last = rows.at(-1);
    terminal.innerHTML = [`,
`  if (terminal) {
    const last = rows.at(-1);
    const ammeter = snapshot.components.find((component) => component.kind === 'ammeter');
    const voltmeter = snapshot.components.find((component) => component.kind === 'voltmeter');
    const ammeterValue = ammeter ? state.result.measurements[ammeter.id]?.current ?? state.result.current : state.result.current;
    const voltmeterValue = voltmeter ? state.result.measurements[voltmeter.id]?.voltage ?? 0 : 0;
    terminal.innerHTML = [
      '<div><span>&gt;</span> instruments.model <b>' + instrumentModel + '</b></div>',
      '<div><span>&gt;</span> voltmeter.read() <b>' + fmt(voltmeterValue, 3) + ' V</b></div>',`,
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
    "import { connectStandardCircuit, createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';",
    "import {\n  connectStandardCircuit,\n  createOhmsLawRuntime,\n  ids,\n  setOhmsLawInstrumentModel,\n} from '../src/experiments/ohms-law/createOhmsLaw';",
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
  ["  { type: 'record', voltage: 6, resistance: 3, current: 6 / 3.02, power: 36 / 3.02 },", "  { type: 'record', voltage: 6, resistance: 3, current: 2, power: 12 },"],
  ['    expect(runtime.getState().result.current).toBeCloseTo(6 / 3.02, 8);', '    expect(runtime.getState().result.current).toBeCloseTo(2, 8);'],
]);

patch('tests/experimentAst.test.ts', [
  ['    expect(rows[2]?.current).toBeCloseTo(6 / 3.02, 8);', '    expect(rows[2]?.current).toBeCloseTo(2, 8);'],
]);
