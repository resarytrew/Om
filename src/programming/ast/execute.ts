import type { SimulationRuntime } from '../../core/simulation';
import { connectStandardCircuit } from '../../experiments/ohms-law/createOhmsLaw';
import type { ExperimentProgram, ExperimentStatement } from './types';

export interface ExperimentExecutionHooks {
  readonly signal?: AbortSignal;
  readonly onStep?: (statement: ExperimentStatement) => void;
  readonly onLog?: (message: string, kind?: 'normal' | 'measurement' | 'success') => void;
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

async function executeStatements(
  runtime: SimulationRuntime,
  statements: readonly ExperimentStatement[],
  hooks: ExperimentExecutionHooks,
): Promise<void> {
  for (const statement of statements) {
    if (hooks.signal?.aborted) return;
    hooks.onStep?.(statement);

    switch (statement.type) {
      case 'connect-standard':
        connectStandardCircuit(runtime);
        hooks.onLog?.('Собрана стандартная измерительная цепь.');
        break;
      case 'clear-measurements':
        runtime.clearMeasurements();
        hooks.onLog?.('Таблица измерений очищена.');
        break;
      case 'set-resistance':
        runtime.setResistance(statement.value);
        hooks.onLog?.(`R = ${statement.value.toFixed(2)} Ω`);
        break;
      case 'sweep-voltage': {
        const direction = statement.to >= statement.from ? 1 : -1;
        const step = Math.abs(statement.step) * direction;
        const maxIterations = 200;
        let value = statement.from;
        let iteration = 0;
        const inside = (candidate: number) => direction > 0
          ? candidate <= statement.to + 1e-9
          : candidate >= statement.to - 1e-9;
        while (inside(value) && iteration < maxIterations) {
          if (hooks.signal?.aborted) return;
          runtime.setVoltage(value);
          hooks.onLog?.(`U = ${value.toFixed(2)} V`);
          await executeStatements(runtime, statement.body, hooks);
          value += step;
          iteration += 1;
        }
        break;
      }
      case 'wait':
        await sleep(Math.round(Math.max(0, statement.seconds) * 1000), hooks.signal);
        break;
      case 'measure-current': {
        const state = runtime.getState().result;
        hooks.onLog?.(
          state.status === 'closed' && Number.isFinite(state.current)
            ? `Амперметр: ${state.current.toFixed(3)} A`
            : `Амперметр: измерение недоступно (${state.status})`,
          'measurement',
        );
        break;
      }
      case 'record':
        runtime.captureMeasurement();
        hooks.onLog?.('Измерение записано в таблицу.', 'measurement');
        break;
      case 'plot':
        hooks.onLog?.('График I(U) обновлён по MeasurementStore.', 'success');
        break;
    }
  }
}

export async function executeExperimentProgram(
  runtime: SimulationRuntime,
  program: ExperimentProgram,
  hooks: ExperimentExecutionHooks = {},
): Promise<void> {
  await executeStatements(runtime, program.statements, hooks);
  if (!hooks.signal?.aborted) hooks.onLog?.('Программа эксперимента завершена.', 'success');
}
