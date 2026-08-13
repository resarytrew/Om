import { MeshBuilder, Scene, TransformNode, Vector3 } from '@babylonjs/core';
import type { TerminalId } from '../../core/types';
import type { InstrumentTheme } from './InstrumentTheme';
import type { TerminalRegistrar } from './ProfessionalInstruments';

export class CircuitKeyVisual {
  private readonly leverPivot: TransformNode;

  constructor(
    scene: Scene,
    theme: InstrumentTheme,
    position: Vector3,
    terminalA: TerminalId,
    terminalB: TerminalId,
    registerTerminal: TerminalRegistrar,
  ) {
    const base = MeshBuilder.CreateBox('switch-01-base', { width: 1.9, height: 0.22, depth: 1.06 }, scene);
    base.position = new Vector3(position.x, 0.2, position.z);
    base.material = theme.graphite;
    base.isPickable = true;

    const deck = MeshBuilder.CreateBox('switch-01-deck', { width: 1.65, height: 0.07, depth: 0.82 }, scene);
    deck.position = new Vector3(position.x, 0.35, position.z + 0.02);
    deck.material = theme.meterPanel;
    deck.isPickable = true;

    for (const x of [-0.55, 0.55]) {
      const post = MeshBuilder.CreateCylinder(
        `switch-01-post-${x}`,
        { height: 0.28, diameter: 0.18, tessellation: 28 },
        scene,
      );
      post.position = new Vector3(position.x + x, 0.55, position.z + 0.03);
      post.material = theme.chrome;
      post.isPickable = false;
    }

    this.leverPivot = new TransformNode('switch-01-lever-pivot', scene);
    this.leverPivot.position = new Vector3(position.x - 0.55, 0.66, position.z + 0.03);

    const lever = MeshBuilder.CreateBox('switch-01-lever', { width: 1.2, height: 0.095, depth: 0.16 }, scene);
    lever.parent = this.leverPivot;
    lever.position = new Vector3(0.58, 0, 0);
    lever.material = theme.chrome;
    lever.isPickable = true;
    lever.metadata = { instrumentControl: 'switch-toggle' };

    const handle = MeshBuilder.CreateCylinder(
      'switch-01-handle',
      { height: 0.18, diameter: 0.24, tessellation: 32 },
      scene,
    );
    handle.parent = this.leverPivot;
    handle.position = new Vector3(0.58, 0.13, 0);
    handle.material = theme.rubberBlack;
    handle.isPickable = true;
    handle.metadata = { instrumentControl: 'switch-toggle' };

    registerTerminal(terminalA, new Vector3(position.x - 0.58, 0.22, position.z - 0.58), 'neutral');
    registerTerminal(terminalB, new Vector3(position.x + 0.58, 0.22, position.z - 0.58), 'neutral');
    this.setClosed(false);
  }

  setClosed(closed: boolean): void {
    this.leverPivot.rotation.z = closed ? 0 : -0.58;
  }
}
