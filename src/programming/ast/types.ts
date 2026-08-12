export interface AstNodeBase {
  readonly sourceBlockId: string;
}

export type ExperimentStatement =
  | (AstNodeBase & { readonly type: 'connect-standard' })
  | (AstNodeBase & { readonly type: 'clear-measurements' })
  | (AstNodeBase & { readonly type: 'set-resistance'; readonly value: number })
  | (AstNodeBase & {
      readonly type: 'sweep-voltage';
      readonly from: number;
      readonly to: number;
      readonly step: number;
      readonly body: readonly ExperimentStatement[];
    })
  | (AstNodeBase & { readonly type: 'wait'; readonly seconds: number })
  | (AstNodeBase & { readonly type: 'measure-current' })
  | (AstNodeBase & { readonly type: 'record' })
  | (AstNodeBase & { readonly type: 'plot'; readonly x: 'U'; readonly y: 'I' });

export interface ExperimentProgram {
  readonly version: 1;
  readonly statements: readonly ExperimentStatement[];
}

export class ExperimentProgramError extends Error {
  constructor(message: string, readonly blockId?: string) {
    super(message);
    this.name = 'ExperimentProgramError';
  }
}
