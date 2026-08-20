import type { CircuitSnapshot } from './circuit';
import type {
  AmmeterComponent,
  ComponentMeasurement,
  Diagnostic,
  LampComponent,
  PhysicalComponent,
  ResistorComponent,
  SimulationResult,
  VoltageSourceComponent,
  VoltmeterComponent,
} from './types';

type LoadComponent = ResistorComponent | LampComponent;
type NetworkComponent = LoadComponent | AmmeterComponent | VoltmeterComponent;

interface NetworkEdge {
  readonly component: NetworkComponent;
  readonly a: string;
  readonly b: string;
  readonly resistance: number;
}

const EPSILON = 1e-9;
const IDEAL_WIRE_THRESHOLD = 1e-9;

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

function isLoad(component: PhysicalComponent): component is LoadComponent {
  return component.kind === 'resistor' || component.kind === 'lamp';
}

function terminalPair(component: PhysicalComponent): readonly [string, string] | null {
  const a = component.terminals[0];
  const b = component.terminals[1];
  return a && b ? [a, b] : null;
}

function addAdjacency(graph: Map<string, Set<string>>, a: string, b: string): void {
  const fromA = graph.get(a) ?? new Set<string>();
  fromA.add(b);
  graph.set(a, fromA);
  const fromB = graph.get(b) ?? new Set<string>();
  fromB.add(a);
  graph.set(b, fromB);
}

function reachableNodes(graph: Map<string, Set<string>>, start: string): Set<string> {
  const visited = new Set<string>();
  const queue = [start];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node || visited.has(node)) continue;
    visited.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return visited;
}

function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  if (n === 0) return [];

  const a = matrix.map((row, index) => [...row, rhs[index] ?? 0]);
  for (let column = 0; column < n; column += 1) {
    let pivot = column;
    let pivotValue = Math.abs(a[pivot]?.[column] ?? 0);
    for (let row = column + 1; row < n; row += 1) {
      const candidate = Math.abs(a[row]?.[column] ?? 0);
      if (candidate > pivotValue) {
        pivot = row;
        pivotValue = candidate;
      }
    }
    if (pivotValue < EPSILON) return null;

    if (pivot !== column) {
      const temp = a[column]!;
      a[column] = a[pivot]!;
      a[pivot] = temp;
    }

    const pivotRow = a[column]!;
    const divisor = pivotRow[column]!;
    for (let index = column; index <= n; index += 1) {
      pivotRow[index] = (pivotRow[index] ?? 0) / divisor;
    }

    for (let row = 0; row < n; row += 1) {
      if (row === column) continue;
      const target = a[row]!;
      const factor = target[column] ?? 0;
      if (Math.abs(factor) < EPSILON) continue;
      for (let index = column; index <= n; index += 1) {
        target[index] = (target[index] ?? 0) - factor * (pivotRow[index] ?? 0);
      }
    }
  }

  return a.map((row) => row[n] ?? 0);
}

function buildNetwork(snapshot: CircuitSnapshot): {
  readonly nodes: Map<string, string>;
  readonly mainEdges: NetworkEdge[];
  readonly meterEdges: NetworkEdge[];
} {
  const uf = new UnionFind();
  for (const terminal of snapshot.terminals) uf.add(terminal.id);
  for (const connection of snapshot.connections) uf.union(connection.from, connection.to);

  for (const component of snapshot.components) {
    const pair = terminalPair(component);
    if (!pair) continue;
    if (component.kind === 'switch' && component.closed) uf.union(pair[0], pair[1]);
    if (component.kind === 'ammeter' && component.internalResistance <= IDEAL_WIRE_THRESHOLD) {
      uf.union(pair[0], pair[1]);
    }
  }

  const nodes = new Map<string, string>();
  for (const terminal of snapshot.terminals) nodes.set(terminal.id, uf.find(terminal.id));

  const mainEdges: NetworkEdge[] = [];
  const meterEdges: NetworkEdge[] = [];
  for (const component of snapshot.components) {
    const pair = terminalPair(component);
    if (!pair) continue;
    const a = nodes.get(pair[0]);
    const b = nodes.get(pair[1]);
    if (!a || !b || a === b) continue;

    if (isLoad(component)) {
      mainEdges.push({ component, a, b, resistance: Math.max(component.resistance, EPSILON) });
    } else if (component.kind === 'ammeter' && component.internalResistance > IDEAL_WIRE_THRESHOLD) {
      mainEdges.push({ component, a, b, resistance: Math.max(component.internalResistance, EPSILON) });
    } else if (component.kind === 'voltmeter' && Number.isFinite(component.internalResistance)) {
      meterEdges.push({ component, a, b, resistance: Math.max(component.internalResistance, EPSILON) });
    }
  }

  return { nodes, mainEdges, meterEdges };
}

function solveNodeVoltages(
  edges: readonly NetworkEdge[],
  connected: Set<string>,
  plusNode: string,
  minusNode: string,
  appliedVoltage: number,
): Map<string, number> | null {
  const unknown = [...connected].filter((node) => node !== plusNode && node !== minusNode);
  const indexByNode = new Map(unknown.map((node, index) => [node, index]));
  const matrix = unknown.map(() => unknown.map(() => 0));
  const rhs = unknown.map(() => 0);
  const fixed = new Map<string, number>([
    [plusNode, appliedVoltage],
    [minusNode, 0],
  ]);

  for (const edge of edges) {
    if (!connected.has(edge.a) || !connected.has(edge.b)) continue;
    const conductance = 1 / edge.resistance;
    for (const [node, other] of [[edge.a, edge.b], [edge.b, edge.a]] as const) {
      const row = indexByNode.get(node);
      if (row === undefined) continue;
      matrix[row]![row] = (matrix[row]?.[row] ?? 0) + conductance;
      const otherColumn = indexByNode.get(other);
      if (otherColumn !== undefined) {
        matrix[row]![otherColumn] = (matrix[row]?.[otherColumn] ?? 0) - conductance;
      } else {
        rhs[row] = (rhs[row] ?? 0) + conductance * (fixed.get(other) ?? 0);
      }
    }
  }

  const solution = solveLinearSystem(matrix, rhs);
  if (!solution) return null;

  const voltages = new Map<string, number>(fixed);
  unknown.forEach((node, index) => voltages.set(node, solution[index] ?? 0));
  return voltages;
}

function sourceCurrent(
  edges: readonly NetworkEdge[],
  voltages: Map<string, number>,
  plusNode: string,
): number {
  let current = 0;
  for (const edge of edges) {
    const va = voltages.get(edge.a) ?? 0;
    const vb = voltages.get(edge.b) ?? 0;
    if (edge.a === plusNode) current += (va - vb) / edge.resistance;
    else if (edge.b === plusNode) current += (vb - va) / edge.resistance;
  }
  return Math.max(0, current);
}

function componentVoltage(
  component: PhysicalComponent,
  nodes: Map<string, string>,
  voltages: Map<string, number>,
): number | null {
  const pair = terminalPair(component);
  if (!pair) return null;
  const a = nodes.get(pair[0]);
  const b = nodes.get(pair[1]);
  if (!a || !b || !voltages.has(a) || !voltages.has(b)) return null;
  return (voltages.get(a) ?? 0) - (voltages.get(b) ?? 0);
}

export function solveResistiveNetwork(snapshot: CircuitSnapshot): SimulationResult {
  const source = snapshot.components.find(
    (component): component is VoltageSourceComponent => component.kind === 'voltage-source',
  );
  if (!source) throw new Error('The experiment requires a voltage source.');
  const sourcePlus = source.terminals[0];
  const sourceMinus = source.terminals[1];
  if (!sourcePlus || !sourceMinus) throw new Error('Voltage source must have two terminals.');

  const diagnostics: Diagnostic[] = [];
  const measurements: Record<string, ComponentMeasurement> = {};
  const { nodes, mainEdges, meterEdges } = buildNetwork(snapshot);
  const plusNode = nodes.get(sourcePlus);
  const minusNode = nodes.get(sourceMinus);
  if (!plusNode || !minusNode) throw new Error('Source terminals are not part of the circuit graph.');

  if (plusNode === minusNode) {
    diagnostics.push({
      code: 'SHORT_CIRCUIT',
      severity: 'error',
      message: 'Обнаружено соединение «+» и «−» источника без сопротивления.',
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

  const mainGraph = new Map<string, Set<string>>();
  for (const edge of mainEdges) addAdjacency(mainGraph, edge.a, edge.b);
  const connected = reachableNodes(mainGraph, plusNode);
  if (!connected.has(minusNode)) {
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

  const allEdges = [...mainEdges, ...meterEdges];
  const fullGraph = new Map<string, Set<string>>();
  for (const edge of allEdges) addAdjacency(fullGraph, edge.a, edge.b);
  const fullConnected = reachableNodes(fullGraph, plusNode);

  const unitVoltages = solveNodeVoltages(allEdges, fullConnected, plusNode, minusNode, 1);
  if (!unitVoltages) {
    diagnostics.push({
      code: 'OPEN_CIRCUIT',
      severity: 'error',
      message: 'Не удалось однозначно определить потенциалы узлов цепи.',
    });
    return {
      status: 'invalid',
      sourceVoltage: source.voltage,
      equivalentResistance: null,
      current: 0,
      power: 0,
      diagnostics,
      measurements,
    };
  }

  const unitCurrent = sourceCurrent(allEdges, unitVoltages, plusNode);
  const networkResistance = unitCurrent > EPSILON ? 1 / unitCurrent : Number.POSITIVE_INFINITY;
  const totalResistance = networkResistance + Math.max(0, source.internalResistance);
  const equivalentResistance = Number.isFinite(totalResistance) ? totalResistance : null;
  const appliedVoltage = source.enabled ? source.voltage : 0;
  const terminalVoltage = totalResistance > EPSILON && Number.isFinite(totalResistance)
    ? appliedVoltage * (networkResistance / totalResistance)
    : appliedVoltage;
  const voltages = solveNodeVoltages(allEdges, fullConnected, plusNode, minusNode, terminalVoltage)
    ?? new Map<string, number>([[plusNode, terminalVoltage], [minusNode, 0]]);
  const current = source.enabled && Number.isFinite(totalResistance) && totalResistance > EPSILON
    ? appliedVoltage / totalResistance
    : 0;

  const loads = snapshot.components.filter(isLoad);
  for (const load of loads) {
    const signedVoltage = componentVoltage(load, nodes, voltages);
    if (signedVoltage === null) continue;
    const voltage = Math.abs(signedVoltage);
    const loadCurrent = voltage / Math.max(load.resistance, EPSILON);
    measurements[load.id] = { current: loadCurrent, voltage, power: voltage * loadCurrent };
  }

  const ammeters = snapshot.components.filter(
    (component): component is AmmeterComponent => component.kind === 'ammeter',
  );
  const activeAmmeters = ammeters.filter((ammeter) => {
    const pair = terminalPair(ammeter);
    if (!pair) return false;
    const a = nodes.get(pair[0]);
    const b = nodes.get(pair[1]);
    return Boolean(a && b && fullConnected.has(a) && fullConnected.has(b));
  });
  if (activeAmmeters.length === 0) {
    diagnostics.push({
      code: 'AMMETER_MISSING',
      severity: 'warning',
      message: 'Цепь замкнута, но амперметр не включён в измеряемую цепь.',
    });
  }

  for (const ammeter of activeAmmeters) {
    let signedCurrent = current;
    if (ammeter.internalResistance > IDEAL_WIRE_THRESHOLD) {
      const signedVoltage = componentVoltage(ammeter, nodes, voltages) ?? 0;
      signedCurrent = signedVoltage / Math.max(ammeter.internalResistance, EPSILON);
    }
    if (signedCurrent < -EPSILON) {
      diagnostics.push({
        code: 'AMMETER_REVERSED',
        severity: 'warning',
        message: 'Амперметр подключён с обратной полярностью.',
      });
    }
    const overload = Math.abs(signedCurrent) > ammeter.range;
    if (overload) {
      diagnostics.push({
        code: 'AMMETER_OVERRANGE',
        severity: 'warning',
        message: `Ток превышает диапазон амперметра ${ammeter.range} А.`,
      });
    }
    measurements[ammeter.id] = { current: signedCurrent, overload };
  }

  const voltmeters = snapshot.components.filter(
    (component): component is VoltmeterComponent => component.kind === 'voltmeter',
  );
  for (const voltmeter of voltmeters) {
    const measuredVoltage = componentVoltage(voltmeter, nodes, voltages);
    if (measuredVoltage === null) {
      measurements[voltmeter.id] = { voltage: 0 };
      diagnostics.push({
        code: 'VOLTMETER_NOT_PARALLEL',
        severity: 'info',
        message: 'Подключите обе клеммы вольтметра к узлам измеряемого участка.',
      });
    } else {
      measurements[voltmeter.id] = { voltage: measuredVoltage };
    }
  }

  const power = appliedVoltage * current;
  return {
    status: diagnostics.some((diagnostic) => diagnostic.severity === 'error') ? 'invalid' : 'closed',
    sourceVoltage: source.voltage,
    equivalentResistance,
    current,
    power,
    diagnostics,
    measurements,
  };
}

export function connectedResistiveLoadCount(snapshot: CircuitSnapshot): number {
  const connectedTerminals = new Set<string>();
  for (const connection of snapshot.connections) {
    connectedTerminals.add(connection.from);
    connectedTerminals.add(connection.to);
  }
  return snapshot.components.filter((component) =>
    isLoad(component) && component.terminals.some((terminal) => connectedTerminals.has(terminal)),
  ).length;
}
