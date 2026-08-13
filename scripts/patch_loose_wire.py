from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)

lab_path = Path('src/rendering/babylon/LabScene.ts')
ui_path = Path('src/ui/renderApp.ts')
css_path = Path('src/styles.css')
lab = lab_path.read_text()
ui = ui_path.read_text()
css = css_path.read_text()

lab = replace_once(lab, '''interface PickMetadata {
  readonly terminalId?: string;
  readonly connectionId?: string;
  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';
  readonly instrumentId?: InstrumentId;
}
''', '''type LooseWireEnd = 'start' | 'end';

interface LooseWireVisual {
  readonly id: string;
  readonly cable: PhysicalCable;
  readonly material: PBRMaterial;
  readonly baseColor: Color3;
  readonly plugStart: readonly Mesh[];
  readonly plugEnd: readonly Mesh[];
  start: Vector3;
  end: Vector3;
  startTerminal: TerminalId | null;
  endTerminal: TerminalId | null;
}

interface PickMetadata {
  readonly terminalId?: string;
  readonly connectionId?: string;
  readonly looseWireId?: string;
  readonly looseWireEnd?: LooseWireEnd;
  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';
  readonly instrumentId?: InstrumentId;
}
''', 'loose wire interfaces')

lab = replace_once(lab, '''  private readonly connectionMeshes = new Map<string, WireVisual>();
  private cablePhysics!: PhysicalCableSystem;
''', '''  private readonly connectionMeshes = new Map<string, WireVisual>();
  private readonly looseWires = new Map<string, LooseWireVisual>();
  private readonly connectionColorOverrides = new Map<ConnectionId, Color3>();
  private looseWireCounter = 0;
  private activeLooseWire: { id: string; end: LooseWireEnd } | null = null;
  private looseWirePointerId: number | null = null;
  private looseWireCandidateTerminal: TerminalId | null = null;
  private cablePhysics!: PhysicalCableSystem;
''', 'loose wire fields')

lab = replace_once(lab, '''      this.updateWireReveals(dt);
      this.syncMovingConnections();
      this.cablePhysics.step(dt);
''', '''      this.updateWireReveals(dt);
      this.syncMovingConnections();
      this.syncLooseWires();
      this.cablePhysics.step(dt);
''', 'loose wire render sync')

lab = replace_once(lab, '''    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.previewWire?.dispose();
    this.cablePhysics.dispose();
''', '''    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.previewWire?.dispose();
    for (const loose of this.looseWires.values()) {
      for (const mesh of [...loose.plugStart, ...loose.plugEnd]) mesh.dispose();
      loose.material.dispose();
    }
    this.looseWires.clear();
    this.cablePhysics.dispose();
''', 'dispose loose wires')

lab = replace_once(lab, '''      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance')) {
''', '''      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.looseWireId && metadata.looseWireEnd) {
        const event = pointerInfo.event as PointerEvent;
        const loose = this.looseWires.get(metadata.looseWireId);
        if (!loose) return;
        this.activeLooseWire = { id: metadata.looseWireId, end: metadata.looseWireEnd };
        this.looseWirePointerId = event.pointerId;
        this.looseWireCandidateTerminal = null;
        if (metadata.looseWireEnd === 'start') loose.startTerminal = null;
        else loose.endTerminal = null;
        this.camera.detachControl();
        this.canvas.setPointerCapture?.(event.pointerId);
        this.canvas.style.cursor = 'grabbing';
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance')) {
''', 'pointer down loose wire')

lab = replace_once(lab, '''      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentRotate) {
''', '''      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeLooseWire) {
        const event = pointerInfo.event as PointerEvent;
        if (this.looseWirePointerId !== null && event.pointerId !== this.looseWirePointerId) return;
        this.moveLooseWireEnd(event.clientX, event.clientY);
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeLooseWire) {
        const event = pointerInfo.event as PointerEvent;
        if (this.looseWirePointerId === null || event.pointerId === this.looseWirePointerId) {
          this.finishLooseWireDrag(event.clientX, event.clientY, event.pointerId);
          event.preventDefault();
        }
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentRotate) {
''', 'pointer move loose wire')

lab = replace_once(lab, '''    if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';
    else if (metadata?.instrumentId) this.canvas.style.cursor = 'move';
''', '''    if (metadata?.looseWireId && metadata.looseWireEnd) this.canvas.style.cursor = 'grab';
    else if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';
    else if (metadata?.instrumentId) this.canvas.style.cursor = 'move';
''', 'loose wire cursor')

lab = replace_once(lab, '''  private moveInstrument(id: InstrumentId, requested: Vector3): void {
''', '''  private pickTerminalAtClient(clientX: number, clientY: number): TerminalId | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.engine.getRenderWidth() / Math.max(1, rect.width));
    const y = (clientY - rect.top) * (this.engine.getRenderHeight() / Math.max(1, rect.height));
    const pick = this.scene.pick(x, y, (mesh) => Boolean((mesh.metadata as PickMetadata | null)?.terminalId));
    const id = (pick?.pickedMesh?.metadata as PickMetadata | null)?.terminalId;
    return id ? terminalId(id) : null;
  }

  private clampLooseWirePoint(point: Vector3): Vector3 {
    return new Vector3(
      Math.min(4.55, Math.max(-4.55, point.x)),
      Math.max(0.13, point.y),
      Math.min(2.42, Math.max(-1.48, point.z)),
    );
  }

  private placeLooseWire(point: Vector3 | null): void {
    const index = ++this.looseWireCounter;
    const id = `loose-wire-${index}`;
    const center = this.clampLooseWirePoint(point?.clone() ?? new Vector3(-0.2 + (index % 3) * 0.3, 0.14, -1.02));
    center.y = 0.14;
    const start = this.clampLooseWirePoint(center.add(new Vector3(-0.95, 0, 0.05)));
    const end = this.clampLooseWirePoint(center.add(new Vector3(0.95, 0, 0.18)));
    const red = index % 2 === 1;
    const baseColor = red ? new Color3(0.54, 0.018, 0.03) : new Color3(0.012, 0.015, 0.018);
    const material = new PBRMaterial(`loose-wire-material:${id}`, this.scene);
    material.albedoColor = baseColor;
    material.metallic = 0;
    material.roughness = 0.94;
    material.environmentIntensity = 0.32;

    const cable = new PhysicalCable(this.scene, id, start, end, material, {
      radius: 0.046,
      particleCount: 30,
      laneOffset: index % 2 === 0 ? 0.08 : -0.08,
      leadOut: 0.18,
      floorY: 0.045,
      frontClearance: 0.38,
    });
    cable.mesh.isPickable = false;
    this.cablePhysics.add(cable);

    const plugStart = this.createBananaPlug(`loose-start:${id}`, start, material, { looseWireId: id, looseWireEnd: 'start' });
    const plugEnd = this.createBananaPlug(`loose-end:${id}`, end, material, { looseWireId: id, looseWireEnd: 'end' });
    this.looseWires.set(id, {
      id,
      cable,
      material,
      baseColor,
      plugStart,
      plugEnd,
      start,
      end,
      startTerminal: null,
      endTerminal: null,
    });
  }

  private moveLooseWireEnd(clientX: number, clientY: number): void {
    const active = this.activeLooseWire;
    if (!active) return;
    const loose = this.looseWires.get(active.id);
    if (!loose) return;
    const terminal = this.pickTerminalAtClient(clientX, clientY);
    this.looseWireCandidateTerminal = terminal;
    let target: Vector3 | null = null;
    if (terminal) target = this.terminalMeshes.get(terminal)?.mesh.getAbsolutePosition().clone() ?? null;
    if (!target) {
      const bench = this.pickBenchAtClient(clientX, clientY);
      if (bench) {
        bench.y = 0.14;
        target = this.clampLooseWirePoint(bench);
      }
    }
    if (!target) return;
    if (active.end === 'start') loose.start = target;
    else loose.end = target;
    loose.cable.updateAnchors(loose.start, loose.end);
    this.positionBananaPlug(active.end === 'start' ? loose.plugStart : loose.plugEnd, target);
    if (terminal) this.refreshTerminals(terminal, null);
    else this.refreshTerminals(this.runtime.getState().selectedTerminal, null);
  }

  private finishLooseWireDrag(clientX: number, clientY: number, pointerId?: number): void {
    const active = this.activeLooseWire;
    if (active) {
      const loose = this.looseWires.get(active.id);
      const terminal = this.pickTerminalAtClient(clientX, clientY) ?? this.looseWireCandidateTerminal;
      if (loose && terminal) {
        if (active.end === 'start') loose.startTerminal = terminal;
        else loose.endTerminal = terminal;
      }
      if (loose) this.tryCompleteLooseWire(loose, active.end);
    }
    this.activeLooseWire = null;
    this.looseWirePointerId = null;
    this.looseWireCandidateTerminal = null;
    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) this.canvas.releasePointerCapture?.(pointerId);
    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);
    this.canvas.style.cursor = 'default';
    this.refreshTerminals(this.runtime.getState().selectedTerminal, this.hoveredTerminal);
  }

  private tryCompleteLooseWire(loose: LooseWireVisual, movedEnd: LooseWireEnd): void {
    if (!loose.startTerminal || !loose.endTerminal) return;
    if (loose.startTerminal === loose.endTerminal) {
      if (movedEnd === 'start') loose.startTerminal = null;
      else loose.endTerminal = null;
      return;
    }
    const duplicate = this.runtime.circuit.snapshot().connections.find((connection) =>
      (connection.from === loose.startTerminal && connection.to === loose.endTerminal)
      || (connection.from === loose.endTerminal && connection.to === loose.startTerminal));
    if (duplicate) {
      if (movedEnd === 'start') loose.startTerminal = null;
      else loose.endTerminal = null;
      return;
    }
    const connection = this.runtime.circuit.connect(loose.startTerminal, loose.endTerminal);
    this.connectionColorOverrides.set(connection.id, loose.baseColor.clone());
    this.runtime.recalculate();
    this.removeLooseWire(loose.id);
  }

  private syncLooseWires(): void {
    for (const loose of this.looseWires.values()) {
      if (loose.startTerminal) {
        const point = this.terminalMeshes.get(loose.startTerminal)?.mesh.getAbsolutePosition();
        if (point) loose.start = point.clone();
      }
      if (loose.endTerminal) {
        const point = this.terminalMeshes.get(loose.endTerminal)?.mesh.getAbsolutePosition();
        if (point) loose.end = point.clone();
      }
      loose.cable.updateAnchors(loose.start, loose.end);
      this.positionBananaPlug(loose.plugStart, loose.start);
      this.positionBananaPlug(loose.plugEnd, loose.end);
    }
  }

  private removeLooseWire(id: string): void {
    const loose = this.looseWires.get(id);
    if (!loose) return;
    this.cablePhysics.remove(loose.cable);
    for (const mesh of [...loose.plugStart, ...loose.plugEnd]) mesh.dispose();
    loose.material.dispose();
    this.looseWires.delete(id);
  }

  private clearLooseWires(): void {
    for (const id of [...this.looseWires.keys()]) this.removeLooseWire(id);
  }

  private moveInstrument(id: InstrumentId, requested: Vector3): void {
''', 'loose wire helpers')

lab = replace_once(lab, '''  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {
    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number; animate?: boolean }>;
    const instrument = event.detail?.instrument as InstrumentId | undefined;
    if (!instrument || !this.instrumentRoots.has(instrument)) return;
    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'
      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)
      : null;
    if (point) this.moveInstrument(instrument, point);
    else this.placeAtStandard(instrument, Boolean(event.detail?.animate));
  };
''', '''  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {
    const event = rawEvent as CustomEvent<{ instrument?: string; clientX?: number; clientY?: number; animate?: boolean }>;
    const equipment = event.detail?.instrument;
    const point = typeof event.detail.clientX === 'number' && typeof event.detail.clientY === 'number'
      ? this.pickBenchAtClient(event.detail.clientX, event.detail.clientY)
      : null;
    if (equipment === 'wire') {
      this.placeLooseWire(point);
      return;
    }
    const instrument = equipment as InstrumentId | undefined;
    if (!instrument || !this.instrumentRoots.has(instrument)) return;
    if (point) this.moveInstrument(instrument, point);
    else this.placeAtStandard(instrument, Boolean(event.detail?.animate));
  };
''', 'place event wire branch')

lab = replace_once(lab, '''    this.instrumentEntrances.clear();
    this.placedInstruments.clear();
''', '''    this.instrumentEntrances.clear();
    this.clearLooseWires();
    this.placedInstruments.clear();
''', 'clear bench loose wires')

lab = replace_once(lab, '''      if (!activeIds.has(id)) {
        this.cablePhysics.remove(visual.cable);
        for (const mesh of visual.plugs) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
      }
''', '''      if (!activeIds.has(id)) {
        this.cablePhysics.remove(visual.cable);
        for (const mesh of visual.plugs) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
        this.connectionColorOverrides.delete(connectionId(id));
      }
''', 'cleanup color override')

lab = replace_once(lab, '''      const baseColor = red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018);
''', '''      const baseColor = this.connectionColorOverrides.get(connection.id)?.clone() ?? (red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018));
''', 'preserve loose wire color')

lab = replace_once(lab, '''      const plugFrom = this.createBananaPlug(
        `plug-from:${connection.id}`,
        from,
        material,
        connection.id,
      );
      const plugTo = this.createBananaPlug(
        `plug-to:${connection.id}`,
        to,
        material,
        connection.id,
      );
''', '''      const plugFrom = this.createBananaPlug(
        `plug-from:${connection.id}`,
        from,
        material,
        { connectionId: connection.id },
      );
      const plugTo = this.createBananaPlug(
        `plug-to:${connection.id}`,
        to,
        material,
        { connectionId: connection.id },
      );
''', 'banana plug metadata calls')

lab = replace_once(lab, '''  private createBananaPlug(
    name: string,
    terminalPosition: Vector3,
    material: PBRMaterial,
    id: ConnectionId,
  ): Mesh[] {
''', '''  private createBananaPlug(
    name: string,
    terminalPosition: Vector3,
    material: PBRMaterial,
    metadata: PickMetadata,
  ): Mesh[] {
''', 'banana plug signature')

lab = replace_once(lab, '''    sleeve.isPickable = true;
    sleeve.metadata = { connectionId: id } satisfies PickMetadata;
''', '''    sleeve.isPickable = true;
    sleeve.metadata = metadata;
''', 'banana sleeve metadata')

lab = replace_once(lab, '''    strainRelief.isPickable = true;
    strainRelief.metadata = { connectionId: id } satisfies PickMetadata;
''', '''    strainRelief.isPickable = true;
    strainRelief.metadata = metadata;
''', 'banana strain metadata')

ui = replace_once(ui, '<div><span>LAB GEAR</span><small>перетащите прибор на стол</small></div>', '<div><span>LAB GEAR</span><small>перетащите прибор или провод на стол</small></div>', 'dock copy')
ui = replace_once(ui, '''                <button class="equipment-item" draggable="true" data-equipment="voltmeter" aria-label="Вольтметр 0–12 В"><span class="equipment-icon">V</span><span class="equipment-copy"><b>Вольтметр</b><small>0–12 V</small></span><span class="equipment-state">READY</span></button>
''', '''                <button class="equipment-item" draggable="true" data-equipment="voltmeter" aria-label="Вольтметр 0–12 В"><span class="equipment-icon">V</span><span class="equipment-copy"><b>Вольтметр</b><small>0–12 V</small></span><span class="equipment-state">READY</span></button>
                <button class="equipment-item equipment-wire" draggable="true" data-equipment="wire" aria-label="Лабораторный провод с banana-штекерами"><span class="equipment-icon">⌁</span><span class="equipment-copy"><b>Провод</b><small>banana lead · физика</small></span><span class="equipment-state">∞ AVAILABLE</span></button>
''', 'wire equipment card')
ui = replace_once(ui, 'Из дока → на стол · ЛКМ за корпус: переставить · ПКМ или Shift + drag: повернуть · Drag по фону: камера · Клемма: провод.', 'Из дока → на стол · Прибор: ЛКМ двигать, ПКМ/Shift крутить · Провод: тяните за штекер к клемме · Drag по фону: камера.', 'scene hint')

ui = replace_once(ui, '''      const active = placed.has(item.dataset.equipment ?? '');
      item.classList.toggle('placed', active);
      item.setAttribute('aria-pressed', String(active));
      const equipmentState = item.querySelector<HTMLElement>('.equipment-state');
      if (equipmentState) equipmentState.textContent = active ? 'ON BENCH' : 'READY';
''', '''      const equipment = item.dataset.equipment ?? '';
      const equipmentState = item.querySelector<HTMLElement>('.equipment-state');
      if (equipment === 'wire') {
        item.classList.remove('placed');
        item.setAttribute('aria-pressed', 'false');
        if (equipmentState) equipmentState.textContent = '∞ AVAILABLE';
        continue;
      }
      const active = placed.has(equipment);
      item.classList.toggle('placed', active);
      item.setAttribute('aria-pressed', String(active));
      if (equipmentState) equipmentState.textContent = active ? 'ON BENCH' : 'READY';
''', 'wire inventory state')

css += '''

/* Loose laboratory leads are inventory, not a one-per-bench instrument. */
.equipment-item.equipment-wire {
  grid-column: 1 / -1;
  min-height: 62px;
  grid-template-columns: 34px 1fr auto;
  grid-template-rows: 1fr;
  align-items: center;
  column-gap: 9px;
}
.equipment-item.equipment-wire .equipment-copy { align-self: center; }
.equipment-item.equipment-wire .equipment-state {
  justify-self: end;
  align-self: center;
  color: #71cfe3;
  font-size: 7.5px;
}
'''

lab_path.write_text(lab)
ui_path.write_text(ui)
css_path.write_text(css)
print('patched loose-wire bench interaction')
