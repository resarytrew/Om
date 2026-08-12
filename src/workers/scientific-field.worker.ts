import { loadPyodide, version } from 'pyodide';
import solverSource from '../scientific/python/charged_plate_solver.py?raw';
import type {
  ChargedPlateResult,
  FieldWorkerRequest,
  FieldWorkerResponse,
} from '../scientific/field/protocol';

const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

interface WorkerScope {
  postMessage(message: FieldWorkerResponse): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<FieldWorkerRequest>) => void,
  ): void;
}

const scope = self as unknown as WorkerScope;
let runtimePromise: ReturnType<typeof loadPyodide> | null = null;
let initialized = false;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function runtime() {
  runtimePromise ??= loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  const pyodide = await runtimePromise;
  if (!initialized) {
    await pyodide.loadPackage('numpy');
    await pyodide.runPythonAsync(solverSource);
    initialized = true;
  }
  return pyodide;
}

async function solve(parameters: FieldWorkerRequest & { type: 'solve' }): Promise<ChargedPlateResult> {
  const pyodide = await runtime();
  pyodide.globals.set('__field_parameters_json', JSON.stringify(parameters.parameters));
  const serialized = await pyodide.runPythonAsync(
    'solve_json(__field_parameters_json)',
  );
  if (typeof serialized !== 'string') {
    throw new Error('Scientific solver returned a non-serializable result.');
  }
  return JSON.parse(serialized) as ChargedPlateResult;
}

scope.addEventListener('message', (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === 'init') {
        await runtime();
        scope.postMessage({ type: 'ready', id: request.id, pyodideVersion: version });
        return;
      }
      scope.postMessage({ type: 'result', id: request.id, result: await solve(request) });
    } catch (error) {
      scope.postMessage({ type: 'error', id: request.id, error: message(error) });
    }
  })();
});
