export type Brand<T, B extends string> = T & { readonly __brand: B };

export type ComponentId = Brand<string, 'ComponentId'>;
export type TerminalId = Brand<string, 'TerminalId'>;
export type ConnectionId = Brand<string, 'ConnectionId'>;

export const componentId = (value: string) => value as ComponentId;
export const terminalId = (value: string) => value as TerminalId;
export const connectionId = (value: string) => value as ConnectionId;

export type ComponentKind = 'voltage-source' | 'resistor' | 'lamp' | 'switch' | 'ammeter' | 'voltmeter';
export type Polarity = 'positive' | 'negative' | 'neutral';

export interface Terminal {
  readonly id: TerminalId;
  readonly componentId: ComponentId;
  readonly label: string;
  readonly polarity: Polarity;
}

export interface Connection {
  readonly id: ConnectionId;
  readonly from: TerminalId;
  readonly to: TerminalId;
}

export interface ComponentBase {
  readonly id: ComponentId;
  readonly kind: ComponentKind;
  readonly label: string;
  readonly terminals: readonly TerminalId[];
}

export interface VoltageSourceComponent extends ComponentBase {
  readonly kind: 'voltage-source';
  voltage: number;
  enabled: boolean;
  internalResistance: number;
}

export interface ResistorComponent extends ComponentBase {
  readonly kind: 'resistor';
  resistance: number;
}

export interface LampComponent extends ComponentBase {
  readonly kind: 'lamp';
  resistance: number;
  ratedVoltage: number;
}

export interface SwitchComponent extends ComponentBase {
  readonly kind: 'switch';
  closed: boolean;
}

export interface AmmeterComponent extends ComponentBase {
  readonly kind: 'ammeter';
  range: number;
  internalResistance: number;
}

export interface VoltmeterComponent extends ComponentBase {
  readonly kind: 'voltmeter';
  range: number;
  internalResistance: number;
}

export type PhysicalComponent =
  | VoltageSourceComponent
  | ResistorComponent
  | LampComponent
  | SwitchComponent
  | AmmeterComponent
  | VoltmeterComponent;

export interface Diagnostic {
  readonly code:
    | 'OPEN_CIRCUIT'
    | 'SHORT_CIRCUIT'
    | 'AMMETER_MISSING'
    | 'RESISTOR_MISSING'
    | 'AMMETER_REVERSED'
    | 'AMMETER_OVERRANGE'
    | 'VOLTMETER_NOT_PARALLEL';
  readonly severity: 'info' | 'warning' | 'error';
  readonly message: string;
}

export interface ComponentMeasurement {
  readonly current?: number;
  readonly voltage?: number;
  readonly power?: number;
  readonly overload?: boolean;
}

export interface SimulationResult {
  readonly status: 'open' | 'closed' | 'short-circuit' | 'invalid';
  readonly sourceVoltage: number;
  readonly equivalentResistance: number | null;
  readonly current: number;
  readonly power: number;
  readonly diagnostics: readonly Diagnostic[];
  readonly measurements: Readonly<Record<string, ComponentMeasurement>>;
}
