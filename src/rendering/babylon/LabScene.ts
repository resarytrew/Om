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
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  PointerEventTypes,
  Scene,
  ShadowGenerator,
  StandardMaterial,
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
  readonly meshes: readonly Mesh[];
  readonly material: PBRMaterial;
  readonly baseColor: Color3;
}

interface PickMetadata {
  readonly terminalId?: string;
  readonly connectionId?: string;
}

export class LabScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly theme: InstrumentTheme;
  private readonly terminalMeshes = new Map<string, TerminalVisual>();
  private readonly connectionMeshes = new Map<string, WireVisual>();
  private bench: Mesh | null = null;
  private previewWire: LinesMesh | null = null;
  private hoveredTerminal: TerminalId | null = null;
  private selectedConnection: ConnectionId | null = null;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

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
      this.ammeter.tick(dt);
      this.voltmeter.tick(dt);
      this.scene.render();
    });
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.resizeObserver.observe(canvas);
    this.canvas.addEventListener('keydown', this.handleKeyDown);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.canvas.removeEventListener('keydown', this.handleKeyDown);
    this.previewWire?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  private buildScene(): void {
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      1.385,
      10.55,
      new Vector3(-0.08, 0.88, 0.66),
      this.scene,
    );
    camera.fov = 0.57;
    camera.lowerRadiusLimit = 10.1;
    camera.upperRadiusLimit = 11.1;
    camera.lowerBetaLimit = 1.34;
    camera.upperBetaLimit = 1.42;
    camera.lowerAlphaLimit = -1.67;
    camera.upperAlphaLimit = -1.47;
    camera.wheelPrecision = 180;
    camera.panningSensibility = 0;
    camera.attachControl(this.canvas, true);

    const pipeline = new DefaultRenderingPipeline('ohm-render-pipeline', true, this.scene, [camera]);
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
      new Vector3(-2.75, 0, 0.4),
      ids.sourcePlus,
      ids.sourceMinus,
      registerTerminal,
    );

    this.resistor = new ResistorModuleVisual(
      this.scene,
      this.theme,
      new Vector3(-0.4, 0, 0.48),
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
        max: 4,
        decimals: 2,
        position: new Vector3(2.25, 0, 0.34),
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
        position: new Vector3(0.55, 0, 1.94),
        plus: ids.voltmeterPlus,
        minus: ids.voltmeterMinus,
        width: 1.96,
        height: 1.67,
      },
      registerTerminal,
    );

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

    installOhmGlbShells(this.scene, shadow);
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
      const metadata = (pointerInfo.pickInfo?.pickedMesh?.metadata ?? null) as PickMetadata | null;

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        this.handlePointerMove(metadata);
        return;
      }

      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;
      this.canvas.focus({ preventScroll: true });

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

    if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';
    else if (metadata?.connectionId) this.canvas.style.cursor = 'pointer';
    else this.canvas.style.cursor = selectedTerminal ? 'crosshair' : 'default';

    this.refreshTerminals(selectedTerminal, this.hoveredTerminal);

    if (!selectedTerminal) {
      this.clearPreviewWire();
      return;
    }

    const from = this.terminalMeshes.get(selectedTerminal)?.mesh.position;
    if (!from) {
      this.clearPreviewWire();
      return;
    }

    const snapped = this.hoveredTerminal
      ? this.terminalMeshes.get(this.hoveredTerminal)?.mesh.position
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
    const frontOffset = 0.28 + Math.min(0.55, distance * 0.065);
    const routeZ = Math.min(from.z, to.z) - frontOffset - Math.abs(lane) * 0.2;
    const first = from.add(new Vector3(0, -0.08, -0.16));
    const last = to.add(new Vector3(0, -0.08, -0.16));
    const middleA = Vector3.Lerp(from, to, 0.3);
    middleA.x += lane;
    middleA.y = tableY;
    middleA.z = Math.min(middleA.z, routeZ);
    const middleB = Vector3.Lerp(from, to, 0.7);
    middleB.x -= lane * 0.45;
    middleB.y = tableY;
    middleB.z = Math.min(middleB.z, routeZ + 0.06);
    return Curve3.CreateCatmullRomSpline(
      [from.clone(), first, middleA, middleB, last, to.clone()],
      12,
      false,
    ).getPoints();
  }

  private applyState(state: SimulationState): void {
    const snapshot = this.runtime.circuit.snapshot();
    const source = snapshot.components.find((component) => component.id === ids.source);
    const resistor = snapshot.components.find((component) => component.id === ids.resistor);
    const sourceVoltage = source?.kind === 'voltage-source' ? source.voltage : 0;
    const resistance = resistor?.kind === 'resistor' ? resistor.resistance : 0;
    const ammeterMeasurement = state.result.measurements[ids.ammeter];
    const voltmeterMeasurement = state.result.measurements[ids.voltmeter];
    const resistorMeasurement = state.result.measurements[ids.resistor];

    this.source.setVoltage(sourceVoltage);
    this.source.setActive(
      state.result.status === 'closed',
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
        for (const mesh of visual.meshes) mesh.dispose();
        visual.material.dispose();
        this.connectionMeshes.delete(id);
      }
    }

    if (this.selectedConnection && !activeIds.has(this.selectedConnection)) {
      this.selectedConnection = null;
    }

    for (const connection of connections) {
      if (this.connectionMeshes.has(connection.id)) continue;
      const from = this.terminalMeshes.get(connection.from)?.mesh.position;
      const to = this.terminalMeshes.get(connection.to)?.mesh.position;
      if (!from || !to) continue;

      const path = this.createWirePath(from, to, this.wireLane(connection.id));
      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      const baseColor = red
        ? new Color3(0.5, 0.012, 0.022)
        : new Color3(0.012, 0.015, 0.018);
      const material = new PBRMaterial(`wire-material:${connection.id}`, this.scene);
      material.albedoColor = baseColor;
      material.metallic = 0.0;
      material.roughness = 0.94;
      material.environmentIntensity = 0.32;

      const tube = MeshBuilder.CreateTube(
        `wire:${connection.id}`,
        { path, radius: 0.046, tessellation: 20, cap: Mesh.CAP_ALL },
        this.scene,
      );
      tube.material = material;
      tube.isPickable = true;
      tube.metadata = { connectionId: connection.id } satisfies PickMetadata;

      const plugFrom = this.createBananaPlug(
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

      this.connectionMeshes.set(connection.id, {
        meshes: [tube, ...plugFrom, ...plugTo],
        material,
        baseColor,
      });
    }

    this.refreshConnectionStyles();
  }

  private createBananaPlug(
    name: string,
    terminalPosition: Vector3,
    material: PBRMaterial,
    id: ConnectionId,
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
    sleeve.metadata = { connectionId: id } satisfies PickMetadata;

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
    strainRelief.metadata = { connectionId: id } satisfies PickMetadata;

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
