import type {
  PythonInitialState,
  PythonRunResult,
  PythonWorkerRequest,
  PythonWorkerResponse,
} from './protocol';

interface PendingRequest {
  readonly resolve: (response: PythonWorkerResponse) => void;
  readonly reject: (error: Error) => void;
}

export class PythonRuntimeClient {
  private worker: Worker;
  private requestId = 0;
  private readonly pending = new Map<number, PendingRequest>();
  private readyPromise: Promise<string> | null = null;

  constructor() {
    this.worker = this.createWorker();
  }

  initialize(): Promise<string> {
    this.readyPromise ??= this.request({ type: 'init', id: this.nextId() }).then((response) => {
      if (response.type === 'error') throw new Error(response.error);
      if (response.type !== 'ready') throw new Error('Unexpected response while initializing Python.');
      return response.version;
    });
    return this.readyPromise;
  }

  async run(code: string, initial: PythonInitialState): Promise<PythonRunResult> {
    await this.initialize();
    const response = await this.request({ type: 'run', id: this.nextId(), code, initial });
    if (response.type === 'error') throw new Error(response.error);
    if (response.type !== 'run-result') throw new Error('Unexpected response from Python runtime.');
    return response.result;
  }

  restart(): void {
    const error = new Error('Python execution stopped.');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.worker.terminate();
    this.worker = this.createWorker();
    this.readyPromise = null;
  }

  dispose(): void {
    const error = new Error('Python runtime disposed.');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.worker.terminate();
    this.readyPromise = null;
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('../../workers/pyodide.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', (event: MessageEvent<PythonWorkerResponse>) => {
      const response = event.data;
      const request = this.pending.get(response.id);
      if (!request) return;
      this.pending.delete(response.id);
      request.resolve(response);
    });
    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Python worker failed.');
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
      this.readyPromise = null;
    });
    return worker;
  }

  private request(message: PythonWorkerRequest): Promise<PythonWorkerResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(message.id, { resolve, reject });
      this.worker.postMessage(message);
    });
  }

  private nextId(): number {
    this.requestId += 1;
    return this.requestId;
  }
}
