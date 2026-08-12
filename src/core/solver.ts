import type { CircuitSnapshot } from './circuit';
import type {
  AmmeterComponent,
  ComponentMeasurement,
  Diagnostic,
  PhysicalComponent,
  ResistorComponent,
  SimulationResult,
  TerminalId,
  VoltageSourceComponent,
  VoltmeterComponent,
} from './types';

interface GraphEdge {
  readonly to: TerminalId;
  readonly component?: PhysicalComponent;
}

const key = (id: TerminalId) => id as string;

function addEdge(graph: Map<string, GraphEdge[]>, from: TerminalId, edge: GraphEdge): void {
  const list = graph.get(key(from)) ?? [];
  list.push(edge);
  graph.set(key(from), list);
}

function componentBetweenTerminals(component: PhysicalComponent): boolean {
  return component.kind === 'resistor' || component.kind === 'ammeter';
}

function buildConductionGraph(snapshot: CircuitSnapshot): Map<string, GraphEdge[]> {
  const graph = new Map<string, GraphEdge[]>();
  for (const connection of snapshot.connections) {
    addEdge(graph, connection.from, { to: connection.to });
    addEdge(graph, connection.to, { to: connection.from });
  }

  for (const component of snapshot.components) {
    if (!componentBetweenTerminals(component) || component.terminals.length !== 2) continue;
    const [a, b] = component.terminals;
    if (!a || !b) continue;
    addEdge(graph, a, { to: b, component });
    addEdge(graph, b, { to: a, component });
  }
  return graph;
}

interface PathResult {
  readonly terminals: readonly TerminalId[];
  readonly components: readonly PhysicalComponent[];
}

function findPath(
  graph: Map<string, GraphEdge[]>,
  start: TerminalId,
  target: TerminalId,
): PathResult | null {
  const queue: Array<{ terminal: TerminalId; terminals: TerminalId[]; components: PhysicalComponent[] }> = [
    { terminal: start, terminals: [start], components: [] },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    if (item.terminal === target) {
      return { terminals: item.terminals, components: item.components };
    }
    if (visited.has(key(item.terminal))) continue;
    visited.add(key(item.terminal));

    for (const edge of graph.get(key(item.terminal)) ?? []) {
      if (visited.has(key(edge.to))) continue;
      queue.push({
        terminal: edge.to,
        terminals: [...item.terminals, edge.to],
        components: edge.component ? [...item.components, edge.component] : item.components,
      });
    }
  }
  return null;
}

class UnionFind {
  private readonly parent = new Map<string, string>();

  add(value: string): void {
    if (!this.parent.has(value)) this.parent.set(value, value);
  }

  find(value: string): string {
    this.add(value);
    const parent = this.parent.get(value);
    if (!parent || parent === value) return value;
    const root = this.find(parent);
    this.parent.set(value, root);
    return root;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.parent.set(rootB, rootA);
  }
}

function wireNodes(snapshot: CircuitSnapshot): Map<string, string> {
  const uf = new UnionFind();
  for (const terminal of snapshot.terminals) uf.add(terminal.id);
  for (const connection of snapshot.connections) uf.union(connection.from, connection.to);
  return new Map(snapshot.terminals.map((terminal) => [terminal.id, uf.find(terminal.id)]));
}

function isAcross(componentA: PhysicalComponent, componentB: PhysicalComponent, nodes: Map<string, string>): boolean {
  if (componentA.terminals.length !== 2 || componentB.terminals.length !== 2) return false;
  const [a1, a2] = componentA.terminals;
  const [b1, b2] = componentB.terminals;
  if (!a1 || !a2 || !b1 || !b2) return false;
  const a1Node = nodes.get(a1);
  const a2Node = nodes.get(a2);
  const b1Node = nodes.get(b1);
  const b2Node = nodes.get(b2);
  return (
    (a1Node === b1Node && a2Node === b2Node) ||
    (a1Node === b2Node && a2Node === b1Node)
  );
}

export function solveCircuit(snapshot: CircuitSnapshot): SimulationResult {
  const source = snapshot.components.find((component): component is VoltageSourceComponent => component.kind === 'voltage-source');
  if (!source) throw new Error('The experiment requires a voltage source.');
  const sourcePlus = source.terminals[0];
  const sourceMinus = source.terminals[1];
  if (!sourcePlus || !sourceMinus) throw new Error('Voltage source must have two terminals.');

  const graph = buildConductionGraph(snapshot);
  const path = findPath(graph, sourcePlus, sourceMinus);
  const diagnostics: Diagnostic[] = [];
  const measurements: Record<string, ComponentMeasurement> = {};

  if (!source.enabled || source.voltage === 0) {
    return {
      status: path ? 'closed' : 'open',
      sourceVoltage: source.voltage,
      equivalentResistance: path ? 0 : null,
      current: 0,
      power: 0,
      diagnostics: path ? [] : [{ code: 'OPEN_CIRCUIT', severity: 'info', message: 'Цепь разомкнута.' }],
      measurements,
    };
  }

  if (!path) {
    diagnostics.push({ code: 'OPEN_CIRCUIT', severity: 'info', message: 'Цепь разомкнута: ток не течёт.' });
    return {
      status: 'open',
      sourceVoltage: source.voltage,
      equivalentResistance: null,
      current: 0,
      power: 0,
      diagnostics,
      measurements,
    };
  }

  const resistors = path.components.filter((component): component is ResistorComponent => component.kind === 'resistor');
  const ammeters = path.components.filter((component): component is AmmeterComponent => component.kind === 'ammeter');

  if (resistors.length === 0) {
    diagnostics.push({
      code: 'SHORT_CIRCUIT',
      severity: 'error',
      message: 'Обнаружен путь от «+» к «−» источника без нагрузки. Возможное короткое замыкание.',
    });
    return {
      status: 'short-circuit',
      sourceVoltage: source.voltage,
      equivalentResistance: 0,
      current: Number.POSITIVE_INFINITY,
      power: Number.POSITIVE_INFINITY,
      diagnostics,
      measurements,
    };
  }

  if (ammeters.length === 0) {
    diagnostics.push({
      code: 'AMMETER_MISSING',
      severity: 'warning',
      message: 'Цепь замкнута, но амперметр не включён последовательно в измеряемую ветвь.',
    });
  }

  const totalResistance =
    resistors.reduce((sum, resistor) => sum + Math.max(resistor.resistance, 1e-9), 0) +
    ammeters.reduce((sum, ammeter) => sum + Math.max(ammeter.internalResistance, 0), 0) +
    Math.max(source.internalResistance, 0);
  const current = source.voltage / totalResistance;
  const power = source.voltage * current;

  for (const resistor of resistors) {
    measurements[resistor.id] = {
      current,
      voltage: current * resistor.resistance,
      power: current * current * resistor.resistance,
    };
  }

  for (const ammeter of ammeters) {
    const [plus, minus] = ammeter.terminals;
    let signedCurrent = current;
    if (plus && minus) {
      const plusIndex = path.terminals.indexOf(plus);
      const minusIndex = path.terminals.indexOf(minus);
      if (plusIndex >= 0 && minusIndex >= 0 && plusIndex > minusIndex) {
        signedCurrent = -current;
        diagnostics.push({
          code: 'AMMETER_REVERSED',
          severity: 'warning',
          message: 'Амперметр подключён с обратной полярностью.',
        });
      }
    }
    const overload = Math.abs(current) > ammeter.range;
    if (overload) {
      diagnostics.push({
        code: 'AMMETER_OVERRANGE',
        severity: 'warning',
        message: `Ток превышает диапазон амперметра ${ammeter.range} А.`,
      });
    }
    measurements[ammeter.id] = { current: signedCurrent, overload };
  }

  const nodes = wireNodes(snapshot);
  const voltmeters = snapshot.components.filter((component): component is VoltmeterComponent => component.kind === 'voltmeter');
  const targetResistor = resistors[0];
  for (const voltmeter of voltmeters) {
    if (targetResistor && isAcross(voltmeter, targetResistor, nodes)) {
      measurements[voltmeter.id] = { voltage: current * targetResistor.resistance };
    } else {
      measurements[voltmeter.id] = { voltage: 0 };
      diagnostics.push({
        code: 'VOLTMETER_NOT_PARALLEL',
        severity: 'info',
        message: 'Вольтметр должен быть подключён параллельно резистору.',
      });
    }
  }

  return {
    status: diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'invalid' : 'closed',
    sourceVoltage: source.voltage,
    equivalentResistance: totalResistance,
    current,
    power,
    diagnostics,
    measurements,
  };
}
