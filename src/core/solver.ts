import type { CircuitSnapshot } from './circuit';
import { solveResistiveNetwork } from './resistiveNetwork';
import type { SimulationResult } from './types';

/**
 * Solve the electrical network from its actual topology.
 *
 * The previous implementation followed a single path from source + to source -.
 * That was sufficient for the first one-resistor Ohm experiment but produced
 * incorrect physics as soon as the bench gained multiple parallel branches.
 * The nodal solver now handles series, parallel and mixed resistive networks,
 * while preserving the same SimulationResult contract used by the UI,
 * measurements, Blocks and Python modes.
 */
export function solveCircuit(snapshot: CircuitSnapshot): SimulationResult {
  return solveResistiveNetwork(snapshot);
}
