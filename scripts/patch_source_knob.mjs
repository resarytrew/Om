import { readFileSync, writeFileSync } from 'node:fs';

const instrumentPath = 'src/rendering/babylon/ProfessionalInstruments.ts';
let instrument = readFileSync(instrumentPath, 'utf8');

instrument = instrument.replace(
`  private readonly knob: Mesh;\n  private readonly knobPointer: Mesh;`,
`  private readonly knob: Mesh;\n  private readonly knobCap: Mesh;\n  private readonly knobPointer: Mesh;`,
);
instrument = instrument.replace(
`    this.knob.material = theme.darkMetal;\n    this.knob.isPickable = false;\n\n    const knobCap = MeshBuilder.CreateCylinder(`,
`    this.knob.material = theme.darkMetal;\n    this.knob.isPickable = true;\n    this.knob.metadata = { instrumentControl: 'source-voltage' };\n\n    this.knobCap = MeshBuilder.CreateCylinder(`,
);
instrument = instrument.replace(
`    knobCap.position = this.knob.position.add(new Vector3(0, 0, -0.018));\n    knobCap.rotation.x = Math.PI / 2;\n    knobCap.material = theme.rubberBlack;\n    knobCap.isPickable = false;`,
`    this.knobCap.position = this.knob.position.add(new Vector3(0, 0, -0.018));\n    this.knobCap.rotation.x = Math.PI / 2;\n    this.knobCap.material = theme.rubberBlack;\n    this.knobCap.isPickable = true;\n    this.knobCap.metadata = { instrumentControl: 'source-voltage' };`,
);
instrument = instrument.replace(
`  setActive(active: boolean, warning = false): void {`,
`  setControlActive(active: boolean): void {\n    const scale = active ? 1.06 : 1;\n    this.knob.scaling.setAll(scale);\n    this.knobCap.scaling.setAll(scale);\n  }\n\n  setActive(active: boolean, warning = false): void {`,
);
writeFileSync(instrumentPath, instrument);

const scenePath = 'src/rendering/babylon/LabScene.ts';
let scene = readFileSync(scenePath, 'utf8');
scene = scene.replace(
`interface PickMetadata {\n  readonly terminalId?: string;\n  readonly connectionId?: string;\n}`,
`interface PickMetadata {\n  readonly terminalId?: string;\n  readonly connectionId?: string;\n  readonly instrumentControl?: 'source-voltage';\n}`,
);
scene = scene.replace(
`  private readonly engine: Engine;\n  private readonly scene: Scene;`,
`  private readonly engine: Engine;\n  private readonly scene: Scene;\n  private camera!: ArcRotateCamera;`,
);
scene = scene.replace(
`  private resizeObserver: ResizeObserver | null = null;`,
`  private resizeObserver: ResizeObserver | null = null;\n  private activeControl: 'source-voltage' | null = null;\n  private controlPointerId: number | null = null;\n  private controlLastX = 0;\n  private controlLastY = 0;`,
);
scene = scene.replace(
`    this.canvas.addEventListener('keydown', this.handleKeyDown);`,
`    this.canvas.addEventListener('keydown', this.handleKeyDown);\n    this.canvas.addEventListener('wheel', this.handleControlWheel, { passive: false });`,
);
scene = scene.replace(
`    this.canvas.removeEventListener('keydown', this.handleKeyDown);`,
`    this.canvas.removeEventListener('keydown', this.handleKeyDown);\n    this.canvas.removeEventListener('wheel', this.handleControlWheel);`,
);
scene = scene.replace(
`    const camera = new ArcRotateCamera(\n      'camera',`,
`    this.camera = new ArcRotateCamera(\n      'camera',`,
);
scene = scene.replaceAll('    camera.', '    this.camera.');
scene = scene.replace(
`    const pipeline = new DefaultRenderingPipeline('ohm-render-pipeline', true, this.scene, [camera]);`,
`    const pipeline = new DefaultRenderingPipeline('ohm-render-pipeline', true, this.scene, [this.camera]);`,
);
scene = scene.replace(
`      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {\n        this.handlePointerMove(metadata);\n        return;\n      }`,
`      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentControl === 'source-voltage') {\n        const event = pointerInfo.event as PointerEvent;\n        this.activeControl = 'source-voltage';\n        this.controlPointerId = event.pointerId;\n        this.controlLastX = event.clientX;\n        this.controlLastY = event.clientY;\n        this.source.setControlActive(true);\n        this.camera.detachControl();\n        this.canvas.setPointerCapture?.(event.pointerId);\n        event.preventDefault();\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl === 'source-voltage') {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.controlPointerId !== null && event.pointerId !== this.controlPointerId) return;\n        const dx = event.clientX - this.controlLastX;\n        const dy = event.clientY - this.controlLastY;\n        this.controlLastX = event.clientX;\n        this.controlLastY = event.clientY;\n        const current = this.currentSourceVoltage();\n        const next = current + dx * 0.035 - dy * 0.055;\n        this.runtime.setVoltage(Math.round(next * 20) / 20);\n        event.preventDefault();\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeControl) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.controlPointerId === null || event.pointerId === this.controlPointerId) {\n          this.finishInstrumentControl(event.pointerId);\n          event.preventDefault();\n        }\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {\n        this.handlePointerMove(metadata);\n        return;\n      }`,
);
scene = scene.replace(
`    if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';\n    else if (metadata?.connectionId) this.canvas.style.cursor = 'pointer';`,
`    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'ns-resize';\n    else if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';\n    else if (metadata?.connectionId) this.canvas.style.cursor = 'pointer';`,
);
scene = scene.replace(
`  private readonly handleKeyDown = (event: KeyboardEvent): void => {`,
`  private currentSourceVoltage(): number {\n    const source = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'voltage-source');\n    return source?.kind === 'voltage-source' ? source.voltage : 0;\n  }\n\n  private finishInstrumentControl(pointerId?: number): void {\n    this.activeControl = null;\n    this.controlPointerId = null;\n    this.source.setControlActive(false);\n    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {\n      this.canvas.releasePointerCapture?.(pointerId);\n    }\n    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleControlWheel = (event: WheelEvent): void => {\n    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);\n    const metadata = (pick?.pickedMesh?.metadata ?? null) as PickMetadata | null;\n    if (metadata?.instrumentControl !== 'source-voltage') return;\n    const direction = event.deltaY < 0 ? 1 : -1;\n    this.runtime.setVoltage(this.currentSourceVoltage() + direction * 0.1);\n    event.preventDefault();\n  };\n\n  private readonly handleKeyDown = (event: KeyboardEvent): void => {`,
);
writeFileSync(scenePath, scene);
