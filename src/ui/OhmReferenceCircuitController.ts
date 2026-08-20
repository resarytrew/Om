import type { SimulationRuntime } from '../core/simulation';
import {
  REFERENCE_CIRCUIT_INSTRUMENTS,
  referenceCircuitConnections,
  referenceCircuitDescription,
  type ReferenceCircuitMode,
} from '../experiments/ohms-law/referenceCircuits';

const wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export class OhmReferenceCircuitController {
  private readonly cleanups: Array<() => void> = [];
  private readonly preset: HTMLButtonElement | null;
  private readonly manualControls: HTMLElement | null;
  private selector: HTMLElement | null = null;
  private mode: ReferenceCircuitMode = 'series';
  private buildSequence = 0;
  private busy = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
    private readonly runtime: SimulationRuntime,
  ) {
    this.preset = root.querySelector<HTMLButtonElement>('#preset');
    this.manualControls = root.querySelector<HTMLElement>('#manual-controls');
    if (!this.preset || !this.manualControls) return;

    this.removeLegacySliders();
    this.installSelector();
    this.bindPreset();
    this.syncUi();
  }

  dispose(): void {
    this.buildSequence += 1;
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.selector?.remove();
    this.selector = null;
  }

  private removeLegacySliders(): void {
    for (const id of ['voltage', 'resistance']) {
      const input = this.root.querySelector<HTMLInputElement>(`#${id}`);
      if (!input) continue;
      const label = input.previousElementSibling;
      const rangeLabel = input.nextElementSibling;
      if (label instanceof HTMLElement && label.matches('label.control-row')) label.remove();
      if (rangeLabel instanceof HTMLElement && rangeLabel.classList.contains('range-label')) rangeLabel.remove();
      input.remove();
    }

    const title = this.manualControls?.querySelector<HTMLElement>('.panel-title');
    if (title) title.textContent = 'Эталонный опыт';
  }

  private installSelector(): void {
    if (!this.manualControls) return;
    const selector = document.createElement('div');
    selector.className = 'reference-circuit-card';
    selector.innerHTML = `
      <div class="reference-circuit-head">
        <span><b>Соединение резисторов</b><small>Эталонная цепь с R1 и R2</small></span>
      </div>
      <div class="reference-circuit-toggle" role="group" aria-label="Тип соединения резисторов">
        <button type="button" data-reference-circuit="series" class="active" aria-pressed="true">Последовательно</button>
        <button type="button" data-reference-circuit="parallel" aria-pressed="false">Параллельно</button>
      </div>
      <div class="reference-circuit-note" data-reference-note></div>
      <div class="reference-control-hint">U меняется ручкой источника, R — вращением регулируемого резистора прямо в 3D.</div>
    `;

    const modelCard = this.manualControls.querySelector<HTMLElement>('.instrument-model-card');
    if (modelCard) this.manualControls.insertBefore(selector, modelCard);
    else this.manualControls.append(selector);
    this.selector = selector;

    for (const button of selector.querySelectorAll<HTMLButtonElement>('[data-reference-circuit]')) {
      const onClick = (): void => {
        if (this.busy) return;
        const next = button.dataset.referenceCircuit as ReferenceCircuitMode | undefined;
        if (!next || next === this.mode) return;
        this.mode = next;
        this.syncUi();
      };
      button.addEventListener('click', onClick);
      this.cleanups.push(() => button.removeEventListener('click', onClick));
    }
  }

  private bindPreset(): void {
    if (!this.preset) return;
    const onPreset = (event: MouseEvent): void => {
      // The original shell still owns a legacy single-resistor preset handler.
      // Capture first so the new two-resistor reference circuit is the only build that runs.
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!this.busy) void this.runBuild();
    };
    this.preset.addEventListener('click', onPreset, true);
    this.cleanups.push(() => this.preset?.removeEventListener('click', onPreset, true));
  }

  private syncUi(): void {
    if (!this.selector || !this.preset) return;
    for (const button of this.selector.querySelectorAll<HTMLButtonElement>('[data-reference-circuit]')) {
      const active = button.dataset.referenceCircuit === this.mode;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
      button.disabled = this.busy;
    }
    const note = this.selector.querySelector<HTMLElement>('[data-reference-note]');
    if (note) note.textContent = referenceCircuitDescription(this.mode);
    if (!this.busy) {
      this.preset.textContent = this.mode === 'parallel'
        ? 'Собрать параллельную цепь'
        : 'Собрать последовательную цепь';
    }
  }

  private setBusy(busy: boolean, label?: string): void {
    this.busy = busy;
    if (this.preset) {
      this.preset.disabled = busy;
      this.preset.classList.toggle('assembling', busy);
      if (label) this.preset.textContent = label;
    }
    for (const button of this.selector?.querySelectorAll<HTMLButtonElement>('[data-reference-circuit]') ?? []) {
      button.disabled = busy;
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-equipment], #clear-wires, #clear-bench')) {
      button.disabled = busy;
      if (button.matches('[data-equipment]')) button.draggable = !busy;
    }
    if (!busy) this.syncUi();
  }

  private async runBuild(): Promise<void> {
    const token = ++this.buildSequence;
    const mode = this.mode;
    this.setBusy(true, 'Подготовка стола…');
    this.canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: true } }));
    this.runtime.clearConnections();
    this.runtime.clearMeasurements();
    this.canvas.dispatchEvent(new CustomEvent('lab:clear-bench'));

    try {
      await wait(180);
      for (let index = 0; index < REFERENCE_CIRCUIT_INSTRUMENTS.length; index += 1) {
        if (token !== this.buildSequence) return;
        const instrument = REFERENCE_CIRCUIT_INSTRUMENTS[index]!;
        this.setBusy(true, `Приборы ${index + 1}/${REFERENCE_CIRCUIT_INSTRUMENTS.length}…`);
        this.canvas.dispatchEvent(new CustomEvent('lab:place-instrument', {
          detail: { instrument, animate: true },
        }));
        await wait(index === 0 ? 500 : 390);
      }

      const connections = referenceCircuitConnections(mode);
      await wait(160);
      for (let index = 0; index < connections.length; index += 1) {
        if (token !== this.buildSequence) return;
        this.setBusy(true, `Провода ${index + 1}/${connections.length}…`);
        const [from, to] = connections[index]!;
        this.runtime.circuit.connect(from, to);
        this.runtime.recalculate();
        await wait(430);
      }
      await wait(220);
    } finally {
      if (token === this.buildSequence) {
        this.canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: false } }));
        this.setBusy(false);
      }
    }
  }
}
