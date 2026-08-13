import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

{
  const path = 'src/rendering/babylon/LabScene.ts';
  let s = readFileSync(path, 'utf8');

  s = replaceOrThrow(
    s,
    "import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    "import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, smoothInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    'smooth rotation import',
  );

  s = replaceOrThrow(
    s,
    "  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n}",
    "  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n  revealProgress: number;\n}",
    'wire reveal state',
  );

  s = replaceOrThrow(
    s,
    "  private instrumentRotateCenterY = 0;\n  private instrumentRotateLastAngle = 0;",
    "  private instrumentRotateCenterY = 0;\n  private instrumentRotateLastAngle = 0;\n  private readonly instrumentRotationTargets = new Map<InstrumentId, number>();\n  private readonly instrumentEntrances = new Map<InstrumentId, { elapsed: number; duration: number }>();\n  private interactionLocked = false;",
    'motion state',
  );

  s = replaceOrThrow(
    s,
    "      this.ammeter.tick(dt);\n      this.voltmeter.tick(dt);\n      this.syncMovingConnections();",
    "      this.ammeter.tick(dt);\n      this.voltmeter.tick(dt);\n      this.updateInstrumentMotion(dt);\n      this.updateWireReveals(dt);\n      this.syncMovingConnections();",
    'render loop motion',
  );

  s = replaceOrThrow(
    s,
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.addEventListener('contextmenu', this.handleContextMenu);",
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.addEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);\n    this.canvas.addEventListener('contextmenu', this.handleContextMenu);",
    'lock listener add',
  );

  s = replaceOrThrow(
    s,
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);",
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.removeEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);\n    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);",
    'lock listener remove',
  );

  s = replaceOrThrow(
    s,
    "    this.camera.wheelPrecision = 34;\n    this.camera.pinchPrecision = 72;\n    this.camera.inertia = 0.82;",
    "    this.camera.wheelPrecision = 48;\n    this.camera.pinchPrecision = 90;\n    this.camera.inertia = 0.9;",
    'camera smoothing',
  );

  s = replaceOrThrow(
    s,
    "      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));\n      this.instrumentRoots.set(id, root);",
    "      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));\n      this.instrumentRoots.set(id, root);\n      this.instrumentRotationTargets.set(id, 0);",
    'rotation target init',
  );

  s = replaceOrThrow(
    s,
    "    this.scene.onPointerObservable.add((pointerInfo) => {\n      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;",
    "    this.scene.onPointerObservable.add((pointerInfo) => {\n      if (this.interactionLocked) return;\n      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;",
    'interaction lock pointer',
  );

  s = replaceOrThrow(
    s,
    "  private rotateInstrument(id: InstrumentId, delta: number): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const currentAnchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n    root.rotation.y = normalizeInstrumentRotation(root.rotation.y + delta);\n    const clamped = clampInstrumentAnchor(id, currentAnchor, root.rotation.y);\n    root.position.x = clamped.x - standard.x;\n    root.position.z = clamped.z - standard.z;\n    this.refreshCableColliders();\n  }\n\n  private placeAtStandard(id: InstrumentId): void {\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const root = this.instrumentRoots.get(id);\n    if (root) root.rotation.y = 0;\n    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));\n  }",
    "  private rotateInstrument(id: InstrumentId, delta: number): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const currentAnchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n    const currentTarget = this.instrumentRotationTargets.get(id) ?? root.rotation.y;\n    const nextTarget = normalizeInstrumentRotation(currentTarget + delta);\n    this.instrumentRotationTargets.set(id, nextTarget);\n    const clamped = clampInstrumentAnchor(id, currentAnchor, nextTarget);\n    root.position.x = clamped.x - standard.x;\n    root.position.z = clamped.z - standard.z;\n  }\n\n  private placeAtStandard(id: InstrumentId, animate = false): void {\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const root = this.instrumentRoots.get(id);\n    if (root) {\n      root.rotation.y = 0;\n      root.scaling.setAll(1);\n    }\n    this.instrumentRotationTargets.set(id, 0);\n    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));\n    if (animate) this.beginInstrumentEntrance(id);\n  }",
    'smooth rotation and entrance placement',
  );

  s = replaceOrThrow(
    s,
    "  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {\n    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number }>;\n    const instrument = event.detail?.instrument as InstrumentId | undefined;\n    if (!instrument || !this.instrumentRoots.has(instrument)) return;\n    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'\n      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)\n      : null;\n    if (point) this.moveInstrument(instrument, point);\n    else this.placeAtStandard(instrument);\n  };",
    "  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {\n    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number; animate?: boolean }>;\n    const instrument = event.detail?.instrument as InstrumentId | undefined;\n    if (!instrument || !this.instrumentRoots.has(instrument)) return;\n    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'\n      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)\n      : null;\n    if (point) this.moveInstrument(instrument, point);\n    else this.placeAtStandard(instrument, Boolean(event.detail?.animate));\n  };",
    'animated place event',
  );

  s = replaceOrThrow(
    s,
    "    for (const root of this.instrumentRoots.values()) root.setEnabled(false);\n    this.placedInstruments.clear();",
    "    for (const [id, root] of this.instrumentRoots) {\n      root.setEnabled(false);\n      root.position.y = 0;\n      root.scaling.setAll(1);\n      root.rotation.y = 0;\n      this.instrumentRotationTargets.set(id, 0);\n    }\n    this.instrumentEntrances.clear();\n    this.placedInstruments.clear();",
    'clear entrance state',
  );

  s = replaceOrThrow(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private finishInstrumentRotate(pointerId?: number): void {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private finishInstrumentRotate(pointerId?: number): void {",
    'drag lock aware attach',
  );

  s = replaceOrThrow(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleContextMenu = (event: MouseEvent): void => {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleContextMenu = (event: MouseEvent): void => {",
    'rotate lock aware attach',
  );

  s = replaceOrThrow(
    s,
    "  private emitInstrumentPresence(): void {",
    `  private beginInstrumentEntrance(id: InstrumentId): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    root.position.y = 0.72;\n    root.scaling.setAll(0.94);\n    this.instrumentEntrances.set(id, { elapsed: 0, duration: 0.58 });\n  }\n\n  private updateInstrumentMotion(dt: number): void {\n    let collidersDirty = false;\n    for (const [id, root] of this.instrumentRoots) {\n      const target = this.instrumentRotationTargets.get(id) ?? root.rotation.y;\n      const next = smoothInstrumentRotation(root.rotation.y, target, dt, 11);\n      if (Math.abs(normalizeInstrumentRotation(next - root.rotation.y)) > 1e-5) {\n        root.rotation.y = next;\n        collidersDirty = true;\n      }\n\n      const entrance = this.instrumentEntrances.get(id);\n      if (!entrance) continue;\n      entrance.elapsed += dt;\n      const t = Math.min(1, entrance.elapsed / entrance.duration);\n      const eased = 1 - Math.pow(1 - t, 3);\n      root.position.y = 0.72 * (1 - eased);\n      root.scaling.setAll(0.94 + 0.06 * eased);\n      collidersDirty = true;\n      if (t >= 1) {\n        root.position.y = 0;\n        root.scaling.setAll(1);\n        this.instrumentEntrances.delete(id);\n      }\n    }\n    if (collidersDirty) this.refreshCableColliders();\n  }\n\n  private updateWireReveals(dt: number): void {\n    for (const visual of this.connectionMeshes.values()) {\n      if (visual.revealProgress >= 1) continue;\n      visual.revealProgress = Math.min(1, visual.revealProgress + dt / 0.46);\n      const t = visual.revealProgress;\n      const eased = 1 - Math.pow(1 - t, 3);\n      visual.cable.mesh.visibility = eased;\n      for (const plug of visual.plugs) plug.visibility = eased;\n    }\n  }\n\n  private readonly handleInteractionLock = (rawEvent: Event): void => {\n    const event = rawEvent as CustomEvent<{ locked?: boolean }>;\n    const locked = Boolean(event.detail?.locked);\n    this.finishInstrumentDrag();\n    this.finishInstrumentRotate();\n    this.finishInstrumentControl();\n    this.interactionLocked = locked;\n    if (locked) this.camera.detachControl();\n    else this.camera.attachControl(this.canvas, true, true);\n  };\n\n  private emitInstrumentPresence(): void {`,
    'motion helpers',
  );

  s = replaceOrThrow(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleControlWheel = (event: WheelEvent): void => {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleControlWheel = (event: WheelEvent): void => {\n    if (this.interactionLocked) return;",
    'control lock aware attach and wheel',
  );

  s = replaceOrThrow(
    s,
    "      this.connectionMeshes.set(connection.id, {\n        cable,\n        plugs: [...plugFrom, ...plugTo],\n        plugFrom,\n        plugTo,\n        from: connection.from,\n        to: connection.to,\n        material,\n        baseColor,\n      });",
    "      cable.mesh.visibility = 0.02;\n      for (const plug of [...plugFrom, ...plugTo]) plug.visibility = 0.02;\n\n      this.connectionMeshes.set(connection.id, {\n        cable,\n        plugs: [...plugFrom, ...plugTo],\n        plugFrom,\n        plugTo,\n        from: connection.from,\n        to: connection.to,\n        material,\n        baseColor,\n        revealProgress: 0,\n      });",
    'wire fade reveal',
  );

  writeFileSync(path, s);
}

{
  const path = 'src/ui/renderApp.ts';
  let s = readFileSync(path, 'utf8');
  s = replaceOrThrow(
    s,
    "  connectStandardCircuit,\n  getOhmsLawInstrumentModel,",
    "  getOhmsLawInstrumentModel,\n  ids,",
    'remove instant preset import',
  );

  s = replaceOrThrow(
    s,
    "const fmt = (value: number, digits = 2): string =>\n  Number.isFinite(value) ? value.toFixed(digits) : '∞';",
    "const fmt = (value: number, digits = 2): string =>\n  Number.isFinite(value) ? value.toFixed(digits) : '∞';\n\nconst wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));",
    'wait helper',
  );

  s = replaceOrThrow(
    s,
    "  let mode: AppMode = 'manual';\n  let section: AppSection = 'ohm';",
    "  let mode: AppMode = 'manual';\n  let section: AppSection = 'ohm';\n  let standardBuildSequence = 0;",
    'build sequence state',
  );

  s = replaceOrThrow(
    s,
    "  preset.addEventListener('click', () => {\n    canvas.dispatchEvent(new CustomEvent('lab:arrange-standard'));\n    connectStandardCircuit(runtime);\n  });",
    `  const setStandardBuildBusy = (busy: boolean, label = 'Собрать эталонную цепь'): void => {\n    preset.disabled = busy;\n    preset.classList.toggle('assembling', busy);\n    preset.textContent = label;\n    clearWires.disabled = busy;\n    clearBench.disabled = busy;\n    voltage.disabled = busy;\n    resistance.disabled = busy;\n    for (const item of root.querySelectorAll<HTMLButtonElement>('[data-equipment]')) {\n      item.disabled = busy;\n      item.draggable = !busy;\n    }\n  };\n\n  const runStandardBuild = async (): Promise<void> => {\n    const token = ++standardBuildSequence;\n    setStandardBuildBusy(true, 'Подготовка стола…');\n    canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: true } }));\n    runtime.clearConnections();\n    canvas.dispatchEvent(new CustomEvent('lab:clear-bench'));\n\n    try {\n      await wait(180);\n      const instruments = ['source', 'resistor', 'ammeter', 'voltmeter'] as const;\n      for (let index = 0; index < instruments.length; index += 1) {\n        if (token !== standardBuildSequence) return;\n        setStandardBuildBusy(true, \\`Приборы ${index + 1}/${instruments.length}…\\`);\n        canvas.dispatchEvent(new CustomEvent('lab:place-instrument', {\n          detail: { instrument: instruments[index], animate: true },\n        }));\n        await wait(index === 0 ? 540 : 460);\n      }\n\n      const connections = [\n        [ids.sourcePlus, ids.resistorA],\n        [ids.resistorB, ids.ammeterPlus],\n        [ids.ammeterMinus, ids.sourceMinus],\n        [ids.voltmeterPlus, ids.resistorA],\n        [ids.voltmeterMinus, ids.resistorB],\n      ] as const;\n\n      await wait(180);\n      for (let index = 0; index < connections.length; index += 1) {\n        if (token !== standardBuildSequence) return;\n        setStandardBuildBusy(true, \\`Провода ${index + 1}/${connections.length}…\\`);\n        const [from, to] = connections[index]!;\n        runtime.circuit.connect(from, to);\n        runtime.recalculate();\n        await wait(560);\n      }\n      await wait(260);\n    } finally {\n      if (token === standardBuildSequence) {\n        canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: false } }));\n        setStandardBuildBusy(false);\n      }\n    }\n  };\n\n  preset.addEventListener('click', () => { void runStandardBuild(); });`,
    'animated standard build',
  );

  writeFileSync(path, s);
}

{
  const path = 'src/styles.css';
  appendFileSync(path, `\n\n/* Smooth standard-assembly feedback */\n#preset.assembling {\n  position: relative;\n  overflow: hidden;\n  cursor: progress;\n  border-color: rgba(84, 217, 244, .72);\n  box-shadow: 0 0 0 1px rgba(84, 217, 244, .12), 0 0 22px rgba(84, 217, 244, .08);\n}\n#preset.assembling::after {\n  content: '';\n  position: absolute;\n  inset: 0;\n  transform: translateX(-115%);\n  background: linear-gradient(90deg, transparent, rgba(126, 233, 255, .16), transparent);\n  animation: assembly-scan 1.15s ease-in-out infinite;\n}\n@keyframes assembly-scan { to { transform: translateX(115%); } }\n`);
}
