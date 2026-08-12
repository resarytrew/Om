import type { MeasurementRow } from '../core/measurements';
import type { SimulationRuntime, SimulationState } from '../core/simulation';
import type { Diagnostic } from '../core/types';
import { FieldWorkbenchController } from '../experiments/electric-field/FieldWorkbenchController';
import { connectStandardCircuit } from '../experiments/ohms-law/createOhmsLaw';
import type { PythonRuntimeClient } from '../programming/python/PythonRuntimeClient';
import { BlocksPanelController } from './BlocksPanelController';
import { PythonPanelController } from './PythonPanelController';

const fmt = (value: number, digits = 2): string =>
  Number.isFinite(value) ? value.toFixed(digits) : '∞';

function graph(rows: readonly MeasurementRow[]): string {
  const width = 620;
  const height = 230;
  const pad = { l: 52, r: 20, t: 18, b: 40 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const maxU = Math.max(12, ...rows.map((row) => row.voltage));
  const finiteCurrents = rows.map((row) => row.current).filter(Number.isFinite);
  const maxI = Math.max(4, ...finiteCurrents);
  const x = (u: number) => pad.l + (u / maxU) * plotW;
  const y = (i: number) => pad.t + plotH - (Math.min(i, maxI) / maxI) * plotH;
  const grid: string[] = [];
  for (let u = 0; u <= maxU; u += 2) {
    grid.push(`<line x1="${x(u)}" y1="${pad.t}" x2="${x(u)}" y2="${pad.t + plotH}" class="grid-line"/>`);
    grid.push(`<text x="${x(u)}" y="${height - 14}" class="axis-label" text-anchor="middle">${u}</text>`);
  }
  for (let i = 0; i <= maxI; i += 1) {
    grid.push(`<line x1="${pad.l}" y1="${y(i)}" x2="${width - pad.r}" y2="${y(i)}" class="grid-line"/>`);
    grid.push(`<text x="${pad.l - 10}" y="${y(i) + 4}" class="axis-label" text-anchor="end">${i}</text>`);
  }
  const points = rows.map((row) => `${x(row.voltage)},${y(row.current)}`).join(' ');
  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="График зависимости силы тока от напряжения">
      ${grid.join('')}
      <line x1="${pad.l}" y1="${pad.t + plotH}" x2="${width - pad.r}" y2="${pad.t + plotH}" class="axis"/>
      <line x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" class="axis"/>
      ${rows.length > 1 ? `<polyline points="${points}" class="plot-line"/>` : ''}
      ${rows.map((row) => `<circle cx="${x(row.voltage)}" cy="${y(row.current)}" r="5" class="plot-point"/>`).join('')}
      <text x="${width / 2}" y="${height - 2}" class="axis-title" text-anchor="middle">U, В</text>
      <text x="16" y="${height / 2}" class="axis-title" text-anchor="middle" transform="rotate(-90 16 ${height / 2})">I, А</text>
    </svg>`;
}

function diagnostics(items: readonly Diagnostic[]): string {
  if (items.length === 0) return '<div class="status-message success">Цепь готова к измерению.</div>';
  return items
    .slice(0, 2)
    .map((item) => `<div class="status-message ${item.severity}">${item.message}</div>`)
    .join('');
}

export interface AppElements {
  readonly canvas: HTMLCanvasElement;
  dispose(): void;
}

type AppMode = 'manual' | 'blocks' | 'python';
type AppSection = 'ohm' | 'fields';

export function renderApp(
  root: HTMLElement,
  runtime: SimulationRuntime,
  pythonClient: PythonRuntimeClient,
): AppElements {
  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand"><span class="brand-mark">◎</span><strong>PHYSICS:<span>//LAB</span></strong></div>
        <div class="breadcrumb" id="app-breadcrumb"><span>Электричество</span><b>/</b> Закон Ома</div>
        <div class="modes" id="ohm-modes" aria-label="Режим работы">
          <button class="mode active" data-mode="manual">Manual</button>
          <button class="mode" data-mode="blocks">Blocks</button>
          <button class="mode" data-mode="python">Python</button>
        </div>
      </header>
      <aside class="sidebar">
        <button class="nav-item active" id="nav-ohm"><span>Ω</span> Закон Ома</button>
        <button class="nav-item" id="nav-fields"><span>⌁</span> Поля</button>
        <button class="nav-item" disabled><span>△</span> Механика</button>
        <button class="nav-item" disabled><span>∿</span> Волны</button>
        <button class="nav-item" disabled><span>◁</span> Оптика</button>
      </aside>

      <main class="workspace" id="ohm-workspace" data-mode="manual">
        <section class="lab-card">
          <div class="scene-head">
            <div><span class="eyebrow">LIVE LAB</span><h1>Закон Ома для участка цепи</h1></div>
            <div id="circuit-status" class="circuit-status">Цепь разомкнута</div>
          </div>
          <div class="scene-wrap">
            <canvas id="lab-canvas" aria-label="Трёхмерная лабораторная установка"></canvas>
            <div class="scene-hint" id="scene-hint">Клемма → клемма: создать провод · Провод: выбрать, Delete удалить · Esc отмена.</div>
          </div>
        </section>

        <aside class="controls-card" id="manual-controls">
          <div class="panel-title">Параметры</div>
          <label class="control-row">
            <span><b>Напряжение</b><small>Источник, U</small></span>
            <output id="voltage-output">6.00 В</output>
          </label>
          <input id="voltage" type="range" min="0" max="12" step="0.5" value="6" aria-label="Напряжение источника" />
          <div class="range-label"><span>0 В</span><span>12 В</span></div>
          <label class="control-row second">
            <span><b>Сопротивление</b><small>Резистор, R</small></span>
            <output id="resistance-output">3.00 Ω</output>
          </label>
          <input id="resistance" type="range" min="0.5" max="20" step="0.5" value="3" aria-label="Сопротивление резистора" />
          <div class="range-label"><span>0.5 Ω</span><span>20 Ω</span></div>
          <div class="button-stack">
            <button id="preset" class="primary">Собрать эталонную цепь</button>
            <button id="measure" class="secondary">Зафиксировать измерение</button>
            <button id="clear-wires" class="ghost">Разобрать цепь</button>
          </div>
          <div id="diagnostics" class="diagnostics"></div>
          <div class="architecture-note">Клеммы и провода являются частью физической модели. Результат появляется только после анализа топологии цепи.</div>
        </aside>

        <section class="blocks-card" id="blocks-card" hidden>
          <div class="blocks-header">
            <div>
              <span class="eyebrow">VISUAL EXPERIMENT PROGRAM</span>
              <div class="blocks-title">Blocks Lab</div>
            </div>
            <div id="blocks-status" class="blocks-status" data-state="idle">BLOCKS · IDLE</div>
          </div>
          <div id="blocks-workspace" class="blocks-workspace" aria-label="Визуальный редактор алгоритма эксперимента"></div>
          <div class="blocks-actions">
            <button id="blocks-run" class="primary">▶ Run blocks</button>
            <button id="blocks-stop" class="secondary" disabled>■ Stop</button>
            <button id="blocks-reset" class="ghost">Reset</button>
            <button id="blocks-to-python" class="ghost accent">Открыть как Python →</button>
          </div>
          <div class="blocks-lower">
            <div class="blocks-preview-shell">
              <div class="terminal-title">GENERATED PYTHON</div>
              <pre id="blocks-python-preview" class="blocks-python-preview"># Blockly загрузится при открытии режима.</pre>
            </div>
            <div class="blocks-console-shell">
              <div class="terminal-title">&gt;_ EXECUTION</div>
              <div id="blocks-console" class="blocks-console"><div class="blocks-line normal">&gt; Blocks загрузятся при открытии режима.</div></div>
            </div>
          </div>
          <div class="blocks-footnote">Blockly компилируется не напрямую в код, а в Experiment AST. Тот же AST исполняется лабораторией и отдельно преобразуется в Python.</div>
        </section>

        <section class="python-card" id="python-card" hidden>
          <div class="python-header">
            <div>
              <span class="eyebrow">PROGRAMMABLE EXPERIMENT</span>
              <div class="python-title">Python Lab</div>
            </div>
            <div id="python-status" class="python-status" data-state="idle">PYTHON · IDLE</div>
          </div>
          <div id="python-editor" class="python-editor" aria-label="Редактор Python"></div>
          <div class="python-actions">
            <button id="python-run" class="primary">▶ Run experiment</button>
            <button id="python-stop" class="secondary" disabled>■ Stop</button>
            <button id="python-reset" class="ghost">Reset code</button>
          </div>
          <div class="python-console-shell">
            <div class="terminal-title">&gt;_ PYTHON OUTPUT</div>
            <div id="python-console" class="python-console"><div class="python-line normal">&gt; Python загрузится при открытии режима.</div></div>
          </div>
          <div class="python-footnote">Код выполняется настоящим CPython/Pyodide в Web Worker. Сцена обновляется через тот же SimulationRuntime, что и ручной режим.</div>
        </section>

        <section class="data-card graph-card">
          <div class="panel-title row"><span>I(U)</span><button id="clear-data" class="text-button">Очистить</button></div>
          <div id="graph" class="graph"></div>
        </section>
        <section class="data-card table-card">
          <div class="panel-title">Измерения</div>
          <div class="table-wrap"><table><thead><tr><th>#</th><th>U, В</th><th>I, А</th><th>R, Ω</th><th>P, Вт</th></tr></thead><tbody id="measurements"></tbody></table></div>
        </section>
        <section class="terminal-card" id="manual-terminal">
          <div class="terminal-title">&gt;_ EXPERIMENT LOG</div>
          <div id="terminal-lines" class="terminal-lines"></div>
        </section>
      </main>

      <main class="field-workspace" id="field-workspace" hidden>
        <section class="field-scene-card">
          <div class="field-scene-head">
            <div><span class="eyebrow">SCIENTIFIC VISUALIZATION</span><h1>Поле заряженной прямоугольной пластины</h1></div>
            <div id="field-status" class="field-status" data-state="loading">NUMPY · IDLE</div>
          </div>
          <div class="field-canvas-wrap">
            <canvas id="field-canvas" aria-label="Векторное поле заряженной пластины"></canvas>
            <div class="field-scene-note">Векторы вычисляет Python/NumPy. Babylon.js получает только координаты и компоненты E и отображает результат.</div>
          </div>
        </section>

        <aside class="field-controls-card">
          <div class="panel-title">Модель</div>
          <label class="field-control">
            <div class="field-control-head"><span>Ширина пластины</span><output id="field-width-value">2.00 м</output></div>
            <input id="field-width" type="range" min="0.6" max="3" step="0.1" value="2" />
          </label>
          <label class="field-control">
            <div class="field-control-head"><span>Высота пластины</span><output id="field-height-value">1.20 м</output></div>
            <input id="field-height" type="range" min="0.5" max="2.5" step="0.1" value="1.2" />
          </label>
          <label class="field-control">
            <div class="field-control-head"><span>Поверхностный заряд σ</span><output id="field-sigma-value">1.00 нКл/м²</output></div>
            <input id="field-sigma" type="range" min="0.1" max="5" step="0.1" value="1" />
          </label>
          <label class="field-control">
            <div class="field-control-head"><span>Сетка интегрирования</span><output id="field-resolution-value">36 × 22</output></div>
            <input id="field-resolution" type="range" min="12" max="72" step="4" value="36" />
          </label>
          <label class="field-control">
            <div class="field-control-head"><span>Положение датчика z</span><output id="field-probe-value">0.75 м</output></div>
            <input id="field-probe-z" type="range" min="0.15" max="2.5" step="0.05" value="0.75" />
          </label>
          <button id="field-run" class="primary">Рассчитать поле</button>
          <div id="field-error" class="field-error"></div>
          <div class="field-probe-card">
            <div class="eyebrow">ДАТЧИК НА ОСИ</div>
            <div class="field-probe-row"><span>|E|</span><strong id="field-probe-e">—</strong></div>
            <div class="field-probe-row"><span>E<sub>z</sub></span><strong id="field-probe-ez">—</strong></div>
            <div class="field-probe-row"><span>mesh</span><strong id="field-mesh">—</strong></div>
          </div>
        </aside>

        <section class="field-validation-card">
          <div class="field-validation-head">
            <div class="panel-title">Проверка модели</div>
            <p>Мы проверяем не картинку, а численный расчёт.</p>
          </div>
          <div class="field-checks">
            <div class="field-check" id="check-analytic" data-pass="false">
              <div class="field-check-top"><span>Аналитическое решение</span><b data-check-badge>CHECK</b></div>
              <div class="field-check-value" id="field-error-value">—</div>
              <div class="field-check-detail">относительная ошибка на оси</div>
            </div>
            <div class="field-check" id="check-convergence" data-pass="false">
              <div class="field-check-top"><span>Сходимость сетки</span><b data-check-badge>CHECK</b></div>
              <div class="field-check-value" id="field-convergence">—</div>
              <div class="field-check-detail">изменение E при удвоении nx, ny</div>
            </div>
            <div class="field-check" id="check-symmetry" data-pass="false">
              <div class="field-check-top"><span>Симметрия</span><b data-check-badge>CHECK</b></div>
              <div class="field-check-value" id="field-symmetry">—</div>
              <div class="field-check-detail">√(Ex²+Ey²) / |Ez| на оси</div>
            </div>
            <div class="field-check" id="check-far" data-pass="false">
              <div class="field-check-top"><span>Дальний предел</span><b data-check-badge>CHECK</b></div>
              <div class="field-check-value" id="field-far">—</div>
              <div class="field-check-detail">сравнение с точечным зарядом</div>
            </div>
          </div>
          <div class="field-validation-meta">
            <span>E<sub>num</sub> = <b id="field-numeric">—</b></span>
            <span>E<sub>analytic</sub> = <b id="field-analytic">—</b></span>
            <span>dA = Δx·Δy, источники берутся в центрах ячеек</span>
          </div>
        </section>
      </main>
    </div>`;

  const canvas = root.querySelector<HTMLCanvasElement>('#lab-canvas');
  const voltage = root.querySelector<HTMLInputElement>('#voltage');
  const resistance = root.querySelector<HTMLInputElement>('#resistance');
  const preset = root.querySelector<HTMLButtonElement>('#preset');
  const measure = root.querySelector<HTMLButtonElement>('#measure');
  const clearWires = root.querySelector<HTMLButtonElement>('#clear-wires');
  const clearData = root.querySelector<HTMLButtonElement>('#clear-data');
  const workspace = root.querySelector<HTMLElement>('#ohm-workspace');
  const fieldWorkspace = root.querySelector<HTMLElement>('#field-workspace');
  const modes = root.querySelector<HTMLElement>('#ohm-modes');
  const breadcrumb = root.querySelector<HTMLElement>('#app-breadcrumb');
  const navOhm = root.querySelector<HTMLButtonElement>('#nav-ohm');
  const navFields = root.querySelector<HTMLButtonElement>('#nav-fields');
  const manualControls = root.querySelector<HTMLElement>('#manual-controls');
  const manualTerminal = root.querySelector<HTMLElement>('#manual-terminal');
  const blocksCard = root.querySelector<HTMLElement>('#blocks-card');
  const pythonCard = root.querySelector<HTMLElement>('#python-card');
  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {
    throw new Error('Application shell failed to initialize.');
  }

  const pythonPanel = new PythonPanelController(root, runtime, pythonClient);
  const fieldWorkbench = new FieldWorkbenchController(root);
  let blocksPanel: BlocksPanelController;
  let mode: AppMode = 'manual';
  let section: AppSection = 'ohm';

  const setMode = (nextMode: AppMode): void => {
    mode = nextMode;
    workspace.dataset.mode = mode;
    manualControls.hidden = mode !== 'manual';
    manualTerminal.hidden = mode !== 'manual';
    blocksCard.hidden = mode !== 'blocks';
    pythonCard.hidden = mode !== 'python';
    for (const button of root.querySelectorAll<HTMLButtonElement>('.mode[data-mode]')) {
      button.classList.toggle('active', button.dataset.mode === mode);
    }
    if (mode === 'blocks') void blocksPanel.activate();
    if (mode === 'python') void pythonPanel.activate();
    if (mode !== 'python') pythonPanel.deactivate();
  };

  const setSection = (nextSection: AppSection): void => {
    section = nextSection;
    workspace.hidden = section !== 'ohm';
    fieldWorkspace.hidden = section !== 'fields';
    modes.hidden = section !== 'ohm';
    navOhm.classList.toggle('active', section === 'ohm');
    navFields.classList.toggle('active', section === 'fields');
    breadcrumb.innerHTML = section === 'ohm'
      ? '<span>Электричество</span><b>/</b> Закон Ома'
      : '<span>Электричество</span><b>/</b> Поле заряженной пластины';
    if (section === 'fields') void fieldWorkbench.activate();
  };

  blocksPanel = new BlocksPanelController(root, runtime, {
    onSendToPython: (code) => {
      setSection('ohm');
      setMode('python');
      void pythonPanel.setProgram(code);
    },
  });

  navOhm.addEventListener('click', () => setSection('ohm'));
  navFields.addEventListener('click', () => setSection('fields'));
  root.querySelector<HTMLButtonElement>('.mode[data-mode="manual"]')?.addEventListener('click', () => setMode('manual'));
  root.querySelector<HTMLButtonElement>('.mode[data-mode="blocks"]')?.addEventListener('click', () => setMode('blocks'));
  root.querySelector<HTMLButtonElement>('.mode[data-mode="python"]')?.addEventListener('click', () => setMode('python'));
  voltage.addEventListener('input', () => runtime.setVoltage(Number(voltage.value)));
  resistance.addEventListener('input', () => runtime.setResistance(Number(resistance.value)));
  preset.addEventListener('click', () => connectStandardCircuit(runtime));
  measure.addEventListener('click', () => runtime.captureMeasurement());
  clearWires.addEventListener('click', () => runtime.clearConnections());
  clearData.addEventListener('click', () => runtime.clearMeasurements());

  const unsubscribe = runtime.subscribe((state) => updateUi(root, runtime, state));
  setMode(mode);
  setSection(section);

  return {
    canvas,
    dispose: () => {
      unsubscribe();
      blocksPanel.dispose();
      pythonPanel.dispose();
      fieldWorkbench.dispose();
    },
  };
}

function updateUi(root: HTMLElement, runtime: SimulationRuntime, state: SimulationState): void {
  const snapshot = runtime.circuit.snapshot();
  const source = snapshot.components.find((component) => component.kind === 'voltage-source');
  const resistor = snapshot.components.find((component) => component.kind === 'resistor');
  const voltageValue = source?.kind === 'voltage-source' ? source.voltage : 0;
  const resistanceValue = resistor?.kind === 'resistor' ? resistor.resistance : 0;
  const rows = runtime.measurements.all();

  const voltageInput = root.querySelector<HTMLInputElement>('#voltage');
  const resistanceInput = root.querySelector<HTMLInputElement>('#resistance');
  if (voltageInput) voltageInput.value = String(voltageValue);
  if (resistanceInput) resistanceInput.value = String(resistanceValue);
  const voltageOutput = root.querySelector<HTMLOutputElement>('#voltage-output');
  const resistanceOutput = root.querySelector<HTMLOutputElement>('#resistance-output');
  if (voltageOutput) voltageOutput.value = `${fmt(voltageValue)} В`;
  if (resistanceOutput) resistanceOutput.value = `${fmt(resistanceValue)} Ω`;

  const status = root.querySelector<HTMLElement>('#circuit-status');
  if (status) {
    status.textContent = state.result.status === 'closed'
      ? `Цепь замкнута · I = ${fmt(state.result.current, 3)} А`
      : state.result.status === 'short-circuit'
        ? 'Короткое замыкание'
        : 'Цепь разомкнута';
    status.dataset.state = state.result.status;
  }

  const hint = root.querySelector<HTMLElement>('#scene-hint');
  if (hint) {
    hint.textContent = state.selectedTerminal
      ? `Первая клемма выбрана: ${state.selectedTerminal}. Наведите на вторую — зелёная подсветка означает snap. Esc отмена.`
      : 'Клемма → клемма: создать провод · Провод: выбрать, Delete удалить · Esc отмена.';
  }

  const diagnosticPanel = root.querySelector<HTMLElement>('#diagnostics');
  if (diagnosticPanel) diagnosticPanel.innerHTML = diagnostics(state.result.diagnostics);
  const measureButton = root.querySelector<HTMLButtonElement>('#measure');
  if (measureButton) measureButton.disabled = state.result.status !== 'closed' || !Number.isFinite(state.result.current);

  const graphPanel = root.querySelector<HTMLElement>('#graph');
  if (graphPanel) graphPanel.innerHTML = graph(rows);
  const body = root.querySelector<HTMLTableSectionElement>('#measurements');
  if (body) {
    body.innerHTML = rows.length
      ? rows.map((row) => `<tr><td>${row.id}</td><td>${fmt(row.voltage)}</td><td>${fmt(row.current, 3)}</td><td>${fmt(row.resistance)}</td><td>${fmt(row.power, 3)}</td></tr>`).join('')
      : '<tr><td colspan="5" class="empty">Пока нет измерений.</td></tr>';
  }

  const terminal = root.querySelector<HTMLElement>('#terminal-lines');
  if (terminal) {
    const last = rows.at(-1);
    terminal.innerHTML = [
      `<div><span>&gt;</span> circuit.status <b>${state.result.status}</b></div>`,
      `<div><span>&gt;</span> source.voltage <b>${fmt(voltageValue)} V</b></div>`,
      `<div><span>&gt;</span> resistor.resistance <b>${fmt(resistanceValue)} Ω</b></div>`,
      `<div><span>&gt;</span> ammeter.read() <b>${Number.isFinite(state.result.current) ? `${fmt(state.result.current, 3)} A` : 'OVERLOAD'}</b></div>`,
      last ? `<div class="terminal-success">measurement[${last.id}] = { U: ${fmt(last.voltage)}, I: ${fmt(last.current, 3)}, R: ${fmt(last.resistance)} }</div>` : '',
    ].join('');
  }
}
