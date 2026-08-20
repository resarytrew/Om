import type { TerminalId } from '../../core/types';
import { ids } from './createOhmsLaw';

export type ReferenceCircuitMode = 'series' | 'parallel';

export const REFERENCE_CIRCUIT_INSTRUMENTS = [
  'source',
  'resistor',
  'resistor-02',
  'ammeter',
  'voltmeter',
] as const;

export function referenceCircuitConnections(
  mode: ReferenceCircuitMode,
): readonly (readonly [TerminalId, TerminalId])[] {
  if (mode === 'parallel') {
    return [
      [ids.sourcePlus, ids.resistorA],
      [ids.sourcePlus, ids.resistor2A],
      [ids.resistorB, ids.ammeterPlus],
      [ids.resistor2B, ids.ammeterPlus],
      [ids.ammeterMinus, ids.sourceMinus],
      [ids.voltmeterPlus, ids.resistorA],
      [ids.voltmeterMinus, ids.resistorB],
    ];
  }

  return [
    [ids.sourcePlus, ids.resistorA],
    [ids.resistorB, ids.resistor2A],
    [ids.resistor2B, ids.ammeterPlus],
    [ids.ammeterMinus, ids.sourceMinus],
    [ids.voltmeterPlus, ids.resistorA],
    [ids.voltmeterMinus, ids.resistor2B],
  ];
}

export function referenceCircuitDescription(mode: ReferenceCircuitMode): string {
  return mode === 'parallel'
    ? 'R1 и R2 подключаются параллельно. Амперметр измеряет общий ток, вольтметр — напряжение на ветвях.'
    : 'R1 и R2 подключаются последовательно. Амперметр измеряет общий ток, вольтметр — напряжение на двух резисторах.';
}
