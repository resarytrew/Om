import type { SimulationRuntime } from '../core/simulation';
import { DEFAULT_PYTHON_PROGRAM } from '../programming/python/defaultProgram';
import { PythonRuntimeClient } from '../programming/python/PythonRuntimeClient';
import { describePythonEvent, replayPythonEvents } from '../programming/python/replay';
import { createPythonInitialState } from '../programming/python/state';
import type { PythonEditorHandle } from './PythonEditor';

export type PythonPanelStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error';

export class PythonPanelController {
  private editor: PythonEditorHandle | null = null;
  private status: PythonPanelStatus = 'idle';
  private activeRun: AbortController | null = null;
  private readonly consoleLines: string[] = [];
  private pendingProgram: string | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly runtime: SimulationRuntime,
    private readonly client: PythonRuntimeClient,
  ) {
    this.root.querySelector<HTMLButtonElement>('#python-run')?.addEventListener('click', () => void this.run());
    this.root.querySelector<HTMLButtonElement>('#python-stop')?.addEventListener('click', () => void this.stop());
    this.root.querySelector<HTMLButtonElement>('#python-reset')?.addEventListener('click', () => {
      this.pendingProgram = null;
      this.editor?.setValue(DEFAULT_PYTHON_PROGRAM);
      this.appendConsole('Код восстановлен до примера эксперимента.');
    });
    this.renderStatus();
  }

  async activate(): Promise<void> {
    if (this.editor) {
      this.editor.layout();
      this.editor.focus();
      return;
    }

    this.setStatus('loading');
    this.appendConsole('Загрузка Python WebAssembly runtime…');

    try {
      const [version, editorModule] = await Promise.all([
        this.client.initialize(),
        import('./PythonEditor'),
      ]);
      const container = this.root.querySelector<HTMLElement>('#python-editor');
      if (!container) throw new Error('Python editor container was not found.');
      this.editor = editorModule.createPythonEditor(
        container,
        this.pendingProgram ?? DEFAULT_PYTHON_PROGRAM,
      );
      this.pendingProgram = null;
      this.setStatus('ready');
      this.appendConsole(`Pyodide ${version} готов. Python выполняется в отдельном Web Worker.`);
      this.editor.focus();
    } catch (error) {
      this.setStatus('error');
      this.appendConsole(`Ошибка инициализации: ${this.message(error)}`);
    }
  }

  async setProgram(code: string): Promise<void> {
    this.pendingProgram = code;
    if (!this.editor) await this.activate();
    if (!this.editor) return;
    this.editor.setValue(code);
    this.pendingProgram = null;
    this.appendConsole('Код сгенерирован из Experiment AST визуальной программы.');
    this.editor.focus();
  }

  deactivate(): void {
    this.editor?.layout();
  }

  async run(): Promise<void> {
    if (!this.editor) await this.activate();
    if (!this.editor || this.status === 'running') return;

    this.activeRun?.abort();
    const runController = new AbortController();
    this.activeRun = runController;
    this.consoleLines.length = 0;
    this.setStatus('running');
    this.appendConsole('▶ Выполняю Python-код…');

    try {
      const initial = createPythonInitialState(this.runtime);
      const result = await this.client.run(this.editor.getValue(), initial);
      if (runController.signal.aborted) return;

      for (const line of result.stdout) this.appendConsole(line, 'stdout');
      this.appendConsole(`Python сформировал ${result.events.length} команд для лаборатории.`);

      await replayPythonEvents(this.runtime, result.events, {
        signal: runController.signal,
        onEvent: (event) => this.appendConsole(`→ ${describePythonEvent(event)}`, 'event'),
      });
      if (runController.signal.aborted) return;

      this.setStatus('ready');
      const current = result.finalState.current;
      this.appendConsole(
        current === null
          ? 'Эксперимент завершён. Финальный ток не является конечным числом.'
          : `✓ Эксперимент завершён. Финальный ток: ${current.toFixed(3)} А.`,
        'success',
      );
    } catch (error) {
      if (runController.signal.aborted) return;
      this.setStatus('error');
      this.appendConsole(`Python error: ${this.message(error)}`, 'error');
    } finally {
      if (this.activeRun === runController) this.activeRun = null;
    }
  }

  async stop(): Promise<void> {
    if (this.status !== 'running' && this.status !== 'loading') return;
    this.activeRun?.abort();
    this.activeRun = null;
    this.client.restart();
    this.setStatus('loading');
    this.appendConsole('■ Выполнение остановлено. Python runtime перезапускается…');
    try {
      const version = await this.client.initialize();
      this.setStatus('ready');
      this.appendConsole(`Pyodide ${version} снова готов.`);
    } catch (error) {
      this.setStatus('error');
      this.appendConsole(`Не удалось перезапустить Python: ${this.message(error)}`, 'error');
    }
  }

  dispose(): void {
    this.activeRun?.abort();
    this.editor?.dispose();
    this.editor = null;
  }

  private setStatus(status: PythonPanelStatus): void {
    this.status = status;
    this.renderStatus();
  }

  private renderStatus(): void {
    const badge = this.root.querySelector<HTMLElement>('#python-status');
    const run = this.root.querySelector<HTMLButtonElement>('#python-run');
    const stop = this.root.querySelector<HTMLButtonElement>('#python-stop');
    if (badge) {
      const labels: Record<PythonPanelStatus, string> = {
        idle: 'PYTHON · IDLE',
        loading: 'PYTHON · LOADING',
        ready: 'PYTHON · READY',
        running: 'PYTHON · RUNNING',
        error: 'PYTHON · ERROR',
      };
      badge.textContent = labels[this.status];
      badge.dataset.state = this.status;
    }
    if (run) run.disabled = this.status === 'running' || this.status === 'loading';
    if (stop) stop.disabled = this.status !== 'running' && this.status !== 'loading';
  }

  private appendConsole(
    message: string,
    kind: 'normal' | 'stdout' | 'event' | 'success' | 'error' = 'normal',
  ): void {
    const prefix = kind === 'stdout' ? '  ' : kind === 'event' ? '' : '> ';
    const className = `python-line ${kind}`;
    this.consoleLines.push(`<div class="${className}">${this.escape(prefix + message)}</div>`);
    if (this.consoleLines.length > 80) this.consoleLines.splice(0, this.consoleLines.length - 80);
    const consoleElement = this.root.querySelector<HTMLElement>('#python-console');
    if (consoleElement) {
      consoleElement.innerHTML = this.consoleLines.join('');
      consoleElement.scrollTop = consoleElement.scrollHeight;
    }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  private escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
