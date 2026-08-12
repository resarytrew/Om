import { ScientificFieldClient } from '../../scientific/field/ScientificFieldClient';
import type { ChargedPlateParameters, ChargedPlateResult } from '../../scientific/field/protocol';
import { ElectricFieldScene } from './ElectricFieldScene';

export class FieldWorkbenchController {
  private readonly client = new ScientificFieldClient();
  private scene: ElectricFieldScene | null = null;
  private initialized = false;
  private activeSolve = 0;

  constructor(private readonly root: HTMLElement) {
    this.root.querySelector<HTMLButtonElement>('#field-run')?.addEventListener('click', () => {
      void this.solve();
    });
    for (const id of ['field-width', 'field-height', 'field-sigma', 'field-resolution', 'field-probe-z']) {
      this.root.querySelector<HTMLInputElement>(`#${id}`)?.addEventListener('input', () => this.updateControlLabels());
    }
    this.updateControlLabels();
  }

  async activate(): Promise<void> {
    const canvas = this.root.querySelector<HTMLCanvasElement>('#field-canvas');
    if (!canvas) throw new Error('Electric-field canvas was not found.');
    this.scene ??= new ElectricFieldScene(canvas);
    this.scene.resize();

    if (this.initialized) return;
    this.initialized = true;
    await this.solve();
  }

  dispose(): void {
    this.scene?.dispose();
    this.scene = null;
    this.client.dispose();
  }

  private readNumber(id: string): number {
    const input = this.root.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`Field control #${id} is missing.`);
    return Number(input.value);
  }

  private parameters(): ChargedPlateParameters {
    const width = this.readNumber('field-width');
    const height = this.readNumber('field-height');
    const nx = Math.round(this.readNumber('field-resolution'));
    const ny = Math.max(4, Math.min(120, Math.round(nx * (height / width))));
    return {
      width,
      height,
      sigma: this.readNumber('field-sigma') * 1e-9,
      nx,
      ny,
      probe_z: this.readNumber('field-probe-z'),
      sample_x_count: 15,
      sample_z_count: 9,
      sample_z_min: 0.15,
      sample_z_max: 2.5,
    };
  }

  private async solve(): Promise<void> {
    const solveId = ++this.activeSolve;
    const button = this.root.querySelector<HTMLButtonElement>('#field-run');
    if (button) button.disabled = true;
    this.setStatus('loading', 'NUMPY · CALCULATING');

    try {
      const result = await this.client.solve(this.parameters());
      if (solveId !== this.activeSolve) return;
      this.scene?.update(result);
      this.renderResult(result);
      this.setStatus('ready', 'NUMPY · VALIDATED');
    } catch (error) {
      if (solveId !== this.activeSolve) return;
      this.setStatus('error', 'NUMPY · ERROR');
      const message = this.root.querySelector<HTMLElement>('#field-error');
      if (message) message.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      if (solveId === this.activeSolve && button) button.disabled = false;
    }
  }

  private updateControlLabels(): void {
    const width = this.root.querySelector<HTMLOutputElement>('#field-width-value');
    const height = this.root.querySelector<HTMLOutputElement>('#field-height-value');
    const sigma = this.root.querySelector<HTMLOutputElement>('#field-sigma-value');
    const resolution = this.root.querySelector<HTMLOutputElement>('#field-resolution-value');
    const probe = this.root.querySelector<HTMLOutputElement>('#field-probe-value');
    if (width) width.value = `${this.readNumber('field-width').toFixed(2)} м`;
    if (height) height.value = `${this.readNumber('field-height').toFixed(2)} м`;
    if (sigma) sigma.value = `${this.readNumber('field-sigma').toFixed(2)} нКл/м²`;
    if (resolution) {
      const nx = Math.round(this.readNumber('field-resolution'));
      const w = this.readNumber('field-width');
      const h = this.readNumber('field-height');
      const ny = Math.max(4, Math.min(120, Math.round(nx * (h / w))));
      resolution.value = `${nx} × ${ny}`;
    }
    if (probe) probe.value = `${this.readNumber('field-probe-z').toFixed(2)} м`;
  }

  private renderResult(result: ChargedPlateResult): void {
    const error = this.root.querySelector<HTMLElement>('#field-error');
    if (error) error.textContent = '';

    this.setText('#field-probe-e', `${this.format(result.probe.magnitude)} Н/Кл`);
    this.setText('#field-probe-ez', `${this.format(result.probe.ez)} Н/Кл`);
    this.setText('#field-numeric', `${this.format(result.validation.axis_numeric_ez)} Н/Кл`);
    this.setText('#field-analytic', `${this.format(result.validation.axis_analytic_ez)} Н/Кл`);
    this.setText('#field-error-value', this.percent(result.validation.relative_error));
    this.setText('#field-convergence', this.percent(result.validation.convergence_delta));
    this.setText('#field-symmetry', this.scientific(result.validation.transverse_symmetry_ratio));
    this.setText('#field-far', this.percent(result.validation.far_relative_error));
    this.setText('#field-mesh', `${result.parameters.nx} × ${result.parameters.ny}`);

    this.setCheck('#check-analytic', result.validation.relative_error < 0.015);
    this.setCheck('#check-convergence', result.validation.convergence_delta < 0.015);
    this.setCheck('#check-symmetry', result.validation.transverse_symmetry_ratio < 1e-9);
    this.setCheck('#check-far', result.validation.far_relative_error < 0.015);
  }

  private setStatus(state: 'loading' | 'ready' | 'error', text: string): void {
    const status = this.root.querySelector<HTMLElement>('#field-status');
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
  }

  private setCheck(selector: string, pass: boolean): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (!element) return;
    element.dataset.pass = String(pass);
    const badge = element.querySelector<HTMLElement>('[data-check-badge]');
    if (badge) badge.textContent = pass ? 'PASS' : 'CHECK';
  }

  private setText(selector: string, value: string): void {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }

  private percent(value: number): string {
    return `${(value * 100).toFixed(value < 0.001 ? 4 : 2)} %`;
  }

  private scientific(value: number): string {
    return value === 0 ? '0' : value.toExponential(2);
  }

  private format(value: number): string {
    const absolute = Math.abs(value);
    if ((absolute > 0 && absolute < 0.01) || absolute >= 1e5) return value.toExponential(3);
    return value.toFixed(3);
  }
}
