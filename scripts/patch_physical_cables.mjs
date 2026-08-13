import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/rendering/babylon/LabScene.ts';
let text = readFileSync(path, 'utf8');

function replace(from, to) {
  if (!text.includes(from)) throw new Error(`Expected fragment not found:\n${from.slice(0, 240)}`);
  text = text.replace(from, to);
}

replace(
  "import { installOhmGlbShells } from './GlbInstrumentShells';",
  "import { installOhmGlbShells } from './GlbInstrumentShells';\nimport { PhysicalCable, PhysicalCableSystem, type CableCollider } from './PhysicalCable';",
);

replace(
`interface WireVisual {
  readonly meshes: readonly Mesh[];
  readonly material: PBRMaterial;
  readonly baseColor: Color3;
}`,
`interface WireVisual {
  readonly cable: PhysicalCable;
  readonly plugs: readonly Mesh[];
  readonly material: PBRMaterial;
  readonly baseColor: Color3;
}`,
);

replace(
`  private readonly connectionMeshes = new Map<string, WireVisual>();
  private bench: Mesh | null = null;`,
`  private readonly connectionMeshes = new Map<string, WireVisual>();
  private cablePhysics!: PhysicalCableSystem;
  private bench: Mesh | null = null;`,
);

replace(
`      this.source.tick(dt);
      this.ammeter.tick(dt);
      this.voltmeter.tick(dt);
      this.scene.render();`,
`      this.source.tick(dt);
      this.ammeter.tick(dt);
      this.voltmeter.tick(dt);
      this.cablePhysics.step(dt);
      this.scene.render();`,
);

replace(
`    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.previewWire?.dispose();
    this.scene.dispose();`,
`    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.previewWire?.dispose();
    this.cablePhysics.dispose();
    this.scene.dispose();`,
);

replace(
`    this.voltmeter = new AnalogMeterVisual(
      this.scene,
      this.theme,
      {
        id: 'voltmeter',
        label: 'voltmeter',
        unit: 'V',
        max: 12,
        decimals: 2,
        position: new Vector3(1.48, 0, 1.72),
        plus: ids.voltmeterPlus,
        minus: ids.voltmeterMinus,
        width: 1.96,
        height: 1.67,
      },
      registerTerminal,
    );

    for (const mesh of this.scene.meshes) {`,
`    this.voltmeter = new AnalogMeterVisual(
      this.scene,
      this.theme,
      {
        id: 'voltmeter',
        label: 'voltmeter',
        unit: 'V',
        max: 12,
        decimals: 2,
        position: new Vector3(1.48, 0, 1.72),
        plus: ids.voltmeterPlus,
        minus: ids.voltmeterMinus,
        width: 1.96,
        height: 1.67,
      },
      registerTerminal,
    );

    // Cable collision volumes deliberately extend a little in front of every
    // face panel. This prevents a physical lead from crossing dial/display
    // textures while still allowing it to settle on the top and around sides.
    const cableColliders: CableCollider[] = [
      { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },
      { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },
      { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },
      { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },
    ];
    this.cablePhysics = new PhysicalCableSystem(cableColliders, 0.045);

    for (const mesh of this.scene.meshes) {`,
);

replace(
`    for (const [id, visual] of this.connectionMeshes) {
      if (!activeIds.has(id)) {
        for (const mesh of visual.meshes) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
      }
    }`,
`    for (const [id, visual] of this.connectionMeshes) {
      if (!activeIds.has(id)) {
        this.cablePhysics.remove(visual.cable);
        for (const mesh of visual.plugs) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
      }
    }`,
);

replace(
`      const path = this.createWirePath(from, to, this.wireLane(connection.id));
      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      const baseColor = red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018);
      const material = new PBRMaterial(\`wire-material:\${connection.id}\`, this.scene);
      material.albedoColor = baseColor;
      material.metallic = 0.0;
      material.roughness = 0.94;
      material.environmentIntensity = 0.32;

      const tube = MeshBuilder.CreateTube(
        \`wire:\${connection.id}\`,
        { path, radius: 0.046, tessellation: 20, cap: Mesh.CAP_ALL },
        this.scene,
      );
      tube.material = material;
      tube.isPickable = true;
      tube.metadata = { connectionId: connection.id } satisfies PickMetadata;

      const plugFrom = this.createBananaPlug(`,
`      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      const baseColor = red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018);
      const material = new PBRMaterial(\`wire-material:\${connection.id}\`, this.scene);
      material.albedoColor = baseColor;
      material.metallic = 0.0;
      material.roughness = 0.94;
      material.environmentIntensity = 0.32;

      const cable = new PhysicalCable(
        this.scene,
        connection.id,
        from,
        to,
        material,
        {
          radius: 0.046,
          particleCount: 24,
          laneOffset: this.wireLane(connection.id),
          leadOut: 0.34,
        },
      );
      cable.mesh.metadata = { connectionId: connection.id } satisfies PickMetadata;
      this.cablePhysics.add(cable);

      const plugFrom = this.createBananaPlug(`,
);

replace(
`      this.connectionMeshes.set(connection.id, {
        meshes: [tube, ...plugFrom, ...plugTo],
        material,
        baseColor,
      });`,
`      this.connectionMeshes.set(connection.id, {
        cable,
        plugs: [...plugFrom, ...plugTo],
        material,
        baseColor,
      });`,
);

writeFileSync(path, text);
