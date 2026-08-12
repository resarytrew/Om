import type {
  ChargedPlateParameters,
  ChargedPlateResult,
  FieldWorkerRequest,
  FieldWorkerResponse,
} from './protocol';

interface PendingRequest {
  readonly resolve: (response: FieldWorkerResponse) => void;
  readonly reject: (error: Error) => void;
}

export class ScientificFieldClient {
  private worker: Worker;
  private requestId = 0;
  private readyPromise: Promise<string> | null = null;
  private readonly pending = new Map<number, PendingRequest>();

  constructor() {
    this.worker = this.createWorker();
  }

  initialize(): Promise<string> {
    this.readyPromise ??= this.request({ type: 'init', id: this.nextId() }).then((response) => {
      if (response.type === 'error') throw new Error(response.error);
      if (response.type !== 'ready') throw new Error('Unexpected scientific-worker response.');
      return response.pyodideVersion;
    });
    return this.readyPromise;
  }

  async solve(parameters: ChargedPlateParameters): Promise<ChargedPlateResult> {
    await this.initialize();
    const response = await this.request({
      type: 'solve',
      id: this.nextId(),
      parameters,
    });
    if (response.type === 'error') throw new Error(response.error);
    if (response.type !== 'result') throw new Error('Unexpected scientific-worker response.');
    return response.result;
  }

  restart(): void {
    const error = new Error('Scientific worker restarted.');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.worker.terminate();
    this.worker = this.createWorker();
    this.readyPromise = null;
  }

  dispose(): void {
    const error = new Error('Scientific field client disposed.');
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
    this.worker.terminate();
    this.readyPromise = null;
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('../../workers/scientific-field.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.addEventListener('message', (event: MessageEvent<FieldWorkerResponse>) => {
      const response = event.data;
      const pending = this.pending.get(response.id);
      if (!pending) return;
      this.pending.delete(response.id);
      pending.resolve(response);
    });
    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Scientific worker failed.');
      for (const request of this.pending.values()) request.reject(error);
      this.pending.clear();
      this.readyPromise = null;
    });
    return worker;
  }

  private request(message: FieldWorkerRequest): Promise<FieldWorkerResponse> {
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
