import { Color3, DynamicTexture, MeshBuilder, PBRMaterial, Scene, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { TerminalId } from '../../core/types';
import type { InstrumentTheme } from './InstrumentTheme';
import type { TerminalRegistrar } from './ProfessionalInstruments';

export class CompactResistorVisual {
  private readonly bodyMaterial: PBRMaterial;

  constructor(
    scene: Scene,
    theme: InstrumentTheme,
    id: 'resistor-02' | 'resistor-03' | 'resistor-04',
    label: string,
    position: Vector3,
    terminalA: TerminalId,
    terminalB: TerminalId,
    registerTerminal: TerminalRegistrar,
  ) {
    const base = MeshBuilder.CreateBox(`${id}-base`, { width: 2.0, height: 0.24, depth: 1.0 }, scene);
    base.position = new Vector3(position.x, 0.2, position.z);
    base.material = theme.graphite;
    base.isPickable = true;

    const deck = MeshBuilder.CreateBox(`${id}-deck`, { width: 1.78, height: 0.08, depth: 0.78 }, scene);
    deck.position = new Vector3(position.x, 0.36, position.z + 0.03);
    deck.material = theme.meterPanel;
    deck.isPickable = true;

    this.bodyMaterial = theme.ceramic.clone(`${id}-ceramic-material`);
    const body = MeshBuilder.CreateCylinder(`${id}-body`, { height: 1.18, diameter: 0.38, tessellation: 40 }, scene);
    body.position = new Vector3(position.x, 0.66, position.z + 0.04);
    body.rotation.z = Math.PI / 2;
    body.material = this.bodyMaterial;
    body.isPickable = true;

    for (const x of [-0.62, 0.62]) {
      const holder = MeshBuilder.CreateCylinder(`${id}-holder-${x}`, { height: 0.24, diameter: 0.18, tessellation: 28 }, scene);
      holder.position = new Vector3(position.x + x, 0.5, position.z + 0.04);
      holder.material = theme.chrome;
      holder.isPickable = false;
    }

    registerTerminal(terminalA, new Vector3(position.x - 0.69, 0.22, position.z - 0.54), 'neutral');
    registerTerminal(terminalB, new Vector3(position.x + 0.69, 0.22, position.z - 0.54), 'neutral');

    const labelPlane = MeshBuilder.CreatePlane(`${id}-label`, { width: 1.36, height: 0.28 }, scene);
    labelPlane.position = new Vector3(position.x, 0.415, position.z - 0.1);
    labelPlane.rotation.x = Math.PI / 2;
    labelPlane.isPickable = false;
    const texture = new DynamicTexture(`${id}-label-texture`, { width: 640, height: 180 }, scene, true);
    texture.hasAlpha = true;
    texture.drawText(`${label} · 3 Ω`, null, 118, '700 70px Inter, Arial, sans-serif', '#dbe6eb', 'transparent', true);
    const labelMaterial = new StandardMaterial(`${id}-label-material`, scene);
    labelMaterial.diffuseTexture = texture;
    labelMaterial.emissiveTexture = texture;
    labelMaterial.opacityTexture = texture;
    labelMaterial.emissiveColor = Color3.White();
    labelMaterial.disableLighting = true;
    labelMaterial.backFaceCulling = false;
    labelPlane.material = labelMaterial;
  }

  setPower(power: number): void {
    const warmth = Math.min(1, Math.max(0, power / 8));
    this.bodyMaterial.emissiveColor = new Color3(0.22 * warmth, 0.055 * warmth, 0.008 * warmth);
  }
}
