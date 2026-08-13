import {
  ArcRotateCamera,
  Color3,
  Color4,
  CubeTexture,
  Curve3,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  HemisphericLight,
  LinesMesh,
  Matrix,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { SimulationRuntime, SimulationState } from '../../core/simulation';
import {
  connectionId,
  terminalId,
  type Connection,
  type ConnectionId,
  type TerminalId,
} from '../../core/types';
import { ids } from '../../experiments/ohms-law/createOhmsLaw';
import { createInstrumentTheme, type InstrumentTheme } from './InstrumentTheme';
import { installOhmGlbShells } from './GlbInstrumentShells';
import { clampInstrumentAnchor, instrumentFromNodeName, normalizeInstrumentRotation, smoothInstrumentRotation, STANDARD_INSTRUMENT_ANCHORS, type InstrumentId } from './InstrumentPlacement';
import { PhysicalCable, PhysicalCableSystem, type CableCollider } from './PhysicalCable';
import { clampRotaryTravel, normalizeAngleDelta, rotaryTravelToValue } from './RotaryControl';
import {
  AnalogMeterVisual,
  PowerSupplyVisual,
  ResistorModuleVisual,
  type TerminalPolarity,
} from './ProfessionalInstruments';

interface TerminalVisual {
  readonly mesh: Mesh;
  readonly material: StandardMaterial;
  readonly ring: Mesh;
}

interface WireVisual {
  readonly cable: PhysicalCable;
  readonly plugs: readonly Mesh[];
  readonly plugFrom: readonly Mesh[];
  readonly plugTo: readonly Mesh[];
  readonly from: TerminalId;
  readonly to: TerminalId;
  readonly material: PBRMaterial;
  readonly baseColor: Color3;
  revealProgress: number;
}

type LooseWireEnd = 'start' | 'end';

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

export class LabScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private camera!: ArcRotateCamera;
  private readonly theme: InstrumentTheme;
  private readonly terminalMeshes = new Map<string, TerminalVisual>();
  private readonly connectionMeshes = new Map<string, WireVisual>();
  private readonly looseWires = new Map<string, LooseWireVisual>();
  private readonly connectionColorOverrides = new Map<ConnectionId, Color3>();
  private looseWireCounter = 0;
  private activeLooseWire: { id: string; end: LooseWireEnd } | null = null;
  private looseWirePointerId: number | null = null;
  private looseWireCandidateTerminal: TerminalId | null = null;
  private cablePhysics!: PhysicalCableSystem;
  private bench: Mesh | null = null;
  private previewWire: LinesMesh | null = null;
  private hoveredTerminal: TerminalId | null = null;
  private selectedConnection: ConnectionId | null = null;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private activeControl: 'source-voltage' | 'resistor-resistance' | null = null;
  private controlPointerId: number | null = null;
  private controlCenterX = 0;
  private controlCenterY = 0;
  private controlLastAngle = 0;
  private controlTravel = 0;
  private controlStartVoltage = 0;
  private controlStartResistance = 3;
  private readonly instrumentRoots = new Map<InstrumentId, TransformNode>();
  private readonly placedInstruments = new Set<InstrumentId>();
  private activeInstrumentDrag: InstrumentId | null = null;
  private instrumentDragPointerId: number | null = null;
  private instrumentDragOffset = Vector3.Zero();
  private activeInstrumentRotate: InstrumentId | null = null;
  private instrumentRotatePointerId: number | null = null;
  private instrumentRotateCenterX = 0;
  private instrumentRotateCenterY = 0;
  private instrumentRotateLastAngle = 0;
  private readonly instrumentRotationTargets = new Map<InstrumentId, number>();
  private readonly instrumentEntrances = new Map<InstrumentId, { elapsed: number; duration: number }>();
  private interactionLocked = false;

  private source!: PowerSupplyVisual;
  private resistor!: ResistorModuleVisual;
  private ammeter!: AnalogMeterVisual;
  private voltmeter!: AnalogMeterVisual;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly runtime: SimulationRuntime,
  ) {
    this.canvas.tabIndex = 0;
    this.engine = new Engine(canvas, true, {
      antialias: true,
      preserveDrawingBuffer: false,
      stencil: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.018, 0.025, 0.03, 1);
    this.scene.ambientColor = new Color3(0.035, 0.04, 0.045);
    this.scene.imageProcessingConfiguration.contrast = 1.1;
    this.scene.imageProcessingConfiguration.exposure = 1.08;
    this.theme = createInstrumentTheme(this.scene);
    this.scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
      `${import.meta.env.BASE_URL}models/ohm/studio.env`,
      this.scene,
    );

    this.buildScene();
    this.bindInteractions();
    this.unsubscribe = runtime.subscribe((state) => this.applyState(state));

    this.engine.runRenderLoop(() => {
      const dt = Math.min(0.05, this.engine.getDeltaTime() / 1000);
      this.source.tick(dt);
      this.resistor.tick(dt);
      this.ammeter.tick(dt);
      this.voltmeter.tick(dt);
      this.updateInstrumentMotion(dt);
      this.updateWireReveals(dt);
      this.syncMovingConnections();
      this.syncLooseWires();
      this.cablePhysics.step(dt);
      this.scene.render();
    });
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.resizeObserver.observe(canvas);
    this.canvas.addEventListener('keydown', this.handleKeyDown);
    this.canvas.addEventListener('wheel', this.handleControlWheel, { passive: false });
    this.canvas.addEventListener('lab:place-instrument', this.handlePlaceInstrumentEvent as EventListener);
    this.canvas.addEventListener('lab:arrange-standard', this.handleArrangeStandard as EventListener);
    this.canvas.addEventListener('lab:clear-bench', this.handleClearBench as EventListener);
    this.canvas.addEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);
    this.canvas.addEventListener('contextmenu', this.handleContextMenu);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.canvas.removeEventListener('wheel', this.handleControlWheel);
    this.canvas.removeEventListener('lab:place-instrument', this.handlePlaceInstrumentEvent as EventListener);
    this.canvas.removeEventListener('lab:arrange-standard', this.handleArrangeStandard as EventListener);
    this.canvas.removeEventListener('lab:clear-bench', this.handleClearBench as EventListener);
    this.canvas.removeEventListener('lab:set-interaction-lock', this.handleInteractionLock as EventListener);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.previewWire?.dispose();
    for (const loose of this.looseWires.values()) {
      for (const mesh of [...loose.plugStart, ...loose.plugEnd]) mesh.dispose();
      loose.material.dispose();
    }
    this.looseWires.clear();
    this.cablePhysics.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  private buildScene(): void {
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      1.16,
      11.05,
      new Vector3(0.05, 0.68, 0.48),
      this.scene,
    );
    this.camera.fov = 0.66;

    // Interactive orbit camera for the laboratory bench. The limits keep the
    // learner above the table and in front of the studio backdrop, while still
    // allowing a wide inspection angle around every instrument.
    this.camera.lowerRadiusLimit = 5.4;
    this.camera.upperRadiusLimit = 16.5;
    this.camera.lowerBetaLimit = 0.46;
    this.camera.upperBetaLimit = 1.48;
    this.camera.lowerAlphaLimit = -Math.PI + 0.16;
    this.camera.upperAlphaLimit = -0.16;
    this.camera.wheelPrecision = 48;
    this.camera.pinchPrecision = 90;
    this.camera.inertia = 0.9;
    this.camera.panningSensibility = 95;
    this.camera.attachControl(this.canvas, true, true);
    this.canvas.style.cursor = 'default';

    const pipeline = new DefaultRenderingPipeline('ohm-render-pipeline', true, this.scene, [this.camera]);
    pipeline.fxaaEnabled = true;
    pipeline.samples = 2;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.96;
    pipeline.bloomWeight = 0.055;
    pipeline.bloomKernel = 48;
    pipeline.bloomScale = 0.5;

    const hemi = new HemisphericLight(
      'ambient-lab-light',
      new Vector3(-0.1, 1, -0.16),
      this.scene,
    );
    hemi.intensity = 0.34;
    hemi.diffuse = new Color3(0.88, 0.92, 0.95);
    hemi.groundColor = new Color3(0.11, 0.12, 0.13);

    const key = new DirectionalLight(
      'softbox-key',
      new Vector3(0.34, -1, 0.42),
      this.scene,
    );
    key.position = new Vector3(-4.8, 7.2, -5.4);
    key.intensity = 1.48;
    key.diffuse = new Color3(1.0, 0.91, 0.8);

    const fill = new PointLight(
      'softbox-fill',
      new Vector3(4.4, 3.8, -3.6),
      this.scene,
    );
    fill.intensity = 7.8;
    fill.diffuse = new Color3(0.67, 0.82, 0.95);

    const frontFill = new PointLight(
      'front-soft-fill',
      new Vector3(-0.4, 2.2, -5.1),
      this.scene,
    );
    frontFill.intensity = 5.8;
    frontFill.diffuse = new Color3(0.94, 0.95, 0.94);

    const rim = new PointLight(
      'back-rim',
      new Vector3(-0.8, 4.8, 3.15),
      this.scene,
    );
    rim.intensity = 6.6;
    rim.diffuse = new Color3(0.5, 0.7, 0.86);

    const shadow = new ShadowGenerator(2048, key);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = 34;
    shadow.bias = 0.00065;
    shadow.normalBias = 0.024;
    shadow.darkness = 0.28;

    const backdrop = MeshBuilder.CreateBox(
      'studio-backdrop',
      { width: 30, height: 12, depth: 0.2 },
      this.scene,
    );
    backdrop.position = new Vector3(0, 4.8, 6.3);
    backdrop.material = this.theme.backdrop;
    backdrop.receiveShadows = true;
    backdrop.isPickable = false;

    const wallRail = MeshBuilder.CreateBox(
      'wall-rail',
      { width: 11.6, height: 0.055, depth: 0.055 },
      this.scene,
    );
    wallRail.position = new Vector3(0, 1.22, 3.55);
    wallRail.material = this.theme.darkMetal;
    wallRail.isPickable = false;
    wallRail.setEnabled(false);

    const ground = MeshBuilder.CreateGround(
      'bench-pick-surface',
      { width: 11.55, height: 5.85 },
      this.scene,
    );
    ground.position.y = 0.005;
    ground.material = this.theme.bench;
    ground.receiveShadows = true;
    this.bench = ground;

    const benchSlab = MeshBuilder.CreateBox(
      'bench-slab',
      { width: 11.72, height: 0.2, depth: 6.02 },
      this.scene,
    );
    benchSlab.position.y = -0.105;
    benchSlab.material = this.theme.bench;
    benchSlab.receiveShadows = true;
    benchSlab.isPickable = false;

    const mat = MeshBuilder.CreateBox(
      'bench-mat',
      { width: 9.9, height: 0.028, depth: 4.6 },
      this.scene,
    );
    mat.position = new Vector3(0, 0.027, 0.48);
    mat.material = this.theme.benchMat;
    mat.receiveShadows = true;
    mat.isPickable = false;

    const frontLip = MeshBuilder.CreateBox(
      'bench-front-lip',
      { width: 11.82, height: 0.18, depth: 0.13 },
      this.scene,
    );
    frontLip.position = new Vector3(0, -0.08, -2.94);
    frontLip.material = this.theme.darkMetal;
    frontLip.isPickable = false;

    const backRail = MeshBuilder.CreateBox(
      'bench-back-rail',
      { width: 11.7, height: 0.16, depth: 0.12 },
      this.scene,
    );
    backRail.position = new Vector3(0, 0.1, 3.0);
    backRail.material = this.theme.darkMetal;
    backRail.isPickable = false;

    const registerTerminal = (
      id: TerminalId,
      position: Vector3,
      polarity: TerminalPolarity,
    ): Mesh => this.createTerminal(id, position, polarity);

    this.source = new PowerSupplyVisual(
      this.scene,
      this.theme,
      new Vector3(-3.35, 0, 1.45),
      ids.sourcePlus,
      ids.sourceMinus,
      registerTerminal,
    );

    this.resistor = new ResistorModuleVisual(
      this.scene,
      this.theme,
      new Vector3(-0.7, 0, -0.75),
      ids.resistorA,
      ids.resistorB,
      registerTerminal,
    );

    this.ammeter = new AnalogMeterVisual(
      this.scene,
      this.theme,
      {
        id: 'ammeter',
        label: 'ammeter',
        unit: 'A',
        max: 5,
        decimals: 2,
        position: new Vector3(3.55, 0, -0.35),
        plus: ids.ammeterPlus,
        minus: ids.ammeterMinus,
      },
      registerTerminal,
    );

    this.voltmeter = new AnalogMeterVisual(
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

    this.setupInstrumentRoots();

    // Collision boxes are rebuilt from the placed instrument roots so cables
    // keep respecting faces even after a learner rearranges the apparatus.
    this.cablePhysics = new PhysicalCableSystem([], 0.045);
    this.refreshCableColliders();

    for (const mesh of this.scene.meshes) {
      if (
        mesh === ground
        || mesh === backdrop
        || mesh.name.includes('glass')
        || mesh.name.includes('display')
        || mesh.name.includes('dial-face')
      ) continue;
      shadow.addShadowCaster(mesh, true);
    }

    installOhmGlbShells(
      this.scene,
      shadow,
      (instrumentId) => this.instrumentRoots.get(instrumentId as InstrumentId),
    );
    this.emitInstrumentPresence();
  }

  private setupInstrumentRoots(): void {
    const ids: readonly InstrumentId[] = ['source', 'resistor', 'ammeter', 'voltmeter'];
    for (const id of ids) {
      const root = new TransformNode(`instrument-root:${id}`, this.scene);
      const standard = STANDARD_INSTRUMENT_ANCHORS[id];
      root.setPivotPoint(new Vector3(standard.x, 0, standard.z));
      this.instrumentRoots.set(id, root);
      this.instrumentRotationTargets.set(id, 0);
    }

    for (const node of [...this.scene.transformNodes]) {
      if (node.name.startsWith('instrument-root:') || node.parent) continue;
      const instrument = instrumentFromNodeName(node.name);
      if (instrument) node.parent = this.instrumentRoots.get(instrument) ?? null;
    }

    for (const mesh of this.scene.meshes) {
      const instrument = instrumentFromNodeName(mesh.name);
      if (!instrument) continue;
      if (!mesh.parent) mesh.parent = this.instrumentRoots.get(instrument) ?? null;
      const metadata = (mesh.metadata ?? {}) as PickMetadata;
      if (!metadata.instrumentControl && !metadata.terminalId && !metadata.connectionId) {
        mesh.metadata = { ...metadata, instrumentId: instrument } satisfies PickMetadata;
        mesh.isPickable = true;
      }
    }

    // Manual mode starts as a real construction task: an empty bench.
    for (const root of this.instrumentRoots.values()) root.setEnabled(false);
  }

  private createTerminal(
    id: TerminalId,
    position: Vector3,
    polarity: TerminalPolarity,
  ): Mesh {
    const metalBase = MeshBuilder.CreateCylinder(
      `terminal-base:${id}`,
      { height: 0.15, diameter: 0.35, tessellation: 40 },
      this.scene,
    );
    metalBase.position = position.add(new Vector3(0, 0, 0.07));
    metalBase.rotation.x = Math.PI / 2;
    metalBase.material = this.theme.metal;
    metalBase.isPickable = false;

    const ring = MeshBuilder.CreateTorus(
      `terminal-ring:${id}`,
      { diameter: 0.34, thickness: 0.045, tessellation: 44 },
      this.scene,
    );
    ring.position = position.add(new Vector3(0, 0, -0.025));
    ring.rotation.x = Math.PI / 2;
    ring.material = this.theme.metal;
    ring.isPickable = false;

    const cap = MeshBuilder.CreateCylinder(
      `terminal:${id}`,
      { height: 0.18, diameter: 0.265, tessellation: 40 },
      this.scene,
    );
    cap.position = position.add(new Vector3(0, 0, -0.09));
    cap.rotation.x = Math.PI / 2;

    const baseColor = polarity === 'positive'
      ? new Color3(0.76, 0.028, 0.04)
      : polarity === 'negative'
        ? new Color3(0.028, 0.032, 0.036)
        : new Color3(0.31, 0.34, 0.36);
    const material = new StandardMaterial(`terminal-material:${id}`, this.scene);
    material.diffuseColor = baseColor;
    material.specularColor = new Color3(0.55, 0.55, 0.55);
    cap.material = material;
    cap.isPickable = true;
    cap.metadata = { terminalId: id } satisfies PickMetadata;

    const contact = MeshBuilder.CreateCylinder(
      `terminal-contact:${id}`,
      { height: 0.05, diameter: 0.115, tessellation: 30 },
      this.scene,
    );
    contact.position = position.add(new Vector3(0, 0, -0.215));
    contact.rotation.x = Math.PI / 2;
    contact.material = this.theme.metal;
    contact.isPickable = false;

    this.terminalMeshes.set(id, { mesh: cap, material, ring });
    return cap;
  }

  private bindInteractions(): void {
    this.scene.onPointerObservable.add((pointerInfo) => {
      if (this.interactionLocked) return;
      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;

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
        const event = pointerInfo.event as PointerEvent;
        const resistorControl = metadata.instrumentControl === 'resistor-resistance';
        const center = this.worldToClient(
          resistorControl
            ? this.resistor.getResistanceKnobWorldPosition()
            : this.source.getVoltageKnobWorldPosition(),
        );
        this.activeControl = metadata.instrumentControl;
        this.controlPointerId = event.pointerId;
        this.controlCenterX = center.x;
        this.controlCenterY = center.y;
        this.controlLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
        this.controlTravel = 0;
        if (resistorControl) this.controlStartResistance = this.currentResistance();
        else this.controlStartVoltage = this.currentSourceVoltage();
        this.canvas.style.cursor = 'grabbing';
        this.camera.detachControl();
        this.canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERDOWN && metadata?.instrumentId && this.placedInstruments.has(metadata.instrumentId)) {
        const event = pointerInfo.event as PointerEvent;
        const root = this.instrumentRoots.get(metadata.instrumentId);
        const standard = STANDARD_INSTRUMENT_ANCHORS[metadata.instrumentId];
        if (!root) return;

        const rotateRequested = event.button === 2 || event.shiftKey || event.altKey;
        if (rotateRequested) {
          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);
          const center = this.worldToClient(anchor);
          this.activeInstrumentRotate = metadata.instrumentId;
          this.instrumentRotatePointerId = event.pointerId;
          this.instrumentRotateCenterX = center.x;
          this.instrumentRotateCenterY = center.y;
          this.instrumentRotateLastAngle = Math.atan2(event.clientY - center.y, event.clientX - center.x);
          this.camera.detachControl();
          this.canvas.setPointerCapture?.(event.pointerId);
          this.canvas.style.cursor = 'grabbing';
          event.preventDefault();
          return;
        }

        const point = this.pickBenchAtClient(event.clientX, event.clientY);
        if (point) {
          const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);
          this.activeInstrumentDrag = metadata.instrumentId;
          this.instrumentDragPointerId = event.pointerId;
          this.instrumentDragOffset = anchor.subtract(point);
          this.camera.detachControl();
          this.canvas.setPointerCapture?.(event.pointerId);
          this.canvas.style.cursor = 'grabbing';
          event.preventDefault();
          return;
        }
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeLooseWire) {
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
        const event = pointerInfo.event as PointerEvent;
        if (this.instrumentRotatePointerId !== null && event.pointerId !== this.instrumentRotatePointerId) return;
        const dx = event.clientX - this.instrumentRotateCenterX;
        const dy = event.clientY - this.instrumentRotateCenterY;
        if (Math.hypot(dx, dy) < 12) return;
        const angle = Math.atan2(dy, dx);
        const delta = normalizeAngleDelta(angle - this.instrumentRotateLastAngle);
        this.instrumentRotateLastAngle = angle;
        this.rotateInstrument(this.activeInstrumentRotate, delta);
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeInstrumentRotate) {
        const event = pointerInfo.event as PointerEvent;
        if (this.instrumentRotatePointerId === null || event.pointerId === this.instrumentRotatePointerId) {
          this.finishInstrumentRotate(event.pointerId);
          event.preventDefault();
        }
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeInstrumentDrag) {
        const event = pointerInfo.event as PointerEvent;
        if (this.instrumentDragPointerId !== null && event.pointerId !== this.instrumentDragPointerId) return;
        const point = this.pickBenchAtClient(event.clientX, event.clientY);
        if (point) this.moveInstrument(this.activeInstrumentDrag, point.add(this.instrumentDragOffset));
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeInstrumentDrag) {
        const event = pointerInfo.event as PointerEvent;
        if (this.instrumentDragPointerId === null || event.pointerId === this.instrumentDragPointerId) {
          this.finishInstrumentDrag(event.pointerId);
          event.preventDefault();
        }
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE && this.activeControl) {
        const event = pointerInfo.event as PointerEvent;
        if (this.controlPointerId !== null && event.pointerId !== this.controlPointerId) return;
        const dx = event.clientX - this.controlCenterX;
        const dy = event.clientY - this.controlCenterY;
        if (Math.hypot(dx, dy) < 10) return;
        const angle = Math.atan2(dy, dx);
        const delta = normalizeAngleDelta(angle - this.controlLastAngle);
        this.controlLastAngle = angle;

        if (this.activeControl === 'source-voltage') {
          this.controlTravel = clampRotaryTravel(
            this.controlStartVoltage,
            this.controlTravel + delta,
            12,
          );
          const next = rotaryTravelToValue(this.controlStartVoltage, this.controlTravel, 12);
          this.runtime.setVoltage(Math.round(next * 20) / 20);
        } else {
          const mappedStart = this.controlStartResistance - 0.5;
          this.controlTravel = clampRotaryTravel(
            mappedStart,
            this.controlTravel + delta,
            19.5,
          );
          const next = 0.5 + rotaryTravelToValue(mappedStart, this.controlTravel, 19.5);
          this.runtime.setResistance(Math.round(next * 10) / 10);
        }
        event.preventDefault();
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERUP && this.activeControl) {
        const event = pointerInfo.event as PointerEvent;
        if (this.controlPointerId === null || event.pointerId === this.controlPointerId) {
          this.finishInstrumentControl(event.pointerId);
          event.preventDefault();
        }
        return;
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        this.handlePointerMove(metadata);
        return;
      }

      // POINTERTAP fires only when the pointer is released without a drag.
      // This keeps terminal/wire selection independent from camera orbiting.
      if (pointerInfo.type !== PointerEventTypes.POINTERTAP) return;
      this.canvas.focus({ preventScroll: true });

      if (metadata?.instrumentControl === 'source-output') {
        this.runtime.setSourceEnabled(!this.currentSourceEnabled());
        return;
      }

      if (metadata?.terminalId) {
        this.selectedConnection = null;
        this.runtime.chooseTerminal(terminalId(metadata.terminalId));
        this.refreshConnectionStyles();
        return;
      }

      if (metadata?.connectionId) {
        this.runtime.cancelTerminalSelection();
        this.selectedConnection = connectionId(metadata.connectionId);
        this.clearPreviewWire();
        this.refreshConnectionStyles();
        return;
      }

      this.selectedConnection = null;
      this.hoveredTerminal = null;
      this.runtime.cancelTerminalSelection();
      this.clearPreviewWire();
      this.refreshConnectionStyles();
    });
  }

  private handlePointerMove(metadata: PickMetadata | null): void {
    const selectedTerminal = this.runtime.getState().selectedTerminal;
    const nextHovered = metadata?.terminalId && metadata.terminalId !== selectedTerminal
      ? terminalId(metadata.terminalId)
      : null;
    this.hoveredTerminal = nextHovered;

    if (metadata?.looseWireId && metadata.looseWireEnd) this.canvas.style.cursor = 'grab';
    else if (metadata?.instrumentControl === 'source-voltage' || metadata?.instrumentControl === 'resistor-resistance') this.canvas.style.cursor = 'grab';
    else if (metadata?.instrumentId) this.canvas.style.cursor = 'move';
    else if (metadata?.instrumentControl === 'source-output') this.canvas.style.cursor = 'pointer';
    else if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';
    else if (metadata?.connectionId) this.canvas.style.cursor = 'pointer';
    else this.canvas.style.cursor = selectedTerminal ? 'crosshair' : 'default';

    this.refreshTerminals(selectedTerminal, this.hoveredTerminal);

    if (!selectedTerminal) {
      this.clearPreviewWire();
      return;
    }

    const from = this.terminalMeshes.get(selectedTerminal)?.mesh.getAbsolutePosition();
    if (!from) {
      this.clearPreviewWire();
      return;
    }

    const snapped = this.hoveredTerminal
      ? this.terminalMeshes.get(this.hoveredTerminal)?.mesh.getAbsolutePosition()
      : null;
    const groundPick = !snapped && this.bench
      ? this.scene.pick(this.scene.pointerX, this.scene.pointerY, (mesh) => mesh === this.bench)
      : null;
    const pointerPoint = snapped?.clone() ?? groundPick?.pickedPoint?.clone() ?? null;

    if (!pointerPoint) {
      this.clearPreviewWire();
      return;
    }

    if (!snapped) pointerPoint.y = Math.max(pointerPoint.y + 0.075, 0.075);
    this.updatePreviewWire(from, pointerPoint, Boolean(snapped));
  }

  private worldToClient(world: Vector3): { x: number; y: number } {
    const renderWidth = this.engine.getRenderWidth();
    const renderHeight = this.engine.getRenderHeight();
    const viewport = this.camera.viewport.toGlobal(renderWidth, renderHeight);
    const projected = Vector3.Project(
      world,
      Matrix.Identity(),
      this.scene.getTransformMatrix(),
      viewport,
    );
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left + (projected.x / renderWidth) * rect.width,
      y: rect.top + (projected.y / renderHeight) * rect.height,
    };
  }

  private pickBenchAtClient(clientX: number, clientY: number): Vector3 | null {
    if (!this.bench) return null;
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (this.engine.getRenderWidth() / Math.max(1, rect.width));
    const y = (clientY - rect.top) * (this.engine.getRenderHeight() / Math.max(1, rect.height));
    return this.scene.pick(x, y, (mesh) => mesh === this.bench)?.pickedPoint?.clone() ?? null;
  }

  private pickTerminalAtClient(clientX: number, clientY: number): TerminalId | null {
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
    const root = this.instrumentRoots.get(id);
    if (!root) return;
    const anchor = clampInstrumentAnchor(id, requested, root.rotation.y);
    const standard = STANDARD_INSTRUMENT_ANCHORS[id];
    root.position.x = anchor.x - standard.x;
    root.position.z = anchor.z - standard.z;
    root.position.y = 0;
    root.setEnabled(true);
    this.placedInstruments.add(id);
    this.refreshCableColliders();
    this.emitInstrumentPresence();
  }

  private rotateInstrument(id: InstrumentId, delta: number): void {
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
  }

  private readonly handlePlaceInstrumentEvent = (rawEvent: Event): void => {
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

  private readonly handleArrangeStandard = (): void => {
    for (const id of this.instrumentRoots.keys()) this.placeAtStandard(id);
  };

  private readonly handleClearBench = (): void => {
    this.finishInstrumentDrag();
    this.finishInstrumentRotate();
    for (const [id, root] of this.instrumentRoots) {
      root.setEnabled(false);
      root.position.y = 0;
      root.scaling.setAll(1);
      root.rotation.y = 0;
      this.instrumentRotationTargets.set(id, 0);
    }
    this.instrumentEntrances.clear();
    this.clearLooseWires();
    this.placedInstruments.clear();
    this.refreshCableColliders();
    this.clearPreviewWire();
    this.emitInstrumentPresence();
  };

  private finishInstrumentDrag(pointerId?: number): void {
    this.activeInstrumentDrag = null;
    this.instrumentDragPointerId = null;
    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture?.(pointerId);
    }
    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);
  }

  private finishInstrumentRotate(pointerId?: number): void {
    this.activeInstrumentRotate = null;
    this.instrumentRotatePointerId = null;
    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture?.(pointerId);
    }
    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);
  }

  private readonly handleContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private beginInstrumentEntrance(id: InstrumentId): void {
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

  private emitInstrumentPresence(): void {
    this.canvas.dispatchEvent(new CustomEvent('lab:instrument-presence', {
      detail: { placed: [...this.placedInstruments] },
    }));
  }

  private refreshCableColliders(): void {
    if (!this.cablePhysics) return;
    const base: Record<InstrumentId, CableCollider> = {
      source: { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },
      resistor: { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },
      ammeter: { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },
      voltmeter: { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },
    };
    const colliders: CableCollider[] = [];
    for (const id of this.placedInstruments) {
      const root = this.instrumentRoots.get(id);
      if (!root) continue;
      const standard = STANDARD_INSTRUMENT_ANCHORS[id];
      const anchor = new Vector3(standard.x + root.position.x, 0, standard.z + root.position.z);
      const source = base[id];
      const centerX = (source.min.x + source.max.x) * 0.5;
      const centerZ = (source.min.z + source.max.z) * 0.5;
      const halfX = (source.max.x - source.min.x) * 0.5;
      const halfZ = (source.max.z - source.min.z) * 0.5;
      const localCenterX = centerX - standard.x;
      const localCenterZ = centerZ - standard.z;
      const c = Math.cos(root.rotation.y);
      const sn = Math.sin(root.rotation.y);
      const rotatedCenterX = anchor.x + localCenterX * c + localCenterZ * sn;
      const rotatedCenterZ = anchor.z - localCenterX * sn + localCenterZ * c;
      const rotatedHalfX = Math.abs(c) * halfX + Math.abs(sn) * halfZ;
      const rotatedHalfZ = Math.abs(sn) * halfX + Math.abs(c) * halfZ;
      colliders.push({
        min: new Vector3(rotatedCenterX - rotatedHalfX, source.min.y, rotatedCenterZ - rotatedHalfZ),
        max: new Vector3(rotatedCenterX + rotatedHalfX, source.max.y, rotatedCenterZ + rotatedHalfZ),
      });
    }
    this.cablePhysics.setColliders(colliders);
  }

  private currentSourceVoltage(): number {
    const source = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'voltage-source');
    return source?.kind === 'voltage-source' ? source.voltage : 0;
  }

  private currentResistance(): number {
    const resistor = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'resistor');
    return resistor?.kind === 'resistor' ? resistor.resistance : 3;
  }

  private currentSourceEnabled(): boolean {
    const source = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'voltage-source');
    return source?.kind === 'voltage-source' ? source.enabled : false;
  }

  private finishInstrumentControl(pointerId?: number): void {
    this.activeControl = null;
    this.controlPointerId = null;
    this.controlTravel = 0;
    if (pointerId !== undefined && this.canvas.hasPointerCapture?.(pointerId)) {
      this.canvas.releasePointerCapture?.(pointerId);
    }
    if (!this.interactionLocked) this.camera.attachControl(this.canvas, true, true);
  }

  private readonly handleControlWheel = (event: WheelEvent): void => {
    if (this.interactionLocked) return;
    const pick = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
    const metadata = (pick?.pickedMesh?.metadata ?? null) as PickMetadata | null;
    const direction = event.deltaY < 0 ? 1 : -1;
    if (metadata?.instrumentControl === 'source-voltage') {
      this.runtime.setVoltage(this.currentSourceVoltage() + direction * 0.1);
      event.preventDefault();
      return;
    }
    if (metadata?.instrumentControl === 'resistor-resistance') {
      this.runtime.setResistance(this.currentResistance() + direction * 0.1);
      event.preventDefault();
    }
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.runtime.cancelTerminalSelection();
      this.selectedConnection = null;
      this.hoveredTerminal = null;
      this.clearPreviewWire();
      this.refreshConnectionStyles();
      event.preventDefault();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && this.selectedConnection) {
      const connection = this.selectedConnection;
      this.selectedConnection = null;
      this.runtime.removeConnection(connection);
      this.clearPreviewWire();
      event.preventDefault();
    }
  };

  private updatePreviewWire(from: Vector3, to: Vector3, snapped: boolean): void {
    const points = this.createWirePath(from, to, 0);
    if (!this.previewWire) {
      this.previewWire = MeshBuilder.CreateLines(
        'wire-preview',
        { points, updatable: true },
        this.scene,
      );
      this.previewWire.isPickable = false;
      this.previewWire.alpha = 0.86;
    } else {
      this.previewWire = MeshBuilder.CreateLines(
        'wire-preview',
        { points, instance: this.previewWire },
      );
    }
    this.previewWire.color = snapped
      ? new Color3(0.28, 0.82, 0.48)
      : new Color3(0.32, 0.72, 0.88);
  }

  private clearPreviewWire(): void {
    this.previewWire?.dispose();
    this.previewWire = null;
  }

  private wireLane(id: string): number {
    let hash = 0;
    for (let index = 0; index < id.length; index += 1) {
      hash = (hash * 31 + id.charCodeAt(index)) | 0;
    }
    return ((Math.abs(hash) % 5) - 2) * 0.22;
  }

  private createWirePath(from: Vector3, to: Vector3, lane: number): Vector3[] {
    const distance = Vector3.Distance(from, to);
    const tableY = 0.082;
    const leadOut = 0.34;
    const frontOffset = 0.46 + Math.min(0.72, distance * 0.08);
    const routeZ = Math.min(from.z, to.z) - frontOffset - Math.abs(lane) * 0.18;

    // Keep the socket visible: every cable leaves the terminal straight toward
    // the viewer before dropping to table height and turning into its route.
    const fromLead = from.add(new Vector3(0, 0, -leadOut));
    const fromDrop = new Vector3(fromLead.x, tableY, fromLead.z - 0.1);
    const toLead = to.add(new Vector3(0, 0, -leadOut));
    const toDrop = new Vector3(toLead.x, tableY, toLead.z - 0.1);

    const middleA = Vector3.Lerp(fromDrop, toDrop, 0.32);
    middleA.x += lane;
    middleA.y = tableY;
    middleA.z = Math.min(middleA.z, routeZ);
    const middleB = Vector3.Lerp(fromDrop, toDrop, 0.68);
    middleB.x -= lane * 0.45;
    middleB.y = tableY;
    middleB.z = Math.min(middleB.z, routeZ + 0.08);

    return Curve3.CreateCatmullRomSpline(
      [
        from.clone(),
        fromLead,
        fromDrop,
        middleA,
        middleB,
        toDrop,
        toLead,
        to.clone(),
      ],
      12,
      false,
    ).getPoints();
  }

  private applyState(state: SimulationState): void {
    const snapshot = this.runtime.circuit.snapshot();
    const source = snapshot.components.find((component) => component.id === ids.source);
    const resistor = snapshot.components.find((component) => component.id === ids.resistor);
    const sourceVoltage = source?.kind === 'voltage-source' ? source.voltage : 0;
    const sourceEnabled = source?.kind === 'voltage-source' ? source.enabled : false;
    const resistance = resistor?.kind === 'resistor' ? resistor.resistance : 0;
    const ammeterMeasurement = state.result.measurements[ids.ammeter];
    const voltmeterMeasurement = state.result.measurements[ids.voltmeter];
    const resistorMeasurement = state.result.measurements[ids.resistor];

    this.source.setVoltage(sourceVoltage);
    this.source.setOutputEnabled(sourceEnabled);
    this.source.setActive(
      sourceEnabled && state.result.status === 'closed',
      state.result.status === 'short-circuit' || Boolean(ammeterMeasurement?.overload),
    );
    this.resistor.setResistance(resistance);
    this.resistor.setPower(resistorMeasurement?.power ?? state.result.power ?? 0);
    this.ammeter.setValue(
      ammeterMeasurement?.current ?? 0,
      Boolean(ammeterMeasurement?.overload),
    );
    this.voltmeter.setValue(voltmeterMeasurement?.voltage ?? 0, false);

    this.refreshTerminals(state.selectedTerminal, this.hoveredTerminal);
    this.refreshConnections(snapshot.connections);

    if (!state.selectedTerminal) this.clearPreviewWire();
  }

  private refreshTerminals(selected: TerminalId | null, hovered: TerminalId | null): void {
    for (const [id, visual] of this.terminalMeshes) {
      const active = id === selected;
      const candidate = Boolean(selected) && id === hovered && id !== selected;
      visual.material.emissiveColor = active
        ? new Color3(0.08, 0.58, 0.78)
        : candidate
          ? new Color3(0.08, 0.48, 0.24)
          : Color3.Black();
      visual.mesh.scaling.setAll(active ? 1.16 : candidate ? 1.1 : 1);
      visual.ring.scaling.setAll(active ? 1.07 : candidate ? 1.04 : 1);
    }
  }

  private refreshConnections(connections: readonly Connection[]): void {
    const activeIds = new Set(connections.map((connection) => connection.id as string));
    for (const [id, visual] of this.connectionMeshes) {
      if (!activeIds.has(id)) {
        this.cablePhysics.remove(visual.cable);
        for (const mesh of visual.plugs) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
        this.connectionColorOverrides.delete(connectionId(id));
      }
    }

    if (this.selectedConnection && !activeIds.has(this.selectedConnection)) {
      this.selectedConnection = null;
    }

    for (const connection of connections) {
      if (this.connectionMeshes.has(connection.id)) continue;
      const from = this.terminalMeshes.get(connection.from)?.mesh.getAbsolutePosition();
      const to = this.terminalMeshes.get(connection.to)?.mesh.getAbsolutePosition();
      if (!from || !to) continue;

      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      const baseColor = this.connectionColorOverrides.get(connection.id)?.clone() ?? (red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018));
      const material = new PBRMaterial(`wire-material:${connection.id}`, this.scene);
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
          particleCount: 28,
          laneOffset: this.wireLane(connection.id),
          leadOut: 0.34,
          floorY: 0.045,
        },
      );
      cable.mesh.metadata = { connectionId: connection.id } satisfies PickMetadata;
      this.cablePhysics.add(cable);

      const plugFrom = this.createBananaPlug(
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

      cable.mesh.visibility = 0.02;
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
      });
    }

    this.refreshConnectionStyles();
  }

  private syncMovingConnections(): void {
    for (const visual of this.connectionMeshes.values()) {
      const from = this.terminalMeshes.get(visual.from)?.mesh.getAbsolutePosition();
      const to = this.terminalMeshes.get(visual.to)?.mesh.getAbsolutePosition();
      if (!from || !to) continue;
      visual.cable.updateAnchors(from, to);
      this.positionBananaPlug(visual.plugFrom, from);
      this.positionBananaPlug(visual.plugTo, to);
    }
  }

  private positionBananaPlug(meshes: readonly Mesh[], terminalPosition: Vector3): void {
    const sleeve = meshes[0];
    const collar = meshes[1];
    const strainRelief = meshes[2];
    if (sleeve) sleeve.position = terminalPosition.add(new Vector3(0, 0, -0.27));
    if (collar) collar.position = terminalPosition.add(new Vector3(0, 0, -0.155));
    if (strainRelief) strainRelief.position = terminalPosition.add(new Vector3(0, 0, -0.455));
  }

  private createBananaPlug(
    name: string,
    terminalPosition: Vector3,
    material: PBRMaterial,
    metadata: PickMetadata,
  ): Mesh[] {
    const sleeve = MeshBuilder.CreateCylinder(
      `${name}-sleeve`,
      { height: 0.24, diameterTop: 0.135, diameterBottom: 0.19, tessellation: 32 },
      this.scene,
    );
    sleeve.position = terminalPosition.add(new Vector3(0, 0, -0.27));
    sleeve.rotation.x = Math.PI / 2;
    sleeve.material = material;
    sleeve.isPickable = true;
    sleeve.metadata = metadata;

    const collar = MeshBuilder.CreateCylinder(
      `${name}-collar`,
      { height: 0.055, diameter: 0.165, tessellation: 30 },
      this.scene,
    );
    collar.position = terminalPosition.add(new Vector3(0, 0, -0.155));
    collar.rotation.x = Math.PI / 2;
    collar.material = this.theme.metal;
    collar.isPickable = false;

    const strainRelief = MeshBuilder.CreateCylinder(
      `${name}-strain-relief`,
      { height: 0.12, diameterTop: 0.105, diameterBottom: 0.155, tessellation: 30 },
      this.scene,
    );
    strainRelief.position = terminalPosition.add(new Vector3(0, 0, -0.455));
    strainRelief.rotation.x = Math.PI / 2;
    strainRelief.material = material;
    strainRelief.isPickable = true;
    strainRelief.metadata = metadata;

    return [sleeve, collar, strainRelief];
  }

  private refreshConnectionStyles(): void {
    for (const [id, visual] of this.connectionMeshes) {
      const selected = id === this.selectedConnection;
      visual.material.albedoColor = selected
        ? new Color3(0.11, 0.42, 0.55)
        : visual.baseColor;
      visual.material.emissiveColor = selected
        ? new Color3(0.025, 0.16, 0.22)
        : Color3.Black();
    }
  }
}
