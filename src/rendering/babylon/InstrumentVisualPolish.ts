import type { Scene } from '@babylonjs/core';
import type { InstrumentTheme } from './InstrumentTheme';
import { installSourceVisualPolish } from './SourceVisualPolish';
import { installMeterVisualPolish } from './MeterVisualPolish';
import { installBenchResistorPolish } from './BenchResistorPolish';

export function installOhmVisualPolish(scene: Scene, theme: InstrumentTheme): void {
  installSourceVisualPolish(scene, theme);
  installMeterVisualPolish(scene, theme);
  installBenchResistorPolish(scene, theme);
}
