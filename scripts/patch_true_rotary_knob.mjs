import { readFileSync, writeFileSync } from 'node:fs';

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

const instrumentPath = 'src/rendering/babylon/ProfessionalInstruments.ts';
let instrument = readFileSync(instrumentPath, 'utf8');

instrument = replaceOrThrow(
  instrument,
  `import { clampMeterAngle, meterNeedleAngle, METER_ZERO_ANGLE } from './MeterScale';`,
  `import { clampMeterAngle, meterNeedleAngle, METER_ZERO_ANGLE } from './MeterScale';\nimport { valueToKnobRotation } from './RotaryControl';`,
  'rotary import',
);

instrument = replaceOrThrow(
  instrument,
  `  private readonly knob: Mesh;\n  private readonly knobCap: Mesh;\n  private readonly knobPointer: Mesh;`,
  `  private readonly knobPivot: TransformNode;\n  private readonly knob: Mesh;\n  private readonly knobCap: Mesh;\n  private readonly knobPointer: Mesh;`,
  'knob fields',
);

const oldKnobBlock = `    this.knob = MeshBuilder.CreateCylinder(\n      'source-voltage-knob',\n      { height: 0.29, diameter: 0.56, tessellation: 48 },\n      scene,\n    );\n    this.knob.position = new Vector3(position.x + 0.77, 1.1, frontZ - 0.17);\n    this.knob.rotation.x = Math.PI / 2;\n    this.knob.material = theme.darkMetal;\n    this.knob.isPickable = true;\n    this.knob.metadata = { instrumentControl: 'source-voltage' };\n\n    this.knobCap = MeshBuilder.CreateCylinder(\n      'source-knob-cap',\n      { height: 0.305, diameter: 0.34, tessellation: 48 },\n      scene,\n    );\n    this.knobCap.position = this.knob.position.add(new Vector3(0, 0, -0.018));\n    this.knobCap.rotation.x = Math.PI / 2;\n    this.knobCap.material = theme.rubberBlack;\n    this.knobCap.isPickable = true;\n    this.knobCap.metadata = { instrumentControl: 'source-voltage' };\n\n    this.knobPointer = createBox(\n      scene,\n      'source-knob-index',\n      new Vector3(position.x + 0.77, 1.34, frontZ - 0.335),\n      new Vector3(0.035, 0.14, 0.022),\n      theme.metal,\n    );`;

const newKnobBlock = `    const knobCenter = new Vector3(position.x + 0.77, 1.1, frontZ - 0.17);\n    this.knobPivot = new TransformNode('source-voltage-knob-pivot', scene);\n    this.knobPivot.position = knobCenter;\n\n    this.knob = MeshBuilder.CreateCylinder(\n      'source-voltage-knob',\n      { height: 0.29, diameter: 0.56, tessellation: 48 },\n      scene,\n    );\n    this.knob.position = Vector3.Zero();\n    this.knob.rotation.x = Math.PI / 2;\n    this.knob.parent = this.knobPivot;\n    this.knob.material = theme.darkMetal;\n    this.knob.isPickable = true;\n    this.knob.metadata = { instrumentControl: 'source-voltage' };\n\n    this.knobCap = MeshBuilder.CreateCylinder(\n      'source-knob-cap',\n      { height: 0.305, diameter: 0.34, tessellation: 48 },\n      scene,\n    );\n    this.knobCap.position = new Vector3(0, 0, -0.018);\n    this.knobCap.rotation.x = Math.PI / 2;\n    this.knobCap.parent = this.knobPivot;\n    this.knobCap.material = theme.rubberBlack;\n    this.knobCap.isPickable = true;\n    this.knobCap.metadata = { instrumentControl: 'source-voltage' };\n\n    this.knobPointer = createBox(\n      scene,\n      'source-knob-index',\n      new Vector3(0, 0.245, -0.165),\n      new Vector3(0.035, 0.14, 0.022),\n      theme.metal,\n    );\n    this.knobPointer.parent = this.knobPivot;`;

instrument = replaceOrThrow(instrument, oldKnobBlock, newKnobBlock, 'knob hierarchy');

instrument = replaceOrThrow(
  instrument,
  `    const ratio = Math.min(1, Math.max(0, value / 12));\n    this.targetKnob = -0.82 + ratio * 1.64;`,
  `    this.targetKnob = valueToKnobRotation(value, 12);`,
  'knob voltage mapping',
);

instrument = replaceOrThrow(
  instrument,
  `  setControlActive(active: boolean): void {\n    const scale = active ? 1.06 : 1;\n    this.knob.scaling.setAll(scale);\n    this.knobCap.scaling.setAll(scale);\n  }\n\n`,
  `  getVoltageKnobWorldPosition(): Vector3 {\n    return this.knobPivot.getAbsolutePosition().clone();\n  }\n\n`,
  'remove fake scaling interaction',
);

instrument = replaceOrThrow(
  instrument,
  `    this.knob.rotation.z = this.currentKnob;\n    this.knobPointer.rotation.z = this.currentKnob;`,
  `    this.knobPivot.rotation.z = this.currentKnob;`,
  'rotate pivot',
);

writeFileSync(instrumentPath, instrument);

const scenePath = 'src/rendering/babylon/LabScene.ts';
let lab = readFileSync(scenePath, 'utf8');

lab = replaceOrThrow(
  lab,
  `  LinesMesh,\n  Mesh,`,
  `  LinesMesh,\n  Matrix,\n  Mesh,`,
  'Matrix import',
);

lab = replaceOrThrow(
  lab,
  `import { PhysicalCable, PhysicalCableSystem, type CableCollider } from './PhysicalCable';`,
  `import { PhysicalCable, PhysicalCableSystem, type CableCollider } from './PhysicalCable';\nimport { clampRotaryTravel, normalizeAngleDelta, rotaryTravelToValue } from './RotaryControl';`,
  'rotary helpers import',
);

lab = replaceOrThrow(
  lab,
  `  private controlPointerId: number | null = null;\n  private controlLastX = 0;\n  private controlLastY = 0;`,
  `  private controlPointerId: number | null = null;\n  private controlCenterX = 0;\n  private controlCenterY = 0;\n  private controlLastAngle = 0;\n  private controlTravel = 0;\n  private controlStartVoltage = 0;`,
  'control state fields',
);

const oldDown = `        this.activeControl = 'source-voltage';\n        this.controlPointerId = event.pointerId;\n        this.controlLastX = event.clientX;\n        this.controlLastY = event.clientY;\n        this.source.setControlActive(true);\n        this.camera.detachControl();`;
const newDown = `        const center = this.worldToClient(this.source.getVoltageKnobWorldPosition());\n        this.activeControl = 'source-voltage';\n        this.controlPointerId = event.pointerId;\n        this.controlCenterX = center.x;\n        this.controlCenterY = center.y;\n        this.controlLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);\n        this.controlTravel = 0;\n        this.controlStartVoltage = this.currentSourceVoltage();\n        this.canvas.style.cursor = 'grabbing';\n        this.camera.detachControl();`;
lab = replaceOrThrow(lab, oldDown, newDown, 'pointer down rotary setup');

const oldMove = `        const dx = event.clientX - this.controlLastX;\n        const dy = event.clientY - this.controlLastY;\n        this.controlLastX = event.clientX;\n        this.controlLastY = event.clientY;\n        const current = this.currentSourceVoltage();\n        const next = current + dx * 0.035 - dy * 0.055;\n        this.runtime.setVoltage(Math.round(next * 20) / 20);\n        event.preventDefault();\n        return;`;
const newMove = `        const dx = event.clientX - this.controlCenterX;\n        const dy = event.clientY - this.controlCenterY;\n        if (Math.hypot(dx, dy) < 10) return;\n        const angle = Math.atan2(dy, dx);\n        const delta = normalizeAngleDelta(angle - this.controlLastAngle);\n        this.controlLastAngle = angle;\n        this.controlTravel = clampRotaryTravel(\n          this.controlStartVoltage,\n          this.controlTravel + delta,\n          12,\n        );\n        const next = rotaryTravelToValue(this.controlStartVoltage, this.controlTravel, 12);\n        this.runtime.setVoltage(Math.round(next * 20) / 20);\n        event.preventDefault();\n        return;`;
lab = replaceOrThrow(lab, oldMove, newMove, 'pointer move rotary gesture');

lab = replaceOrThrow(
  lab,
  `    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'ns-resize';`,
  `    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'grab';`,
  'rotary cursor',
);

lab = replaceOrThrow(
  lab,
  `  private currentSourceVoltage(): number {`,
  `  private worldToClient(world: Vector3): { x: number; y: number } {\n    const renderWidth = this.engine.getRenderWidth();\n    const renderHeight = this.engine.getRenderHeight();\n    const viewport = this.camera.viewport.toGlobal(renderWidth, renderHeight);\n    const projected = Vector3.Project(\n      world,\n      Matrix.Identity(),\n      this.scene.getTransformMatrix(),\n      viewport,\n    );\n    const rect = this.canvas.getBoundingClientRect();\n    return {\n      x: rect.left + (projected.x / renderWidth) * rect.width,\n      y: rect.top + (projected.y / renderHeight) * rect.height,\n    };\n  }\n\n  private currentSourceVoltage(): number {`,
  'world-to-client projection',
);

lab = replaceOrThrow(
  lab,
  `    this.activeControl = null;\n    this.controlPointerId = null;\n    this.source.setControlActive(false);`,
  `    this.activeControl = null;\n    this.controlPointerId = null;\n    this.controlTravel = 0;`,
  'finish rotary interaction',
);

lab = replaceOrThrow(
  lab,
  `    this.camera.attachControl(this.canvas, true, true);`,
  `    this.camera.attachControl(this.canvas, true, true);\n    this.canvas.style.cursor = 'default';`,
  'restore cursor',
);

writeFileSync(scenePath, lab);
