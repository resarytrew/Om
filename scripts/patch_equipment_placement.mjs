import { readFileSync, writeFileSync } from 'node:fs';

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

// ---- Physical cables follow moving terminals and moving collision volumes ----
{
  const path = 'src/rendering/babylon/PhysicalCable.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceOrThrow(
    source,
    "  private readonly gravity = new Vector3(0, -9.81, 0);\n",
    "  private readonly gravity = new Vector3(0, -9.81, 0);\n  private readonly leadOut: number;\n  private readonly laneOffset: number;\n  private readonly cableY: number;\n",
    'cable fields',
  );
  source = replaceOrThrow(
    source,
    "    const particleCount = Math.max(20, options.particleCount ?? 28);\n    const leadOut = options.leadOut ?? 0.34;\n    const laneOffset = options.laneOffset ?? 0;\n    const floorY = options.floorY ?? 0.045;\n    const cableY = floorY + this.radius * 1.22;\n    const frontClearance = options.frontClearance ?? (0.72 + Math.abs(laneOffset) * 0.42);\n",
    "    const particleCount = Math.max(20, options.particleCount ?? 28);\n    this.leadOut = options.leadOut ?? 0.34;\n    this.laneOffset = options.laneOffset ?? 0;\n    const floorY = options.floorY ?? 0.045;\n    this.cableY = floorY + this.radius * 1.22;\n    const leadOut = this.leadOut;\n    const laneOffset = this.laneOffset;\n    const cableY = this.cableY;\n    const frontClearance = options.frontClearance ?? (0.72 + Math.abs(laneOffset) * 0.42);\n",
    'cable options',
  );
  source = replaceOrThrow(
    source,
    "  updateMesh(): void {\n",
    `  updateAnchors(start: Vector3, end: Vector3): void {\n    const startLead = start.add(new Vector3(0, 0, -this.leadOut));\n    const endLead = end.add(new Vector3(0, 0, -this.leadOut));\n    const startBend = new Vector3(\n      startLead.x,\n      Math.max(this.cableY + 0.08, this.cableY + (start.y - this.cableY) * 0.48),\n      startLead.z - 0.15,\n    );\n    const endBend = new Vector3(\n      endLead.x,\n      Math.max(this.cableY + 0.08, this.cableY + (end.y - this.cableY) * 0.48),\n      endLead.z - 0.15,\n    );\n    const startDrop = new Vector3(\n      startLead.x + this.laneOffset * 0.08,\n      this.cableY,\n      startLead.z - 0.3,\n    );\n    const endDrop = new Vector3(\n      endLead.x - this.laneOffset * 0.08,\n      this.cableY,\n      endLead.z - 0.3,\n    );\n\n    const startPins = [start, startLead, startBend, startDrop];\n    const endPins = [endDrop, endBend, endLead, end];\n    for (let index = 0; index < 4; index += 1) {\n      this.movePin(index, startPins[index]!);\n      this.movePin(this.particles.length - 4 + index, endPins[index]!);\n    }\n  }\n\n  updateMesh(): void {\n`,
    'cable updateMesh',
  );
  source = replaceOrThrow(
    source,
    "  private positions(): Vector3[] {\n",
    `  private movePin(index: number, target: Vector3): void {\n    const particle = this.particles[index];\n    if (!particle?.pin) return;\n    particle.pin.copyFrom(target);\n    particle.position.copyFrom(target);\n    particle.previous.copyFrom(target);\n  }\n\n  private positions(): Vector3[] {\n`,
    'cable positions',
  );
  source = replaceOrThrow(
    source,
    "  constructor(\n    private readonly colliders: readonly CableCollider[],\n    private readonly floorY = 0.045,\n  ) {}\n\n  add(cable: PhysicalCable): void {\n",
    "  constructor(\n    private colliders: readonly CableCollider[],\n    private readonly floorY = 0.045,\n  ) {}\n\n  setColliders(colliders: readonly CableCollider[]): void {\n    this.colliders = colliders;\n  }\n\n  add(cable: PhysicalCable): void {\n",
    'cable system colliders',
  );
  writeFileSync(path, source);
}

// ---- GLB shells participate in instrument roots and dragging ----
{
  const path = 'src/rendering/babylon/GlbInstrumentShells.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceOrThrow(
    source,
    "  ShadowGenerator,\n  Vector3,\n",
    "  ShadowGenerator,\n  TransformNode,\n  Vector3,\n",
    'glb TransformNode import',
  );
  source = replaceOrThrow(
    source,
    "interface ShellSpec {\n  readonly file: string;\n",
    "interface ShellSpec {\n  readonly instrumentId: string;\n  readonly file: string;\n",
    'glb shell instrument id',
  );
  source = replaceOrThrow(
    source,
    "function prepareImportedMeshes(\n  meshes: readonly AbstractMesh[],\n  position: Vector3,\n  shadow: ShadowGenerator,\n): void {\n  const root = meshes[0];\n  if (root) root.position = position.clone();\n\n  for (const mesh of meshes) {\n    mesh.isPickable = false;\n    shadow.addShadowCaster(mesh, true);\n  }\n}\n",
    `function prepareImportedMeshes(\n  meshes: readonly AbstractMesh[],\n  position: Vector3,\n  shadow: ShadowGenerator,\n  instrumentId: string,\n  parent?: TransformNode,\n): void {\n  const root = meshes[0];\n  if (root) {\n    root.position = position.clone();\n    if (parent) root.parent = parent;\n  }\n\n  for (const mesh of meshes) {\n    mesh.isPickable = true;\n    mesh.metadata = { ...(mesh.metadata ?? {}), instrumentId };\n    shadow.addShadowCaster(mesh, true);\n  }\n}\n`,
    'glb prepare meshes',
  );
  source = replaceOrThrow(
    source,
    "  rootUrl: string,\n  spec: ShellSpec,\n): Promise<void> {\n",
    "  rootUrl: string,\n  spec: ShellSpec,\n  parent?: TransformNode,\n): Promise<void> {\n",
    'glb install signature',
  );
  source = replaceOrThrow(
    source,
    "  prepareImportedMeshes(result.meshes, spec.position, shadow);\n",
    "  prepareImportedMeshes(result.meshes, spec.position, shadow, spec.instrumentId, parent);\n",
    'glb prepare call',
  );
  source = replaceOrThrow(
    source,
    "export function installOhmGlbShells(scene: Scene, shadow: ShadowGenerator): void {\n",
    "export function installOhmGlbShells(\n  scene: Scene,\n  shadow: ShadowGenerator,\n  parentFor?: (instrumentId: string) => TransformNode | undefined,\n): void {\n",
    'glb public signature',
  );
  source = source.replace("    {\n      file: 'power-supply-shell.glb',", "    {\n      instrumentId: 'source',\n      file: 'power-supply-shell.glb',");
  source = source.replace("    {\n      file: 'analog-meter-shell.glb',\n      position: new Vector3(3.55", "    {\n      instrumentId: 'ammeter',\n      file: 'analog-meter-shell.glb',\n      position: new Vector3(3.55");
  source = source.replace("    {\n      file: 'analog-meter-shell.glb',\n      position: new Vector3(1.48", "    {\n      instrumentId: 'voltmeter',\n      file: 'analog-meter-shell.glb',\n      position: new Vector3(1.48");
  source = source.replace("    {\n      file: 'resistor-base.glb',", "    {\n      instrumentId: 'resistor',\n      file: 'resistor-base.glb',");
  source = replaceOrThrow(
    source,
    "    void installShell(scene, shadow, rootUrl, spec).catch((error: unknown) => {\n",
    "    void installShell(scene, shadow, rootUrl, spec, parentFor?.(spec.instrumentId)).catch((error: unknown) => {\n",
    'glb install call',
  );
  writeFileSync(path, source);
}

// ---- UI equipment tray / drag and drop ----
{
  const path = 'src/ui/renderApp.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceOrThrow(
    source,
    "          <div class=\"scene-wrap\">\n            <canvas id=\"lab-canvas\" aria-label=\"Трёхмерная лабораторная установка\"></canvas>\n            <div class=\"scene-hint\" id=\"scene-hint\">Drag: вращать камеру · Колесо: приблизить/отдалить · Ctrl + drag: сдвиг · Клик по клемме: провод.</div>\n          </div>\n",
    `          <div class="scene-wrap">\n            <canvas id="lab-canvas" aria-label="Трёхмерная лабораторная установка"></canvas>\n            <div class="equipment-tray" aria-label="Оборудование лаборатории">\n              <div class="equipment-tray-head"><span>ОБОРУДОВАНИЕ</span><small>перетащите на стол</small></div>\n              <button class="equipment-item" draggable="true" data-equipment="source"><b>Источник</b><small>0–12 В</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="resistor"><b>Резистор</b><small>0.5–20 Ω</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="ammeter"><b>Амперметр</b><small>0–5 А</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="voltmeter"><b>Вольтметр</b><small>0–12 В</small><em>⋮⋮</em></button>\n              <button id="clear-bench" class="equipment-clear" type="button">Очистить стол</button>\n            </div>\n            <div class="scene-hint" id="scene-hint">Перетащите приборы из меню на стол · За корпус: переставить · Drag по фону: камера · Клик по клемме: провод.</div>\n          </div>\n`,
    'equipment tray markup',
  );
  source = replaceOrThrow(
    source,
    "  const clearWires = root.querySelector<HTMLButtonElement>('#clear-wires');\n",
    "  const clearWires = root.querySelector<HTMLButtonElement>('#clear-wires');\n  const clearBench = root.querySelector<HTMLButtonElement>('#clear-bench');\n",
    'clear bench query',
  );
  source = replaceOrThrow(
    source,
    "  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {\n",
    "  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearBench || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {\n",
    'clear bench required',
  );
  source = replaceOrThrow(
    source,
    "  preset.addEventListener('click', () => connectStandardCircuit(runtime));\n  measure.addEventListener('click', () => runtime.captureMeasurement());\n  clearWires.addEventListener('click', () => runtime.clearConnections());\n",
    `  const equipmentType = 'application/x-physics-instrument';\n  for (const item of root.querySelectorAll<HTMLButtonElement>('[data-equipment]')) {\n    item.addEventListener('dragstart', (event) => {\n      const instrument = item.dataset.equipment;\n      if (!instrument || !event.dataTransfer) return;\n      event.dataTransfer.setData(equipmentType, instrument);\n      event.dataTransfer.effectAllowed = 'move';\n      item.classList.add('dragging');\n    });\n    item.addEventListener('dragend', () => item.classList.remove('dragging'));\n    item.addEventListener('click', () => {\n      const instrument = item.dataset.equipment;\n      if (!instrument) return;\n      canvas.dispatchEvent(new CustomEvent('lab:place-instrument', { detail: { instrument } }));\n    });\n  }\n  canvas.addEventListener('dragover', (event) => {\n    if (!event.dataTransfer?.types.includes(equipmentType)) return;\n    event.preventDefault();\n    event.dataTransfer.dropEffect = 'move';\n    canvas.classList.add('equipment-drop-active');\n  });\n  canvas.addEventListener('dragleave', () => canvas.classList.remove('equipment-drop-active'));\n  canvas.addEventListener('drop', (event) => {\n    const instrument = event.dataTransfer?.getData(equipmentType);\n    canvas.classList.remove('equipment-drop-active');\n    if (!instrument) return;\n    event.preventDefault();\n    canvas.dispatchEvent(new CustomEvent('lab:place-instrument', {\n      detail: { instrument, clientX: event.clientX, clientY: event.clientY },\n    }));\n  });\n  canvas.addEventListener('lab:instrument-presence', ((rawEvent: Event) => {\n    const event = rawEvent as CustomEvent<{ placed?: string[] }>;\n    const placed = new Set(event.detail?.placed ?? []);\n    for (const item of root.querySelectorAll<HTMLButtonElement>('[data-equipment]')) {\n      const active = placed.has(item.dataset.equipment ?? '');\n      item.classList.toggle('placed', active);\n      item.setAttribute('aria-pressed', String(active));\n    }\n  }) as EventListener);\n\n  preset.addEventListener('click', () => {\n    canvas.dispatchEvent(new CustomEvent('lab:arrange-standard'));\n    connectStandardCircuit(runtime);\n  });\n  measure.addEventListener('click', () => runtime.captureMeasurement());\n  clearWires.addEventListener('click', () => runtime.clearConnections());\n  clearBench.addEventListener('click', () => {\n    runtime.clearConnections();\n    canvas.dispatchEvent(new CustomEvent('lab:clear-bench'));\n  });\n`,
    'equipment listeners',
  );
  source = replaceOrThrow(
    source,
    "      : 'Drag: вращать камеру · Колесо: приблизить/отдалить · Ctrl + drag: сдвиг · Клик по клемме: провод.';\n",
    "      : 'Прибор: тяните за корпус · Колесо: zoom · Drag по фону: камера · Ctrl + drag: сдвиг · Клик по клемме: провод.';\n",
    'scene hint',
  );
  writeFileSync(path, source);
}

// ---- Styles for the equipment tray and drop target ----
{
  const path = 'src/styles.css';
  let source = readFileSync(path, 'utf8');
  source = replaceOrThrow(
    source,
    ".scene-hint {\n",
    `.equipment-tray {\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  z-index: 4;\n  width: 178px;\n  padding: 10px;\n  border: 1px solid rgba(79, 115, 134, .55);\n  border-radius: 10px;\n  background: rgba(9, 14, 18, .88);\n  backdrop-filter: blur(12px);\n  box-shadow: 0 14px 34px rgba(0, 0, 0, .28);\n}\n.equipment-tray-head { display: grid; gap: 2px; margin: 0 2px 9px; }\n.equipment-tray-head span { color: var(--cyan); font: 700 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .09em; }\n.equipment-tray-head small { color: #677681; font-size: 10px; }\n.equipment-item {\n  position: relative;\n  width: 100%;\n  min-height: 46px;\n  margin-top: 6px;\n  padding: 7px 28px 7px 10px;\n  display: grid;\n  gap: 2px;\n  text-align: left;\n  border: 1px solid #273640;\n  border-radius: 7px;\n  background: rgba(17, 25, 31, .92);\n  color: #d8e1e7;\n  cursor: grab;\n}\n.equipment-item:hover { border-color: #3e7b91; background: #12232b; }\n.equipment-item.dragging { opacity: .55; cursor: grabbing; }\n.equipment-item.placed { border-color: #315c48; }\n.equipment-item.placed::after { content: 'НА СТОЛЕ'; position: absolute; right: 8px; bottom: 6px; color: #69d893; font: 700 7px ui-monospace, monospace; }\n.equipment-item b { font-size: 11px; font-weight: 650; }\n.equipment-item small { color: #70808b; font: 9px ui-monospace, monospace; }\n.equipment-item em { position: absolute; right: 9px; top: 8px; color: #5e7b89; font-style: normal; letter-spacing: -2px; }\n.equipment-clear { width: 100%; margin-top: 9px; min-height: 30px; border: 1px solid #303d46; border-radius: 7px; background: transparent; color: #7f8e98; cursor: pointer; font-size: 10px; }\n.equipment-clear:hover { color: #c2cbd1; border-color: #465760; }\n#lab-canvas.equipment-drop-active { outline: 2px solid rgba(84, 217, 244, .65); outline-offset: -3px; }\n\n.scene-hint {\n`,
    'equipment styles',
  );
  writeFileSync(path, source);
}

// ---- Babylon scene placement, body dragging, dynamic terminals/cables/colliders ----
{
  const path = 'src/rendering/babylon/LabScene.ts';
  let source = readFileSync(path, 'utf8');
  source = replaceOrThrow(
    source,
    "  StandardMaterial,\n  Vector3,\n",
    "  StandardMaterial,\n  TransformNode,\n  Vector3,\n",
    'LabScene TransformNode import',
  );
  source = replaceOrThrow(
    source,
    "import { installOhmGlbShells } from './GlbInstrumentShells';\n",
    "import { installOhmGlbShells } from './GlbInstrumentShells';\nimport { clampInstrumentAnchor, instrumentFromNodeName, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';\n",
    'LabScene placement import',
  );
  source = replaceOrThrow(
    source,
    "interface WireVisual {\n  readonly cable: PhysicalCable;\n  readonly plugs: readonly Mesh[];\n  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n}\n",
    `interface WireVisual {\n  readonly cable: PhysicalCable;\n  readonly plugs: readonly Mesh[];\n  readonly plugFrom: readonly Mesh[];\n  readonly plugTo: readonly Mesh[];\n  readonly from: TerminalId;\n  readonly to: TerminalId;\n  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n}\n`,
    'wire visual endpoints',
  );
  source = replaceOrThrow(
    source,
    "  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';\n",
    "  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';\n  readonly instrumentId?: InstrumentId;\n",
    'pick instrument id',
  );
  source = replaceOrThrow(
    source,
    "  private controlStartResistance = 3;\n\n  private source!: PowerSupplyVisual;\n",
    `  private controlStartResistance = 3;\n  private readonly instrumentRoots = new Map<InstrumentId, TransformNode>();\n  private readonly placedInstruments = new Set<InstrumentId>();\n  private activeInstrumentDrag: InstrumentId | null = null;\n  private instrumentDragPointerId: number | null = null;\n  private instrumentDragOffset = Vector3.Zero();\n\n  private source!: PowerSupplyVisual;\n`,
    'placement fields',
  );
  source = replaceOrThrow(
    source,
    "      this.voltmeter.tick(dt);\n      this.cablePhysics.step(dt);\n",
    "      this.voltmeter.tick(dt);\n      this.syncMovingConnections();\n      this.cablePhysics.step(dt);\n",
    'sync cables in render loop',
  );
  source = replaceOrThrow(
    source,
    "    this.canvas.addEventListener('keydown', this.handleKeyDown);\n    this.canvas.addEventListener('wheel', this.handleControlWheel, { passive: false });\n",
    `    this.canvas.addEventListener('keydown', this.handleKeyDown);\n    this.canvas.addEventListener('wheel', this.handleControlWheel, { passive: false });\n    this.canvas.addEventListener('lab:place-instrument', this.handlePlaceInstrumentEvent as EventListener);\n    this.canvas.addEventListener('lab:arrange-standard', this.handleArrangeStandard as EventListener);\n    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n`,
    'placement DOM listeners',
  );
  source = replaceOrThrow(
    source,
    "    this.canvas.removeEventListener('keydown', this.handleKeyDown);\n    this.canvas.removeEventListener('wheel', this.handleControlWheel);\n",
    `    this.canvas.removeEventListener('keydown', this.handleKeyDown);\n    this.canvas.removeEventListener('wheel', this.handleControlWheel);\n    this.canvas.removeEventListener('lab:place-instrument', this.handlePlaceInstrumentEvent as EventListener);\n    this.canvas.removeEventListener('lab:arrange-standard', this.handleArrangeStandard as EventListener);\n    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n`,
    'placement listener cleanup',
  );
  source = replaceOrThrow(
    source,
    "    // Cable collision volumes deliberately extend a little in front of every\n    // face panel. This prevents a physical lead from crossing dial/display\n    // textures while still allowing it to settle on the top and around sides.\n    const cableColliders: CableCollider[] = [\n      { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },\n      { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },\n      { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },\n      { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },\n    ];\n    this.cablePhysics = new PhysicalCableSystem(cableColliders, 0.045);\n",
    `    this.setupInstrumentRoots();\n\n    // Collision boxes are rebuilt from the placed instrument roots so cables\n    // keep respecting faces even after a learner rearranges the apparatus.\n    this.cablePhysics = new PhysicalCableSystem([], 0.045);\n    this.refreshCableColliders();\n`,
    'dynamic cable colliders',
  );
  source = replaceOrThrow(
    source,
    "    installOhmGlbShells(this.scene, shadow);\n  }\n\n  private createTerminal(\n",
    `    installOhmGlbShells(\n      this.scene,\n      shadow,\n      (instrumentId) => this.instrumentRoots.get(instrumentId as InstrumentId),\n    );\n    this.emitInstrumentPresence();\n  }\n\n  private setupInstrumentRoots(): void {\n    const ids: readonly InstrumentId[] = ['source', 'resistor', 'ammeter', 'voltmeter'];\n    for (const id of ids) {\n      const root = new TransformNode(\`instrument-root:\${id}\`, this.scene);\n      this.instrumentRoots.set(id, root);\n    }\n\n    for (const node of [...this.scene.transformNodes]) {\n      if (node.name.startsWith('instrument-root:') || node.parent) continue;\n      const instrument = instrumentFromNodeName(node.name);\n      if (instrument) node.parent = this.instrumentRoots.get(instrument) ?? null;\n    }\n\n    for (const mesh of this.scene.meshes) {\n      const instrument = instrumentFromNodeName(mesh.name);\n      if (!instrument) continue;\n      if (!mesh.parent) mesh.parent = this.instrumentRoots.get(instrument) ?? null;\n      const metadata = (mesh.metadata ?? {}) as PickMetadata;\n      if (!metadata.instrumentControl && !metadata.terminalId && !metadata.connectionId) {\n        mesh.metadata = { ...metadata, instrumentId: instrument } satisfies PickMetadata;\n        mesh.isPickable = true;\n      }\n    }\n\n    // Manual mode starts as a real construction task: an empty bench.\n    for (const root of this.instrumentRoots.values()) root.setEnabled(false);\n  }\n\n  private createTerminal(\n`,
    'instrument root setup',
  );
  source = replaceOrThrow(
    source,
    "      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl) {\n",
    `      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentId && this.placedInstruments.has(metadata.instrumentId)) {\n        const event = pointerInfo.event as PointerEvent;\n        const point = this.pickBenchAtClient(event.clientX, event.clientY);\n        const root = this.instrumentRoots.get(metadata.instrumentId);\n        const standard = STANDARD_INSTRUMENT_ANCHORS[metadata.instrumentId];\n        if (point && root) {\n          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n          this.activeInstrumentDrag = metadata.instrumentId;\n          this.instrumentDragPointerId = event.pointerId;\n          this.instrumentDragOffset = anchor.subtract(point);\n          this.camera.detachControl();\n          this.canvas.setPointerCapture?.(event.pointerId);\n          this.canvas.style.cursor = 'grabbing';\n          event.preventDefault();\n          return;\n        }\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentDrag) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.instrumentDragPointerId !== null && event.pointerId !== this.instrumentDragPointerId) return;\n        const point = this.pickBenchAtClient(event.clientX, event.clientY);\n        if (point) this.moveInstrument(this.activeInstrumentDrag, point.add(this.instrumentDragOffset));\n        event.preventDefault();\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeInstrumentDrag) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.instrumentDragPointerId === null || event.pointerId === this.instrumentDragPointerId) {\n          this.finishInstrumentDrag(event.pointerId);\n          event.preventDefault();\n        }\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl) {\n`,
    'instrument body drag interactions',
  );
  source = replaceOrThrow(
    source,
    "    if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';\n",
    "    if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';\n    else if (metadata?.instrumentId) this.canvas.style.cursor = 'move';\n",
    'body drag cursor',
  );
  source = replaceOrThrow(
    source,
    "    const from = this.terminalMeshes.get(selectedTerminal)?.mesh.position;\n",
    "    const from = this.terminalMeshes.get(selectedTerminal)?.mesh.getAbsolutePosition();\n",
    'preview from absolute terminal',
  );
  source = replaceOrThrow(
    source,
    "      ? this.terminalMeshes.get(this.hoveredTerminal)?.mesh.position\n",
    "      ? this.terminalMeshes.get(this.hoveredTerminal)?.mesh.getAbsolutePosition()\n",
    'preview snap absolute terminal',
  );
  source = replaceOrThrow(
    source,
    "  private currentSourceVoltage(): number {\n",
    `  private pickBenchAtClient(clientX: number, clientY: number): Vector3 | null {\n    if (!this.bench) return null;\n    const rect = this.canvas.getBoundingClientRect();\n    const x = (clientX - rect.left) * (this.engine.getRenderWidth() / Math.max(1, rect.width));\n    const y = (clientY - rect.top) * (this.engine.getRenderHeight() / Math.max(1, rect.height));\n    return this.scene.pick(x, y, (mesh) => mesh === this.bench)?.pickedPoint?.clone() ?? null;\n  }\n\n  private moveInstrument(id: InstrumentId, requested: Vector3): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const anchor = clampInstrumentAnchor(id, requested);\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    root.position.x = anchor.x - standard.x;\n    root.position.z = anchor.z - standard.z;\n    root.position.y = 0;\n    root.setEnabled(true);\n    this.placedInstruments.add(id);\n    this.refreshCableColliders();\n    this.emitInstrumentPresence();\n  }\n\n  private placeAtStandard(id: InstrumentId): void {\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));\n  }\n\n  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {\n    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number }>;\n    const instrument = event.detail?.instrument as InstrumentId | undefined;\n    if (!instrument || !this.instrumentRoots.has(instrument)) return;\n    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'\n      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)\n      : null;\n    if (point) this.moveInstrument(instrument, point);\n    else this.placeAtStandard(instrument);\n  };\n\n  private readonly handleArrangeStandard = (): void => {\n    for (const id of this.instrumentRoots.keys()) this.placeAtStandard(id);\n  };\n\n  private readonly handleClearBench = (): void => {\n    this.finishInstrumentDrag();\n    for (const root of this.instrumentRoots.values()) root.setEnabled(false);\n    this.placedInstruments.clear();\n    this.refreshCableColliders();\n    this.clearPreviewWire();\n    this.emitInstrumentPresence();\n  };\n\n  private finishInstrumentDrag(pointerId?: number): void {\n    this.activeInstrumentDrag = null;\n    this.instrumentDragPointerId = null;\n    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {\n      this.canvas.releasePointerCapture?.(pointerId);\n    }\n    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private emitInstrumentPresence(): void {\n    this.canvas.dispatchEvent(new CustomEvent('lab:instrument-presence', {\n      detail: { placed: [...this.placedInstruments] },\n    }));\n  }\n\n  private refreshCableColliders(): void {\n    if (!this.cablePhysics) return;\n    const base: Record<InstrumentId, CableCollider> = {\n      source: { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },\n      resistor: { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },\n      ammeter: { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },\n      voltmeter: { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },\n    };\n    const colliders: CableCollider[] = [];\n    for (const id of this.placedInstruments) {\n      const offset = this.instrumentRoots.get(id)?.position ?? Vector3.Zero();\n      colliders.push({ min: base[id].min.add(offset), max: base[id].max.add(offset) });\n    }\n    this.cablePhysics.setColliders(colliders);\n  }\n\n  private currentSourceVoltage(): number {\n`,
    'placement methods',
  );
  source = replaceOrThrow(
    source,
    "      const from = this.terminalMeshes.get(connection.from)?.mesh.position;\n      const to = this.terminalMeshes.get(connection.to)?.mesh.position;\n",
    "      const from = this.terminalMeshes.get(connection.from)?.mesh.getAbsolutePosition();\n      const to = this.terminalMeshes.get(connection.to)?.mesh.getAbsolutePosition();\n",
    'wire absolute endpoints',
  );
  source = replaceOrThrow(
    source,
    "      this.connectionMeshes.set(connection.id, {\n        cable,\n        plugs: [...plugFrom, ...plugTo],\n        material,\n        baseColor,\n      });\n",
    `      this.connectionMeshes.set(connection.id, {\n        cable,\n        plugs: [...plugFrom, ...plugTo],\n        plugFrom,\n        plugTo,\n        from: connection.from,\n        to: connection.to,\n        material,\n        baseColor,\n      });\n`,
    'wire visual storage',
  );
  source = replaceOrThrow(
    source,
    "  private createBananaPlug(\n",
    `  private syncMovingConnections(): void {\n    for (const visual of this.connectionMeshes.values()) {\n      const from = this.terminalMeshes.get(visual.from)?.mesh.getAbsolutePosition();\n      const to = this.terminalMeshes.get(visual.to)?.mesh.getAbsolutePosition();\n      if (!from || !to) continue;\n      visual.cable.updateAnchors(from, to);\n      this.positionBananaPlug(visual.plugFrom, from);\n      this.positionBananaPlug(visual.plugTo, to);\n    }\n  }\n\n  private positionBananaPlug(meshes: readonly Mesh[], terminalPosition: Vector3): void {\n    const sleeve = meshes[0];\n    const collar = meshes[1];\n    const strainRelief = meshes[2];\n    if (sleeve) sleeve.position = terminalPosition.add(new Vector3(0, 0, -0.27));\n    if (collar) collar.position = terminalPosition.add(new Vector3(0, 0, -0.155));\n    if (strainRelief) strainRelief.position = terminalPosition.add(new Vector3(0, 0, -0.455));\n  }\n\n  private createBananaPlug(\n`,
    'sync moving wires',
  );
  writeFileSync(path, source);
}

console.log('Equipment placement patch applied.');
