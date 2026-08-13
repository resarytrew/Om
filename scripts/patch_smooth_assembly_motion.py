from pathlib import Path


def replace_or_throw(source: str, search: str, replacement: str, label: str) -> str:
    if search not in source:
        raise RuntimeError(f"Missing patch target: {label}")
    return source.replace(search, replacement, 1)


path = Path('src/rendering/babylon/LabScene.ts')
s = path.read_text()
s = replace_or_throw(
    s,
    "import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    "import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, smoothInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    'smooth rotation import',
)
s = replace_or_throw(
    s,
    "  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n}",
    "  readonly material: PBRMaterial;\n  readonly baseColor: Color3;\n  revealProgress: number;\n}",
    'wire reveal state',
)
s = replace_or_throw(
    s,
    "  private instrumentRotateCenterY = 0;\n  private instrumentRotateLastAngle = 0;",
    "  private instrumentRotateCenterY = 0;\n  private instrumentRotateLastAngle = 0;\n  private readonly instrumentRotationTargets = new Map<InstrumentId, number>();\n  private readonly instrumentEntrances = new Map<InstrumentId, { elapsed: number; duration: number }>();\n  private interactionLocked = false;",
    'motion state',
)
s = replace_or_throw(
    s,
    "      this.ammeter.tick(dt);\n      this.voltmeter.tick(dt);\n      this.syncMovingConnections();",
    "      this.ammeter.tick(dt);\n      this.voltmeter.tick(dt);\n      this.updateInstrumentMotion(dt);\n      this.updateWireReveals(dt);\n      this.syncMovingConnections();",
    'render loop motion',
)
s = replace_or_throw(
    s,
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.addEventListener('contextmenu', this.handleContextMenu);",
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.addEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);\n    this.canvas.addEventListener('contextmenu', this.handleContextMenu);",
    'lock listener add',
)
s = replace_or_throw(
    s,
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);",
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.removeEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);\n    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);",
    'lock listener remove',
)
s = replace_or_throw(
    s,
    "    this.camera.wheelPrecision = 34;\n    this.camera.pinchPrecision = 72;\n    this.camera.inertia = 0.82;",
    "    this.camera.wheelPrecision = 48;\n    this.camera.pinchPrecision = 90;\n    this.camera.inertia = 0.9;",
    'camera smoothing',
)
s = replace_or_throw(
    s,
    "      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));\n      this.instrumentRoots.set(id, root);",
    "      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));\n      this.instrumentRoots.set(id, root);\n      this.instrumentRotationTargets.set(id, 0);",
    'rotation target init',
)
s = replace_or_throw(
    s,
    "    this.scene.onPointerObservable.add((pointerInfo) => {\n      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;",
    "    this.scene.onPointerObservable.add((pointerInfo) => {\n      if (this.interactionLocked) return;\n      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;",
    'interaction lock pointer',
)
s = replace_or_throw(
    s,
    """  private rotateInstrument(id: InstrumentId, delta: number): void {
    const root = this.instrumentRoots.get(id);
    if (!root) return;
    const standard = STANDARD_INSTRUMENT_ANCHORS[id];
    const currentAnchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);
    root.rotation.y = normalizeInstrumentRotation(root.rotation.y + delta);
    const clamped = clampInstrumentAnchor(id, currentAnchor, root.rotation.y);
    root.position.x = clamped.x - standard.x;
    root.position.z = clamped.z - standard.z;
    this.refreshCableColliders();
  }

  private placeAtStandard(id: InstrumentId): void {
    const standard = STANDARD_INSTRUMENT_ANCHORS[id];
    const root = this.instrumentRoots.get(id);
    if (root) root.rotation.y = 0;
    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));
  }""",
    """  private rotateInstrument(id: InstrumentId, delta: number): void {
    const root = this.instrumentRoots.get(id);
    if (!root) return;
    const standard = STANDARD_INSTRUMENT_ANCHORS[id];
    const currentAnchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);
    const currentTarget = this.instrumentRotationTargets.get(id) ?? root.rotation.y;
    const nextTarget = normalizeInstrumentRotation(currentTarget + delta);
    this.instrumentRotationTargets.set(id, nextTarget);
    const clamped = clampInstrumentAnchor(id, currentAnchor, nextTarget);
    root.position.x = clamped.x - standard.x;
    root.position.z = clamped.z - standard.z;
  }

  private placeAtStandard(id: InstrumentId, animate = false): void {
    const standard = STANDARD_INSTRUMENT_ANCHORS[id];
    const root = this.instrumentRoots.get(id);
    if (root) {
      root.rotation.y = 0;
      root.scaling.setAll(1);
    }
    this.instrumentRotationTargets.set(id, 0);
    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));
    if (animate) this.beginInstrumentEntrance(id);
  }""",
    'smooth rotation and entrance placement',
)
s = replace_or_throw(
    s,
    """  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {
    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number }>;
    const instrument = event.detail?.instrument as InstrumentId | undefined;
    if (!instrument || !this.instrumentRoots.has(instrument)) return;
    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'
      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)
      : null;
    if (point) this.moveInstrument(instrument, point);
    else this.placeAtStandard(instrument);
  };""",
    """  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {
    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number; animate?: boolean }>;
    const instrument = event.detail?.instrument as InstrumentId | undefined;
    if (!instrument || !this.instrumentRoots.has(instrument)) return;
    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'
      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)
      : null;
    if (point) this.moveInstrument(instrument, point);
    else this.placeAtStandard(instrument, Boolean(event.detail?.animate));
  };""",
    'animated place event',
)
s = replace_or_throw(
    s,
    "    for (const root of this.instrumentRoots.values()) root.setEnabled(false);\n    this.placedInstruments.clear();",
    "    for (const [id, root] of this.instrumentRoots) {\n      root.setEnabled(false);\n      root.position.y = 0;\n      root.scaling.setAll(1);\n      root.rotation.y = 0;\n      this.instrumentRotationTargets.set(id, 0);\n    }\n    this.instrumentEntrances.clear();\n    this.placedInstruments.clear();",
    'clear entrance state',
)
s = replace_or_throw(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private finishInstrumentRotate(pointerId?: number): void {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private finishInstrumentRotate(pointerId?: number): void {",
    'drag lock aware attach',
)
s = replace_or_throw(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleContextMenu = (event: MouseEvent): void => {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleContextMenu = (event: MouseEvent): void => {",
    'rotate lock aware attach',
)
s = replace_or_throw(
    s,
    "  private emitInstrumentPresence(): void {",
    """  private beginInstrumentEntrance(id: InstrumentId): void {
    const root = this.instrumentRoots.get(id);
    if (!root) return;
    root.position.y = 0.72;
    root.scaling.setAll(0.94);
    this.instrumentEntrances.set(id, { elapsed: 0, duration: 0.58 });
  }

  private updateInstrumentMotion(dt: number): void {
    let collidersDirty = false;
    for (const [id, root] of this.instrumentRoots) {
      const target = this.instrumentRotationTargets.get(id) ?? root.rotation.y;
      const next = smoothInstrumentRotation(root.rotation.y, target, dt, 11);
      if (Math.abs(normalizeInstrumentRotation(next - root.rotation.y)) > 1e-5) {
        root.rotation.y = next;
        collidersDirty = true;
      }

      const entrance = this.instrumentEntrances.get(id);
      if (!entrance) continue;
      entrance.elapsed += dt;
      const t = Math.min(1, entrance.elapsed / entrance.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      root.position.y = 0.72 * (1 - eased);
      root.scaling.setAll(0.94 + 0.06 * eased);
      collidersDirty = true;
      if (t >= 1) {
        root.position.y = 0;
        root.scaling.setAll(1);
        this.instrumentEntrances.delete(id);
      }
    }
    if (collidersDirty) this.refreshCableColliders();
  }

  private updateWireReveals(dt: number): void {
    for (const visual of this.connectionMeshes.values()) {
      if (visual.revealProgress >= 1) continue;
      visual.revealProgress = Math.min(1, visual.revealProgress + dt / 0.46);
      const t = visual.revealProgress;
      const eased = 1 - Math.pow(1 - t, 3);
      visual.cable.mesh.visibility = eased;
      for (const plug of visual.plugs) plug.visibility = eased;
    }
  }

  private readonly handleInteractionLock = (rawEvent: Event): void => {
    const event = rawEvent as CustomEvent<{ locked?: boolean }>;
    const locked = Boolean(event.detail?.locked);
    this.finishInstrumentDrag();
    this.finishInstrumentRotate();
    this.finishInstrumentControl();
    this.interactionLocked = locked;
    if (locked) this.camera.detachControl();
    else this.camera.attachControl(this.canvas, true, true);
  };

  private emitInstrumentPresence(): void {""",
    'motion helpers',
)
s = replace_or_throw(
    s,
    "    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleControlWheel = (event: WheelEvent): void => {",
    "    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleControlWheel = (event: WheelEvent): void => {\n    if (this.interactionLocked) return;",
    'control lock aware attach and wheel',
)
s = replace_or_throw(
    s,
    """      this.connectionMeshes.set(connection.id, {
        cable,
        plugs: [...plugFrom, ...plugTo],
        plugFrom,
        plugTo,
        from: connection.from,
        to: connection.to,
        material,
        baseColor,
      });""",
    """      cable.mesh.visibility = 0.02;
      for (const plug of [...plugFrom, ...plugTo]) plug.visibility = 0.02;

      this.connectionMeshes.set(connection.id, {
        cable,
        plugs: [...plugFrom, ...plugTo],
        plugFrom,
        plugTo,
        from: connection.from,
        to: connection.to,
        material,
        baseColor,
        revealProgress: 0,
      });""",
    'wire fade reveal',
)
path.write_text(s)


path = Path('src/ui/renderApp.ts')
s = path.read_text()
s = replace_or_throw(
    s,
    "  connectStandardCircuit,\n  getOhmsLawInstrumentModel,",
    "  getOhmsLawInstrumentModel,\n  ids,",
    'remove instant preset import',
)
s = replace_or_throw(
    s,
    "const fmt = (value: number, digits = 2): string =>\n  Number.isFinite(value) ? value.toFixed(digits) : '∞';",
    "const fmt = (value: number, digits = 2): string =>\n  Number.isFinite(value) ? value.toFixed(digits) : '∞';\n\nconst wait = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));",
    'wait helper',
)
s = replace_or_throw(
    s,
    "  let mode: AppMode = 'manual';\n  let section: AppSection = 'ohm';",
    "  let mode: AppMode = 'manual';\n  let section: AppSection = 'ohm';\n  let standardBuildSequence = 0;",
    'build sequence state',
)
s = replace_or_throw(
    s,
    """  preset.addEventListener('click', () => {
    canvas.dispatchEvent(new CustomEvent('lab:arrange-standard'));
    connectStandardCircuit(runtime);
  });""",
    """  const setStandardBuildBusy = (busy: boolean, label = 'Собрать эталонную цепь'): void => {
    preset.disabled = busy;
    preset.classList.toggle('assembling', busy);
    preset.textContent = label;
    clearWires.disabled = busy;
    clearBench.disabled = busy;
    voltage.disabled = busy;
    resistance.disabled = busy;
    for (const item of root.querySelectorAll<HTMLButtonElement>('[data-equipment]')) {
      item.disabled = busy;
      item.draggable = !busy;
    }
  };

  const runStandardBuild = async (): Promise<void> => {
    const token = ++standardBuildSequence;
    setStandardBuildBusy(true, 'Подготовка стола…');
    canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: true } }));
    runtime.clearConnections();
    canvas.dispatchEvent(new CustomEvent('lab:clear-bench'));

    try {
      await wait(180);
      const instruments = ['source', 'resistor', 'ammeter', 'voltmeter'] as const;
      for (let index = 0; index < instruments.length; index += 1) {
        if (token !== standardBuildSequence) return;
        setStandardBuildBusy(true, `Приборы ${index + 1}/${instruments.length}…`);
        canvas.dispatchEvent(new CustomEvent('lab:place-instrument', {
          detail: { instrument: instruments[index], animate: true },
        }));
        await wait(index === 0 ? 540 : 460);
      }

      const connections = [
        [ids.sourcePlus, ids.resistorA],
        [ids.resistorB, ids.ammeterPlus],
        [ids.ammeterMinus, ids.sourceMinus],
        [ids.voltmeterPlus, ids.resistorA],
        [ids.voltmeterMinus, ids.resistorB],
      ] as const;

      await wait(180);
      for (let index = 0; index < connections.length; index += 1) {
        if (token !== standardBuildSequence) return;
        setStandardBuildBusy(true, `Провода ${index + 1}/${connections.length}…`);
        const [from, to] = connections[index]!;
        runtime.circuit.connect(from, to);
        runtime.recalculate();
        await wait(560);
      }
      await wait(260);
    } finally {
      if (token === standardBuildSequence) {
        canvas.dispatchEvent(new CustomEvent('lab:set-interaction-lock', { detail: { locked: false } }));
        setStandardBuildBusy(false);
      }
    }
  };

  preset.addEventListener('click', () => { void runStandardBuild(); });""",
    'animated standard build',
)
path.write_text(s)


path = Path('src/styles.css')
s = path.read_text()
if '/* Smooth standard-assembly feedback */' not in s:
    s += """

/* Smooth standard-assembly feedback */
#preset.assembling {
  position: relative;
  overflow: hidden;
  cursor: progress;
  border-color: rgba(84, 217, 244, .72);
  box-shadow: 0 0 0 1px rgba(84, 217, 244, .12), 0 0 22px rgba(84, 217, 244, .08);
}
#preset.assembling::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-115%);
  background: linear-gradient(90deg, transparent, rgba(126, 233, 255, .16), transparent);
  animation: assembly-scan 1.15s ease-in-out infinite;
}
@keyframes assembly-scan { to { transform: translateX(115%); } }
"""
path.write_text(s)
