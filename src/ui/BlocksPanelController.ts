import type * as Blockly from 'blockly';
import type { SimulationRuntime } from '../core/simulation';
import { executeExperimentProgram } from '../programming/ast/execute';
import { experimentProgramToPython } from '../programming/ast/toPython';
import { ExperimentProgramError } from '../programming/ast/types';
import { workspaceToExperimentProgram } from '../programming/blocks/workspaceToAst';

export type BlocksPanelStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';

export interface BlocksPanelOptions {
  readonly onSendToPython?: (code: string) => void;
}

export class BlocksPanelController {
  private workspace: Blockly.WorkspaceSvg | null = null;
  private status: BlocksPanelStatus = 'idle';
  private activeRun: AbortController | null = null;
  private readonly consoleLines: string[] = [];
  private defaultBuilder: ((workspace: Blockly.WorkspaceSvg) => void) | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly runtime: SimulationRuntime,
    private readonly options: BlocksPanelOptions = {},
  ) {
    this.root.querySelector<HTMLButtonElement>('#blocks-run')?.addEventListener('click', () => {
      void this.run();
    });
    this.root.querySelector<HTMLButtonElement>('#blocks-stop')?.addEventListener('click', () => this.stop());
    this.root.querySelector<HTMLButtonElement>('#blocks-reset')?.addEventListener('click', () => this.reset());
    this.root.querySelector<HTMLButtonElement>('#blocks-to-python')?.addEventListener('click', () => {
      const code = this.generatePython();
      if (code) this.options.onSendToPython?.(code);
    });
    this.renderStatus();
  }

  async activate(): Promise<void> {
    if (this.workspace) {
      this.workspace.resize();
      this.updatePreview();
      return;
    }

    this.setStatus('loading');
    this.appendConsole('Загрузка Blockly workspace…');
    try {
      const [BlocklyModule, definitions] = await Promise.all([
        import('blockly'),
        import('../programming/blocks/definitions'),
      ]);
      definitions.registerPhysicsLabBlocks();
      const container = this.root.querySelector<HTMLElement>('#blocks-workspace');
      if (!container) throw new Error('Blockly workspace container was not found.');

      this.workspace = BlocklyModule.inject(container, {
        toolbox: definitions.physicsLabToolbox,
        theme: definitions.physicsLabTheme,
        renderer: 'zelos',
        trashcan: true,
        move: { scrollbars: true, drag: true, wheel: true },
        zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.35, minScale: 0.55, scaleSpeed: 1.08 },
        sounds: false,
        grid: { spacing: 24, length: 2, colour: '#27313a', snap: false },
      });
      this.defaultBuilder = definitions.buildDefaultBlockProgram;
      this.defaultBuilder(this.workspace);
      this.workspace.addChangeListener((event) => {
        if (event.isUiEvent) return;
        this.updatePreview();
      });
      this.setStatus('ready');
      this.appendConsole('Blockly готов. Программа компилируется в Experiment AST.');
      this.updatePreview();
    } catch (error) {
      this.setStatus('error');
      this.appendConsole(`Ошибка Blockly: ${this.message(error)}`, 'error');
    }
  }

  async run(): Promise<void> {
    if (!this.workspace) await this.activate();
    if (!this.workspace || this.status === 'running') return;

    this.activeRun?.abort();
    const controller = new AbortController();
    this.activeRun = controller;
    this.consoleLines.length = 0;

    try {
      const program = workspaceToExperimentProgram(this.workspace);
      this.setStatus('running');
      this.appendConsole(`▶ AST v${program.version}: ${program.statements.length} верхнеуровневых команд.`);
      await executeExperimentProgram(this.runtime, program, {
        signal: controller.signal,
        onStep: (statement) => this.workspace?.highlightBlock(statement.sourceBlockId),
        onLog: (message, kind) => this.appendConsole(message, kind === 'measurement' ? 'measurement' : kind === 'success' ? 'success' : 'normal'),
      });
      this.workspace.highlightBlock(null);
      if (!controller.signal.aborted) this.setStatus('ready');
    } catch (error) {
      this.workspace.highlightBlock(error instanceof ExperimentProgramError ? error.blockId ?? null : null);
      this.setStatus('error');
      this.appendConsole(`Program error: ${this.message(error)}`, 'error');
    } finally {
      if (this.activeRun === controller) this.activeRun = null;
    }
  }

  stop(): void {
    if (!this.activeRun) return;
    this.activeRun.abort();
    this.activeRun = null;
    this.workspace?.highlightBlock(null);
    this.setStatus('ready');
    this.appendConsole('■ Выполнение блоков остановлено.');
  }

  reset(): void {
    if (!this.workspace || !this.defaultBuilder) return;
    this.stop();
    this.defaultBuilder(this.workspace);
    this.updatePreview();
    this.appendConsole('Блоки восстановлены до эталонной программы.');
  }

  dispose(): void {
    this.activeRun?.abort();
    this.workspace?.dispose();
    this.workspace = null;
  }

  private generatePython(): string | null {
    if (!this.workspace) return null;
    try {
      return experimentProgramToPython(workspaceToExperimentProgram(this.workspace));
    } catch (error) {
      this.setStatus('error');
      this.appendConsole(`Не удалось сгенерировать Python: ${this.message(error)}`, 'error');
      return null;
    }
  }

  private updatePreview(): void {
    const preview = this.root.querySelector<HTMLElement>('#blocks-python-preview');
    if (!preview || !this.workspace) return;
    const code = this.generatePython();
    preview.textContent = code ?? '# Исправьте структуру блоков';
    if (code && this.status === 'error') this.setStatus('ready');
  }

  private setStatus(status: BlocksPanelStatus): void {
    this.status = status;
    this.renderStatus();
  }

  private renderStatus(): void {
    const badge = this.root.querySelector<HTMLElement>('#blocks-status');
    const run = this.root.querySelector<HTMLButtonElement>('#blocks-run');
    const stop = this.root.querySelector<HTMLButtonElement>('#blocks-stop');
    if (badge) {
      const labels: Record<BlocksPanelStatus, string> = {
        idle: 'BLOCKS · IDLE', loading: 'BLOCKS · LOADING', ready: 'BLOCKS · READY', running: 'BLOCKS · RUNNING', error: 'BLOCKS · ERROR',
      };
      badge.textContent = labels[this.status];
      badge.dataset.state = this.status;
    }
    if (run) run.disabled = this.status === 'loading' || this.status === 'running';
    if (stop) stop.disabled = this.status !== 'running';
  }

  private appendConsole(message: string, kind: 'normal' | 'measurement' | 'success' | 'error' = 'normal'): void {
    this.consoleLines.push(`<div class="blocks-line ${kind}">${this.escape(`> ${message}`)}</div>`);
    if (this.consoleLines.length > 70) this.consoleLines.splice(0, this.consoleLines.length - 70);
    const output = this.root.querySelector<HTMLElement>('#blocks-console');
    if (output) {
      output.innerHTML = this.consoleLines.join('');
      output.scrollTop = output.scrollHeight;
    }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private escape(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }
}
