import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/rendering/babylon/ProfessionalInstruments.ts';
let source = readFileSync(path, 'utf8');

function replaceOrThrow(search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  source = source.replace(search, replacement);
}

replaceOrThrow(
  '  private readonly adjustPivot: TransformNode;\n',
  '  private readonly resistorPivot: TransformNode;\n',
  'pivot field',
);

replaceOrThrow(
`    this.ceramicMaterial = theme.ceramic.clone('power-resistor-ceramic');
    const ceramic = MeshBuilder.CreateCylinder(
      'power-resistor-body',
      { height: 1.42, diameter: 0.44, tessellation: 44 },
      scene,
    );
    ceramic.position = new Vector3(position.x, 0.84, position.z + 0.04);
    ceramic.rotation.z = Math.PI / 2;
    ceramic.material = this.ceramicMaterial;
    ceramic.isPickable = false;
`,
`    this.ceramicMaterial = theme.ceramic.clone('power-resistor-ceramic');
    this.resistorPivot = new TransformNode('power-resistor-pivot', scene);
    this.resistorPivot.position = new Vector3(position.x, 0.84, position.z + 0.04);

    const ceramic = MeshBuilder.CreateCylinder(
      'power-resistor-body',
      { height: 1.42, diameter: 0.44, tessellation: 44 },
      scene,
    );
    ceramic.position = Vector3.Zero();
    ceramic.rotation.z = Math.PI / 2;
    ceramic.parent = this.resistorPivot;
    ceramic.material = this.ceramicMaterial;
    ceramic.isPickable = true;
    ceramic.metadata = { instrumentControl: 'resistor-resistance' };

    // A visible index stripe makes the cylinder's physical rotation readable.
    // It rotates with the resistor body instead of using a separate ADJ knob.
    const rotationIndex = createBox(
      scene,
      'power-resistor-rotation-index',
      new Vector3(0, 0.226, 0),
      new Vector3(0.86, 0.028, 0.032),
      theme.darkMetal,
    );
    rotationIndex.parent = this.resistorPivot;
    rotationIndex.isPickable = false;
`,
  'ceramic body',
);

replaceOrThrow(
`      cap.position = new Vector3(position.x + offset, 0.84, position.z + 0.04);
      cap.rotation.z = Math.PI / 2;
      cap.material = theme.metal;
      cap.isPickable = false;
`,
`      cap.position = new Vector3(offset, 0, 0);
      cap.rotation.z = Math.PI / 2;
      cap.parent = this.resistorPivot;
      cap.material = theme.metal;
      cap.isPickable = true;
      cap.metadata = { instrumentControl: 'resistor-resistance' };
`,
  'resistor caps',
);

replaceOrThrow(
`    createTextPlate(
      scene,
      'resistor-body-label',
      new Vector3(position.x, 0.84, position.z - 0.205),
      1.08,
      0.19,
      ['POWER RESISTOR'],
      '#34383a',
      'transparent',
      31,
      24,
    );

`,
'',
  'floating resistor body label',
);

replaceOrThrow(
`    createTextPlate(
      scene,
      'resistor-title',
      new Vector3(position.x - 0.18, 0.5, position.z - 0.625),
      1.08,
      0.16,
      ['RESISTANCE'],
      '#242b2f',
      'transparent',
      31,
      24,
    );

    const adjustCenter = new Vector3(position.x + 0.86, 0.52, position.z - 0.665);
    const adjustRing = MeshBuilder.CreateTorus(
      'resistor-adjust-ring',
      { diameter: 0.42, thickness: 0.035, tessellation: 40 },
      scene,
    );
    adjustRing.position = adjustCenter.add(new Vector3(0, 0, 0.045));
    adjustRing.rotation.x = Math.PI / 2;
    adjustRing.material = theme.meterBezel;
    adjustRing.isPickable = false;

    this.adjustPivot = new TransformNode('resistor-adjust-pivot', scene);
    this.adjustPivot.position = adjustCenter;

    const adjustKnob = MeshBuilder.CreateCylinder(
      'resistor-adjust-knob',
      { height: 0.18, diameter: 0.33, tessellation: 40 },
      scene,
    );
    adjustKnob.position = Vector3.Zero();
    adjustKnob.rotation.x = Math.PI / 2;
    adjustKnob.parent = this.adjustPivot;
    adjustKnob.material = theme.darkMetal;
    adjustKnob.isPickable = true;
    adjustKnob.metadata = { instrumentControl: 'resistor-resistance' };

    const adjustCap = MeshBuilder.CreateCylinder(
      'resistor-adjust-cap',
      { height: 0.19, diameter: 0.21, tessellation: 40 },
      scene,
    );
    adjustCap.position = new Vector3(0, 0, -0.012);
    adjustCap.rotation.x = Math.PI / 2;
    adjustCap.parent = this.adjustPivot;
    adjustCap.material = theme.rubberBlack;
    adjustCap.isPickable = true;
    adjustCap.metadata = { instrumentControl: 'resistor-resistance' };

    const adjustPointer = createBox(
      scene,
      'resistor-adjust-index',
      new Vector3(0, 0.135, -0.105),
      new Vector3(0.025, 0.09, 0.018),
      theme.metal,
    );
    adjustPointer.parent = this.adjustPivot;

    createTextPlate(
      scene,
      'resistor-adjust-label',
      new Vector3(position.x + 0.86, 0.28, position.z - 0.64),
      0.42,
      0.1,
      ['ADJ'],
      '#242b2f',
      'transparent',
      24,
      20,
    );

`,
`    createTextPlate(
      scene,
      'resistor-title',
      new Vector3(position.x, 0.5, position.z - 0.625),
      1.34,
      0.16,
      ['RESISTANCE'],
      '#242b2f',
      'transparent',
      31,
      24,
    );

`,
  'remove ADJ control',
);

replaceOrThrow(
`  getResistanceKnobWorldPosition(): Vector3 {
    return this.adjustPivot.getAbsolutePosition().clone();
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 9);
    this.currentAdjustment += (this.targetAdjustment - this.currentAdjustment) * factor;
    this.adjustPivot.rotation.z = this.currentAdjustment;
  }
`,
`  getResistanceKnobWorldPosition(): Vector3 {
    return this.resistorPivot.getAbsolutePosition().clone();
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 9);
    this.currentAdjustment += (this.targetAdjustment - this.currentAdjustment) * factor;
    this.resistorPivot.rotation.x = this.currentAdjustment;
  }
`,
  'resistor rotation target',
);

writeFileSync(path, source);
