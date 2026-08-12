export type PythonCircuitStatus = 'open' | 'closed' | 'short-circuit' | 'invalid';

export interface PythonInitialState {
  readonly voltage: number;
  readonly resistance: number;
  readonly circuitStatus: PythonCircuitStatus;
  readonly seriesResistanceOffset: number;
  readonly ammeterRange: number;
}

export type PythonLabEvent =
  | { readonly type: 'connect-standard' }
  | { readonly type: 'clear-measurements' }
  | { readonly type: 'set-voltage'; readonly value: number }
  | { readonly type: 'set-resistance'; readonly value: number }
  | { readonly type: 'wait'; readonly seconds: number }
  | {
      readonly type: 'record';
      readonly voltage: number;
      readonly current: number;
      readonly resistance: number;
      readonly power: number;
    }
  | { readonly type: 'plot'; readonly x: string; readonly y: string };

export interface PythonFinalState {
  readonly voltage: number;
  readonly resistance: number;
  readonly current: number | null;
  readonly power: number | null;
  readonly circuitStatus: PythonCircuitStatus;
}

export interface PythonRunResult {
  readonly events: readonly PythonLabEvent[];
  readonly stdout: readonly string[];
  readonly finalState: PythonFinalState;
}

export type PythonWorkerRequest =
  | { readonly type: 'init'; readonly id: number }
  | {
      readonly type: 'run';
      readonly id: number;
      readonly code: string;
      readonly initial: PythonInitialState;
    };

export type PythonWorkerResponse =
  | { readonly type: 'ready'; readonly id: number; readonly version: string }
  | { readonly type: 'run-result'; readonly id: number; readonly result: PythonRunResult }
  | { readonly type: 'error'; readonly id: number; readonly error: string };
