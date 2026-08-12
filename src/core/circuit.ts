import type {
  Connection,
  ConnectionId,
  PhysicalComponent,
  Terminal,
  TerminalId,
} from './types';
import { connectionId } from './types';

export interface CircuitSnapshot {
  readonly components: readonly PhysicalComponent[];
  readonly terminals: readonly Terminal[];
  readonly connections: readonly Connection[];
}

export class CircuitModel {
  private readonly components = new Map<string, PhysicalComponent>();
  private readonly terminals = new Map<string, Terminal>();
  private readonly connections = new Map<string, Connection>();
  private nextConnection = 1;

  addComponent(component: PhysicalComponent, terminals: readonly Terminal[]): void {
    if (this.components.has(component.id)) {
      throw new Error(`Component already exists: ${component.id}`);
    }
    this.components.set(component.id, component);
    for (const terminal of terminals) {
      if (this.terminals.has(terminal.id)) {
        throw new Error(`Terminal already exists: ${terminal.id}`);
      }
      this.terminals.set(terminal.id, terminal);
    }
  }

  getComponent(id: string): PhysicalComponent {
    const component = this.components.get(id);
    if (!component) throw new Error(`Unknown component: ${id}`);
    return component;
  }

  getTerminal(id: TerminalId): Terminal {
    const terminal = this.terminals.get(id);
    if (!terminal) throw new Error(`Unknown terminal: ${id}`);
    return terminal;
  }

  connect(from: TerminalId, to: TerminalId): Connection {
    if (from === to) throw new Error('A terminal cannot connect to itself.');
    this.getTerminal(from);
    this.getTerminal(to);

    const duplicate = [...this.connections.values()].find(
      (connection) =>
        (connection.from === from && connection.to === to) ||
        (connection.from === to && connection.to === from),
    );
    if (duplicate) return duplicate;

    const id = connectionId(`wire-${this.nextConnection++}`);
    const connection: Connection = { id, from, to };
    this.connections.set(id, connection);
    return connection;
  }

  disconnect(id: ConnectionId): void {
    this.connections.delete(id);
  }

  disconnectTerminal(terminal: TerminalId): void {
    for (const connection of [...this.connections.values()]) {
      if (connection.from === terminal || connection.to === terminal) {
        this.connections.delete(connection.id);
      }
    }
  }

  clearConnections(): void {
    this.connections.clear();
  }

  snapshot(): CircuitSnapshot {
    return {
      components: [...this.components.values()],
      terminals: [...this.terminals.values()],
      connections: [...this.connections.values()],
    };
  }
}
