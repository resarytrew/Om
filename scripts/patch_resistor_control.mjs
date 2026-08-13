import { readFileSync, writeFileSync } from 'node:fs';

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

const instrumentPath = 'src/rendering/babylon/ProfessionalInstruments.ts';
let instrument = readFileSync(instrumentPath, 'utf8');

instrument = replaceOrThrow(
  instrument,
  `export class ResistorModuleVisual {\n  private readonly valueTexture: DynamicTexture;\n  private readonly ceramicMaterial: PBRMaterial;`,
  `export class ResistorModuleVisual {\n  private readonly valueTexture: DynamicTexture;\n  private readonly ceramicMaterial: PBRMaterial;\n  private readonly adjustPivot: TransformNode;\n  private targetAdjustment = 0;\n  private currentAdjustment = 0;`,
  'resistor fields',
);

instrument = replaceOrThrow(
  instrument,
  `    createTextPlate(\n      scene,\n      'resistor-title',\n      new Vector3(position.x, 0.5, position.z - 0.625),\n      1.34,\n      0.16,\n      ['RESISTANCE'],\n      '#242b2f',\n      'transparent',\n      31,\n      24,\n    );\n\n    registerTerminal(`,
  `    createTextPlate(\n      scene,\n      'resistor-title',\n      new Vector3(position.x - 0.18, 0.5, position.z - 0.625),\n      1.08,\n      0.16,\n      ['RESISTANCE'],\n      '#242b2f',\n      'transparent',\n      31,\n      24,\n    );\n\n    const adjustCenter = new Vector3(position.x + 0.86, 0.52, position.z - 0.665);\n    const adjustRing = MeshBuilder.CreateTorus(\n      'resistor-adjust-ring',\n      { diameter: 0.42, thickness: 0.035, tessellation: 40 },\n      scene,\n    );\n    adjustRing.position = adjustCenter.add(new Vector3(0, 0, 0.045));\n    adjustRing.rotation.x = Math.PI / 2;\n    adjustRing.material = theme.meterBezel;\n    adjustRing.isPickable = false;\n\n    this.adjustPivot = new TransformNode('resistor-adjust-pivot', scene);\n    this.adjustPivot.position = adjustCenter;\n\n    const adjustKnob = MeshBuilder.CreateCylinder(\n      'resistor-adjust-knob',\n      { height: 0.18, diameter: 0.33, tessellation: 40 },\n      scene,\n    );\n    adjustKnob.position = Vector3.Zero();\n    adjustKnob.rotation.x = Math.PI / 2;\n    adjustKnob.parent = this.adjustPivot;\n    adjustKnob.material = theme.darkMetal;\n    adjustKnob.isPickable = true;\n    adjustKnob.metadata = { instrumentControl: 'resistor-resistance' };\n\n    const adjustCap = MeshBuilder.CreateCylinder(\n      'resistor-adjust-cap',\n      { height: 0.19, diameter: 0.21, tessellation: 40 },\n      scene,\n    );\n    adjustCap.position = new Vector3(0, 0, -0.012);\n    adjustCap.rotation.x = Math.PI / 2;\n    adjustCap.parent = this.adjustPivot;\n    adjustCap.material = theme.rubberBlack;\n    adjustCap.isPickable = true;\n    adjustCap.metadata = { instrumentControl: 'resistor-resistance' };\n\n    const adjustPointer = createBox(\n      scene,\n      'resistor-adjust-index',\n      new Vector3(0, 0.135, -0.105),\n      new Vector3(0.025, 0.09, 0.018),\n      theme.metal,\n    );\n    adjustPointer.parent = this.adjustPivot;\n\n    createTextPlate(\n      scene,\n      'resistor-adjust-label',\n      new Vector3(position.x + 0.86, 0.28, position.z - 0.64),\n      0.42,\n      0.1,\n      ['ADJ'],\n      '#242b2f',\n      'transparent',\n      24,\n      20,\n    );\n\n    registerTerminal(`,
  'resistor adjustment control',
);

instrument = replaceOrThrow(
  instrument,
  `  setResistance(value: number): void {\n    const context = this.valueTexture.getContext();`,
  `  setResistance(value: number): void {\n    const normalized = Math.min(1, Math.max(0, (value - 0.5) / 19.5));\n    this.targetAdjustment = Math.PI * 0.75 - normalized * Math.PI * 1.5;\n    const context = this.valueTexture.getContext();`,
  'resistor rotation mapping',
);

instrument = replaceOrThrow(
  instrument,
  `  setPower(power: number): void {`,
  `  getResistanceKnobWorldPosition(): Vector3 {\n    return this.adjustPivot.getAbsolutePosition().clone();\n  }\n\n  tick(dt: number): void {\n    const factor = 1 - Math.exp(-dt * 9);\n    this.currentAdjustment += (this.targetAdjustment - this.currentAdjustment) * factor;\n    this.adjustPivot.rotation.z = this.currentAdjustment;\n  }\n\n  setPower(power: number): void {`,
  'resistor tick and knob position',
);

writeFileSync(instrumentPath, instrument);

const scenePath = 'src/rendering/babylon/LabScene.ts';
let lab = readFileSync(scenePath, 'utf8');

lab = replaceOrThrow(
  lab,
  `  readonly instrumentControl?: 'source-voltage' | 'source-output';`,
  `  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';`,
  'metadata union',
);

lab = replaceOrThrow(
  lab,
  `  private activeControl: 'source-voltage' | null = null;`,
  `  private activeControl: 'source-voltage' | 'resistor-resistance' | null = null;`,
  'active control union',
);

lab = replaceOrThrow(
  lab,
  `  private controlStartVoltage = 0;`,
  `  private controlStartVoltage = 0;\n  private controlStartResistance = 3;`,
  'resistance control state',
);

lab = replaceOrThrow(
  lab,
  `      this.source.tick(dt);\n      this.ammeter.tick(dt);`,
  `      this.source.tick(dt);\n      this.resistor.tick(dt);\n      this.ammeter.tick(dt);`,
  'resistor tick loop',
);

lab = replaceOrThrow(
  lab,
  `      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentControl === 'source-voltage') {\n        const event = pointerInfo.event as PointerEvent;\n        const center = this.worldToClient(this.source.getVoltageKnobWorldPosition());\n        this.activeControl = 'source-voltage';\n        this.controlPointerId = event.pointerId;\n        this.controlCenterX = center.x;\n        this.controlCenterY = center.y;\n        this.controlLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);\n        this.controlTravel = 0;\n        this.controlStartVoltage = this.currentSourceVoltage();\n        this.canvas.style.cursor = 'grabbing';\n        this.camera.detachControl();\n        this.canvas.setPointerCapture?.(event.pointerId);\n        event.preventDefault();\n        return;\n      }`,
  `      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance')) {\n        const event = pointerInfo.event as PointerEvent;\n        const resistorControl = metadata.instrumentControl === 'resistor-resistance';\n        const center = this.worldToClient(\n          resistorControl\n            ? this.resistor.getResistanceKnobWorldPosition()\n            : this.source.getVoltageKnobWorldPosition(),\n        );\n        this.activeControl = metadata.instrumentControl;\n        this.controlPointerId = event.pointerId;\n        this.controlCenterX = center.x;\n        this.controlCenterY = center.y;\n        this.controlLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);\n        this.controlTravel = 0;\n        if (resistorControl) this.controlStartResistance = this.currentResistance();\n        else this.controlStartVoltage = this.currentSourceVoltage();\n        this.canvas.style.cursor = 'grabbing';\n        this.camera.detachControl();\n        this.canvas.setPointerCapture?.(event.pointerId);\n        event.preventDefault();\n        return;\n      }`,
  'pointer down controls',
);

lab = replaceOrThrow(
  lab,
  `      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl === 'source-voltage') {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.controlPointerId !== null && event.pointerId !== this.controlPointerId) return;\n        const dx = event.clientX - this.controlCenterX;\n        const dy = event.clientY - this.controlCenterY;\n        if (Math.hypot(dx, dy) < 10) return;\n        const angle = Math.atan2(dy, dx);\n        const delta = normalizeAngleDelta(angle - this.controlLastAngle);\n        this.controlLastAngle = angle;\n        this.controlTravel = clampRotaryTravel(\n          this.controlStartVoltage,\n          this.controlTravel + delta,\n          12,\n        );\n        const next = rotaryTravelToValue(this.controlStartVoltage, this.controlTravel, 12);\n        this.runtime.setVoltage(Math.round(next * 20) / 20);\n        event.preventDefault();\n        return;\n      }`,
  `      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.controlPointerId !== null && event.pointerId !== this.controlPointerId) return;\n        const dx = event.clientX - this.controlCenterX;\n        const dy = event.clientY - this.controlCenterY;\n        if (Math.hypot(dx, dy) < 10) return;\n        const angle = Math.atan2(dy, dx);\n        const delta = normalizeAngleDelta(angle - this.controlLastAngle);\n        this.controlLastAngle = angle;\n\n        if (this.activeControl === 'source-voltage') {\n          this.controlTravel = clampRotaryTravel(\n            this.controlStartVoltage,\n            this.controlTravel + delta,\n            12,\n          );\n          const next = rotaryTravelToValue(this.controlStartVoltage, this.controlTravel, 12);\n          this.runtime.setVoltage(Math.round(next * 20) / 20);\n        } else {\n          const mappedStart = this.controlStartResistance - 0.5;\n          this.controlTravel = clampRotaryTravel(\n            mappedStart,\n            this.controlTravel + delta,\n            19.5,\n          );\n          const next = 0.5 + rotaryTravelToValue(mappedStart, this.controlTravel, 19.5);\n          this.runtime.setResistance(Math.round(next * 10) / 10);\n        }\n        event.preventDefault();\n        return;\n      }`,
  'pointer move controls',
);

lab = replaceOrThrow(
  lab,
  `    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'grab';\n    else if (metadata?.instrumentControl === 'source-output') this.canvas.style.cursor = 'pointer';`,
  `    if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';\n    else if (metadata?.instrumentControl === 'source-output') this.canvas.style.cursor = 'pointer';`,
  'control cursor',
);

lab = replaceOrThrow(
  lab,
  `  private currentSourceEnabled(): boolean {`,
  `  private currentResistance(): number {\n    const resistor = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'resistor');\n    return resistor?.kind === 'resistor' ? resistor.resistance : 3;\n  }\n\n  private currentSourceEnabled(): boolean {`,
  'current resistance helper',
);

lab = replaceOrThrow(
  lab,
  `    if (metadata?.instrumentControl !== 'source-voltage') return;\n    const direction = event.deltaY < 0 ? 1 : -1;\n    this.runtime.setVoltage(this.currentSourceVoltage() + direction * 0.1);\n    event.preventDefault();`,
  `    const direction = event.deltaY < 0 ? 1 : -1;\n    if (metadata?.instrumentControl === 'source-voltage') {\n      this.runtime.setVoltage(this.currentSourceVoltage() + direction * 0.1);\n      event.preventDefault();\n      return;\n    }\n    if (metadata?.instrumentControl === 'resistor-resistance') {\n      this.runtime.setResistance(this.currentResistance() + direction * 0.1);\n      event.preventDefault();\n    }`,
  'wheel controls',
);

writeFileSync(scenePath, lab);

const testPath = 'tests/resistorControl.test.ts';
writeFileSync(testPath, `import { describe, expect, it } from 'vitest';\nimport { connectStandardCircuit, createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';\n\ndescribe('interactive resistor', () => {\n  it('changes the real resistor and immediately changes circuit current', () => {\n    const runtime = createOhmsLawRuntime();\n    connectStandardCircuit(runtime);\n    runtime.setVoltage(6);\n    runtime.setResistance(3);\n    expect(runtime.getState().result.current).toBeCloseTo(2, 8);\n\n    runtime.setResistance(6);\n    expect(runtime.getState().result.current).toBeCloseTo(1, 8);\n    const resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);\n    expect(resistor?.kind).toBe('resistor');\n    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(6);\n  });\n\n  it('clamps resistance to the physical control range', () => {\n    const runtime = createOhmsLawRuntime();\n    runtime.setResistance(0);\n    let resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);\n    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(0.5);\n\n    runtime.setResistance(50);\n    resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);\n    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(20);\n  });\n});\n`);
