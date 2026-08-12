import { describe, expect, it } from 'vitest';
import { createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';

describe('wire editing runtime API', () => {
  it('cancels an in-progress terminal selection without changing topology', () => {
    const runtime = createOhmsLawRuntime();
    runtime.chooseTerminal(ids.sourcePlus);
    expect(runtime.getState().selectedTerminal).toBe(ids.sourcePlus);
    expect(runtime.circuit.snapshot().connections).toHaveLength(0);

    runtime.cancelTerminalSelection();

    expect(runtime.getState().selectedTerminal).toBeNull();
    expect(runtime.circuit.snapshot().connections).toHaveLength(0);
  });

  it('recalculates immediately after deleting a selected wire', () => {
    const runtime = createOhmsLawRuntime();
    runtime.chooseTerminal(ids.sourcePlus);
    runtime.chooseTerminal(ids.resistorA);
    runtime.chooseTerminal(ids.resistorB);
    runtime.chooseTerminal(ids.ammeterPlus);
    runtime.chooseTerminal(ids.ammeterMinus);
    runtime.chooseTerminal(ids.sourceMinus);

    expect(runtime.getState().result.status).toBe('closed');
    const connection = runtime.circuit.snapshot().connections[0];
    expect(connection).toBeDefined();
    if (!connection) return;

    runtime.removeConnection(connection.id);

    expect(runtime.getState().result.status).toBe('open');
    expect(runtime.getState().result.current).toBe(0);
  });
});
