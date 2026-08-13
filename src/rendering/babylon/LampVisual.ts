import { Color3, MeshBuilder, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { TerminalId } from '../../core/types';
import type { InstrumentTheme } from './InstrumentTheme';
import type { TerminalRegistrar } from './ProfessionalInstruments';

export class LampVisual {
  private readonly bulbMaterial: StandardMaterial;

  constructor(scene: Scene, theme: InstrumentTheme, position: Vector3, terminalA: TerminalId, terminalB: TerminalId, registerTerminal: TerminalRegistrar) {
    const base = MeshBuilder.CreateCylinder('lamp-01-base', { height: 0.22, diameter: 1.52, tessellation: 48 }, scene);
    base.position = new Vector3(position.x, 0.17, position.z);
    base.material = theme.graphite;
    base.isPickable = true;

    this.bulbMaterial = new StandardMaterial('lamp-01-bulb-material', scene);
    this.bulbMaterial.diffuseColor = new Color3(0.72, 0.76, 0.78);
    this.bulbMaterial.alpha = 0.45;
    const bulb = MeshBuilder.CreateSphere('lamp-01-bulb', { diameter: 1.04, segments: 40 }, scene);
    bulb.position = new Vector3(position.x, 0.98, position.z + 0.08);
    bulb.scaling.y = 1.16;
    bulb.material = this.bulbMaterial;
    bulb.isPickable = true;

    registerTerminal(terminalA, new Vector3(position.x - 0.55, 0.2, position.z - 0.72), 'neutral');
    registerTerminal(terminalB, new Vector3(position.x + 0.55, 0.2, position.z - 0.72), 'neutral');
  }

  setElectrical(voltage: number, power: number): void {
    const brightness = Math.min(1, Math.max(0, Math.max(Math.abs(voltage) / 6, power / 3)));
    this.bulbMaterial.emissiveColor = new Color3(1, 0.43, 0.08).scale(0.7 * brightness);
  }
}
