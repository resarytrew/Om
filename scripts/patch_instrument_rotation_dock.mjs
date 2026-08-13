import { readFileSync, writeFileSync } from 'node:fs';

function replaceOrThrow(source, search, replacement, label) {
  if (!source.includes(search)) throw new Error(`Missing patch target: ${label}`);
  return source.replace(search, replacement);
}

{
  const path = 'src/rendering/babylon/LabScene.ts';
  let s = readFileSync(path, 'utf8');
  s = replaceOrThrow(
    s,
    "import { clampInstrumentAnchor, instrumentFromNodeName, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    "import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';",
    'placement import',
  );
  s = replaceOrThrow(
    s,
    "  private activeInstrumentDrag: InstrumentId | null = null;\n  private instrumentDragPointerId: number | null = null;\n  private instrumentDragOffset = Vector3.Zero();",
    "  private activeInstrumentDrag: InstrumentId | null = null;\n  private instrumentDragPointerId: number | null = null;\n  private instrumentDragOffset = Vector3.Zero();\n  private activeInstrumentRotate: InstrumentId | null = null;\n  private instrumentRotatePointerId: number | null = null;\n  private instrumentRotateCenterX = 0;\n  private instrumentRotateCenterY = 0;\n  private instrumentRotateLastAngle = 0;",
    'rotation state',
  );
  s = replaceOrThrow(
    s,
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);",
    "    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.addEventListener('contextmenu', this.handleContextMenu);",
    'context menu add',
  );
  s = replaceOrThrow(
    s,
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);",
    "    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);\n    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);",
    'context menu remove',
  );
  s = replaceOrThrow(
    s,
    "      const root = new TransformNode(`instrument-root:${id}`, this.scene);\n      this.instrumentRoots.set(id, root);",
    "      const root = new TransformNode(`instrument-root:${id}`, this.scene);\n      const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));\n      this.instrumentRoots.set(id, root);",
    'instrument root pivot',
  );
  s = replaceOrThrow(
    s,
    "      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentId && this.placedInstruments.has(metadata.instrumentId)) {\n        const event = pointerInfo.event as PointerEvent;\n        const point = this.pickBenchAtClient(event.clientX, event.clientY);\n        const root = this.instrumentRoots.get(metadata.instrumentId);\n        const standard = STANDARD_INSTRUMENT_ANCHORS[metadata.instrumentId];\n        if (point && root) {\n          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n          this.activeInstrumentDrag = metadata.instrumentId;\n          this.instrumentDragPointerId = event.pointerId;\n          this.instrumentDragOffset = anchor.subtract(point);\n          this.camera.detachControl();\n          this.canvas.setPointerCapture?.(event.pointerId);\n          this.canvas.style.cursor = 'grabbing';\n          event.preventDefault();\n          return;\n        }\n      }",
    "      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentId && this.placedInstruments.has(metadata.instrumentId)) {\n        const event = pointerInfo.event as PointerEvent;\n        const root = this.instrumentRoots.get(metadata.instrumentId);\n        const standard = STANDARD_INSTRUMENT_ANCHORS[metadata.instrumentId];\n        if (!root) return;\n\n        const rotateRequested = event.button === 2 || event.shiftKey || event.altKey;\n        if (rotateRequested) {\n          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n          const center = this.worldToClient(anchor);\n          this.activeInstrumentRotate = metadata.instrumentId;\n          this.instrumentRotatePointerId = event.pointerId;\n          this.instrumentRotateCenterX = center.x;\n          this.instrumentRotateCenterY = center.y;\n          this.instrumentRotateLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);\n          this.camera.detachControl();\n          this.canvas.setPointerCapture?.(event.pointerId);\n          this.canvas.style.cursor = 'grabbing';\n          event.preventDefault();\n          return;\n        }\n\n        const point = this.pickBenchAtClient(event.clientX, event.clientY);\n        if (point) {\n          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n          this.activeInstrumentDrag = metadata.instrumentId;\n          this.instrumentDragPointerId = event.pointerId;\n          this.instrumentDragOffset = anchor.subtract(point);\n          this.camera.detachControl();\n          this.canvas.setPointerCapture?.(event.pointerId);\n          this.canvas.style.cursor = 'grabbing';\n          event.preventDefault();\n          return;\n        }\n      }",
    'instrument pointerdown',
  );
  s = replaceOrThrow(
    s,
    "      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentDrag) {",
    "      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentRotate) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.instrumentRotatePointerId !== null && event.pointerId !== this.instrumentRotatePointerId) return;\n        const dx = event.clientX - this.instrumentRotateCenterX;\n        const dy = event.clientY - this.instrumentRotateCenterY;\n        if (Math.hypot(dx, dy) < 12) return;\n        const angle = Math.atan2(dy, dx);\n        const delta = normalizeAngleDelta(angle - this.instrumentRotateLastAngle);\n        this.instrumentRotateLastAngle = angle;\n        this.rotateInstrument(this.activeInstrumentRotate, delta);\n        event.preventDefault();\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeInstrumentRotate) {\n        const event = pointerInfo.event as PointerEvent;\n        if (this.instrumentRotatePointerId === null || event.pointerId === this.instrumentRotatePointerId) {\n          this.finishInstrumentRotate(event.pointerId);\n          event.preventDefault();\n        }\n        return;\n      }\n\n      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentDrag) {",
    'rotation move/up insert',
  );
  s = replaceOrThrow(
    s,
    "  private moveInstrument(id: InstrumentId, requested: Vector3): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const anchor = clampInstrumentAnchor(id, requested);",
    "  private moveInstrument(id: InstrumentId, requested: Vector3): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const anchor = clampInstrumentAnchor(id, requested, root.rotation.y);",
    'rotation-aware move clamp',
  );
  s = replaceOrThrow(
    s,
    "  private placeAtStandard(id: InstrumentId): void {\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));\n  }",
    "  private rotateInstrument(id: InstrumentId, delta: number): void {\n    const root = this.instrumentRoots.get(id);\n    if (!root) return;\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const currentAnchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n    root.rotation.y = normalizeInstrumentRotation(root.rotation.y + delta);\n    const clamped = clampInstrumentAnchor(id, currentAnchor, root.rotation.y);\n    root.position.x = clamped.x - standard.x;\n    root.position.z = clamped.z - standard.z;\n    this.refreshCableColliders();\n  }\n\n  private placeAtStandard(id: InstrumentId): void {\n    const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n    const root = this.instrumentRoots.get(id);\n    if (root) root.rotation.y = 0;\n    this.moveInstrument(id, new Vector3(standard.x, 0, standard.z));\n  }",
    'rotate method',
  );
  s = replaceOrThrow(
    s,
    "  private readonly handleClearBench = (): void => {\n    this.finishInstrumentDrag();",
    "  private readonly handleClearBench = (): void => {\n    this.finishInstrumentDrag();\n    this.finishInstrumentRotate();",
    'clear rotate',
  );
  s = replaceOrThrow(
    s,
    "  private finishInstrumentDrag(pointerId?: number): void {\n    this.activeInstrumentDrag = null;\n    this.instrumentDragPointerId = null;\n    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {\n      this.canvas.releasePointerCapture?.(pointerId);\n    }\n    this.camera.attachControl(this.canvas, true, true);\n  }",
    "  private finishInstrumentDrag(pointerId?: number): void {\n    this.activeInstrumentDrag = null;\n    this.instrumentDragPointerId = null;\n    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {\n      this.canvas.releasePointerCapture?.(pointerId);\n    }\n    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private finishInstrumentRotate(pointerId?: number): void {\n    this.activeInstrumentRotate = null;\n    this.instrumentRotatePointerId = null;\n    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {\n      this.canvas.releasePointerCapture?.(pointerId);\n    }\n    this.camera.attachControl(this.canvas, true, true);\n  }\n\n  private readonly handleContextMenu = (event: MouseEvent): void => {\n    event.preventDefault();\n  };",
    'finish rotate/context',
  );
  s = replaceOrThrow(
    s,
    "      const offset = this.instrumentRoots.get(id)?.position ?? Vector3.Zero();\n      colliders.push({ min: base[id].min.add(offset), max: base[id].max.add(offset) });",
    "      const root = this.instrumentRoots.get(id);\n      if (!root) continue;\n      const standard = STANDARD_INSTRUMENT_ANCHORS[id];\n      const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);\n      const source = base[id];\n      const centerX = (source.min.x + source.max.x) * 0.5;\n      const centerZ = (source.min.z + source.max.z) * 0.5;\n      const halfX = (source.max.x - source.min.x) * 0.5;\n      const halfZ = (source.max.z - source.min.z) * 0.5;\n      const localCenterX = centerX - standard.x;\n      const localCenterZ = centerZ - standard.z;\n      const c = Math.cos(root.rotation.y);\n      const sn = Math.sin(root.rotation.y);\n      const rotatedCenterX = anchor.x + localCenterX * c + localCenterZ * sn;\n      const rotatedCenterZ = anchor.z - localCenterX * sn + localCenterZ * c;\n      const rotatedHalfX = Math.abs(c) * halfX + Math.abs(sn) * halfZ;\n      const rotatedHalfZ = Math.abs(sn) * halfX + Math.abs(c) * halfZ;\n      colliders.push({\n        min: new Vector3(rotatedCenterX - rotatedHalfX, source.min.y, rotatedCenterZ - rotatedHalfZ),\n        max: new Vector3(rotatedCenterX + rotatedHalfX, source.max.y, rotatedCenterZ + rotatedHalfZ),\n      });",
    'rotated cable colliders',
  );
  writeFileSync(path, s);
}

{
  const path = 'src/ui/renderApp.ts';
  let s = readFileSync(path, 'utf8');
  s = replaceOrThrow(
    s,
    `            <div class="equipment-tray" aria-label="Оборудование лаборатории">\n              <div class="equipment-tray-head"><span>ОБОРУДОВАНИЕ</span><small>перетащите на стол</small></div>\n              <button class="equipment-item" draggable="true" data-equipment="source"><b>Источник</b><small>0–12 В</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="resistor"><b>Резистор</b><small>0.5–20 Ω</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="ammeter"><b>Амперметр</b><small>0–5 А</small><em>⋮⋮</em></button>\n              <button class="equipment-item" draggable="true" data-equipment="voltmeter"><b>Вольтметр</b><small>0–12 В</small><em>⋮⋮</em></button>\n              <button id="clear-bench" class="equipment-clear" type="button">Очистить стол</button>\n            </div>\n            <div class="scene-hint" id="scene-hint">Перетащите приборы из меню на стол · За корпус: переставить · Drag по фону: камера · Клик по клемме: провод.</div>`,
    `            <div class="equipment-dock" id="equipment-dock" aria-label="Оборудование лаборатории">\n              <div class="equipment-dock-head">\n                <div><span>LAB GEAR</span><small>перетащите прибор на стол</small></div>\n                <button id="equipment-dock-toggle" class="equipment-dock-toggle" type="button" aria-expanded="true" title="Свернуть оборудование">⌃</button>\n              </div>\n              <div class="equipment-grid">\n                <button class="equipment-item" draggable="true" data-equipment="source" aria-label="Источник питания 0–12 В"><span class="equipment-icon">⎓</span><span class="equipment-copy"><b>Источник</b><small>0–12 В</small></span><span class="equipment-state">READY</span></button>\n                <button class="equipment-item" draggable="true" data-equipment="resistor" aria-label="Регулируемый резистор 0.5–20 Ом"><span class="equipment-icon">Ω</span><span class="equipment-copy"><b>Резистор</b><small>0.5–20 Ω</small></span><span class="equipment-state">READY</span></button>\n                <button class="equipment-item" draggable="true" data-equipment="ammeter" aria-label="Амперметр 0–5 А"><span class="equipment-icon">A</span><span class="equipment-copy"><b>Амперметр</b><small>0–5 A</small></span><span class="equipment-state">READY</span></button>\n                <button class="equipment-item" draggable="true" data-equipment="voltmeter" aria-label="Вольтметр 0–12 В"><span class="equipment-icon">V</span><span class="equipment-copy"><b>Вольтметр</b><small>0–12 V</small></span><span class="equipment-state">READY</span></button>\n              </div>\n              <div class="equipment-dock-foot"><span>ЛКМ: двигать</span><span>ПКМ / Shift: крутить</span><button id="clear-bench" class="equipment-clear" type="button">Очистить</button></div>\n            </div>\n            <div class="scene-hint" id="scene-hint">Из дока → на стол · ЛКМ за корпус: переставить · ПКМ или Shift + drag: повернуть · Drag по фону: камера · Клемма: провод.</div>`,
    'equipment dock markup',
  );
  s = replaceOrThrow(
    s,
    "  const clearBench = root.querySelector<HTMLButtonElement>('#clear-bench');",
    "  const clearBench = root.querySelector<HTMLButtonElement>('#clear-bench');\n  const equipmentDock = root.querySelector<HTMLElement>('#equipment-dock');\n  const equipmentDockToggle = root.querySelector<HTMLButtonElement>('#equipment-dock-toggle');",
    'dock queries',
  );
  s = replaceOrThrow(
    s,
    "  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearBench || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {",
    "  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearBench || !equipmentDock || !equipmentDockToggle || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {",
    'dock validation',
  );
  s = replaceOrThrow(
    s,
    "  const equipmentType = 'application/x-physics-instrument';",
    "  equipmentDockToggle.addEventListener('click', () => {\n    const collapsed = equipmentDock.classList.toggle('collapsed');\n    equipmentDockToggle.textContent = collapsed ? '⌄' : '⌃';\n    equipmentDockToggle.setAttribute('aria-expanded', String(!collapsed));\n    equipmentDockToggle.title = collapsed ? 'Развернуть оборудование' : 'Свернуть оборудование';\n  });\n\n  const equipmentType = 'application/x-physics-instrument';",
    'dock toggle behavior',
  );
  s = replaceOrThrow(
    s,
    "      item.classList.toggle('placed', active);\n      item.setAttribute('aria-pressed', String(active));",
    "      item.classList.toggle('placed', active);\n      item.setAttribute('aria-pressed', String(active));\n      const equipmentState = item.querySelector<HTMLElement>('.equipment-state');\n      if (equipmentState) equipmentState.textContent = active ? 'ON BENCH' : 'READY';",
    'dock presence state',
  );
  s = replaceOrThrow(
    s,
    "      : 'Drag: вращать камеру · Колесо: приблизить/отдалить · Ctrl + drag: сдвиг · Клик по клемме: провод.';",
    "      : 'ЛКМ за корпус: переставить · ПКМ или Shift + drag: повернуть · Drag по фону: камера · Колесо: масштаб · Клемма: провод.';",
    'dynamic scene hint',
  );
  writeFileSync(path, s);
}

{
  const path = 'src/styles.css';
  let s = readFileSync(path, 'utf8');
  const start = s.indexOf('.equipment-tray {');
  const marker = '#lab-canvas.equipment-drop-active';
  const markerStart = s.indexOf(marker, start);
  if (start < 0 || markerStart < 0) throw new Error('Missing equipment CSS block');
  const markerEnd = s.indexOf('\n', markerStart);
  const replacement = `.equipment-dock {\n  position: absolute;\n  top: 14px;\n  left: 14px;\n  z-index: 4;\n  width: 238px;\n  padding: 10px;\n  border: 1px solid rgba(84, 214, 244, .26);\n  border-radius: 14px;\n  background: linear-gradient(145deg, rgba(13, 23, 29, .94), rgba(6, 11, 15, .88));\n  backdrop-filter: blur(18px) saturate(1.15);\n  box-shadow: 0 18px 42px rgba(0, 0, 0, .34), inset 0 1px 0 rgba(255,255,255,.035);\n  transition: width .2s ease, background .2s ease;\n}\n.equipment-dock::before { content: ''; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background: linear-gradient(90deg, rgba(84,217,244,.08), transparent 42%); }\n.equipment-dock-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 2px 2px 9px; }\n.equipment-dock-head div { display: grid; gap: 2px; min-width: 0; }\n.equipment-dock-head span { color: #75e7ff; font: 800 10px ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .14em; }\n.equipment-dock-head small { color: #687985; font-size: 10px; white-space: nowrap; }\n.equipment-dock-toggle { position: relative; z-index: 1; width: 28px; height: 28px; flex: 0 0 auto; border: 1px solid #2a4653; border-radius: 8px; background: rgba(13,24,30,.86); color: #8ddff0; cursor: pointer; font-size: 15px; }\n.equipment-dock-toggle:hover { border-color: #4a879c; color: #d5f8ff; }\n.equipment-grid { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }\n.equipment-item { position: relative; min-width: 0; min-height: 88px; padding: 10px 8px 8px; display: grid; grid-template-rows: 34px auto 12px; align-content: start; justify-items: start; gap: 5px; text-align: left; border: 1px solid #273842; border-radius: 11px; background: linear-gradient(160deg, rgba(20,32,39,.94), rgba(10,17,22,.92)); color: #dce8ed; cursor: grab; overflow: hidden; transition: transform .14s ease, border-color .14s ease, background .14s ease, box-shadow .14s ease; }\n.equipment-item::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(circle at 18% 0%, rgba(90,224,255,.11), transparent 48%); }\n.equipment-item:hover { transform: translateY(-2px); border-color: #427f93; background: linear-gradient(160deg, rgba(19,42,51,.96), rgba(10,20,25,.94)); box-shadow: 0 8px 18px rgba(0,0,0,.24); }\n.equipment-item.dragging { opacity: .55; transform: scale(.97); cursor: grabbing; }\n.equipment-item.placed { border-color: rgba(74, 190, 121, .62); box-shadow: inset 0 0 0 1px rgba(67,195,116,.08); }\n.equipment-icon { position: relative; z-index: 1; width: 34px; height: 34px; display: grid; place-items: center; border: 1px solid #356273; border-radius: 9px; background: rgba(8, 22, 29, .85); color: #86e9ff; font: 800 18px/1 ui-monospace, monospace; text-shadow: 0 0 13px rgba(84,217,244,.25); }\n.equipment-copy { position: relative; z-index: 1; display: grid; gap: 2px; min-width: 0; }\n.equipment-copy b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 680; }\n.equipment-copy small { color: #71828d; font: 8.5px ui-monospace, monospace; }\n.equipment-state { position: relative; z-index: 1; color: #57717e; font: 700 7px ui-monospace, monospace; letter-spacing: .08em; }\n.equipment-item.placed .equipment-state { color: #6ddd9a; }\n.equipment-dock-foot { position: relative; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; margin-top: 9px; padding-top: 8px; border-top: 1px solid rgba(75,101,115,.22); color: #647681; font: 8px/1.35 ui-monospace, monospace; }\n.equipment-clear { grid-column: 1 / -1; min-height: 28px; margin-top: 3px; border: 1px solid #2c3d47; border-radius: 8px; background: rgba(8,14,18,.48); color: #7f919d; cursor: pointer; font-size: 9px; }\n.equipment-clear:hover { color: #c7d3d9; border-color: #485e69; }\n.equipment-dock.collapsed { width: 48px; padding: 8px; }\n.equipment-dock.collapsed .equipment-dock-head { padding: 0; }\n.equipment-dock.collapsed .equipment-dock-head div, .equipment-dock.collapsed .equipment-grid, .equipment-dock.collapsed .equipment-dock-foot { display: none; }\n.equipment-dock.collapsed .equipment-dock-toggle { width: 32px; height: 32px; margin: 0 auto; }\n#lab-canvas.equipment-drop-active { outline: 2px solid rgba(84, 217, 244, .65); outline-offset: -3px; }`;
  s = s.slice(0, start) + replacement + s.slice(markerEnd);
  writeFileSync(path, s);
}
