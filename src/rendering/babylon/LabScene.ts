import {
  ArcRotateCamera,
  Color3,
  Color4,
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
    this.scene.clearColor = new Color4(0.032, 0.038, 0.043, 1);
    this.scene.imageProcessingConfiguration.contrast = 1.12;
    this.scene.imageProcessingConfiguration.exposure = 1.02;
    this.theme = createInstrumentTheme(this.scene);

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
      1.02,
      11.8,
      new Vector3(0, 0.72, 0.2),
      this.scene,
    );
    camera.lowerRadiusLimit = 10.2;
    camera.upperRadiusLimit = 13.2;
    camera.lowerBetaLimit = 0.86;
    camera.upperBetaLimit = 1.12;
    camera.lowerAlphaLimit = -1.82;
    camera.upperAlphaLimit = -1.31;
    camera.wheelPrecision = 100;
    camera.panningSensibility = 0;
    camera.attachControl(this.canvas, true);

    const hemi = new HemisphericLight(
      'ambient-lab-light',
      new Vector3(0.1, 1, -0.22),
      this.scene,
    );
    hemi.intensity = 0.72;
    hemi.diffuse = new Color3(0.84, 0.9, 0.94);
    hemi.groundColor = new Color3(0.08, 0.09, 0.1);

    const key = new PointLight(
      'softbox-key',
      new Vector3(-4.6, 6.2, -4.4),
      this.scene,
    );
    key.intensity = 72;
    key.diffuse = new Color3(1.0, 0.94, 0.84);

    const fill = new PointLight(
      'softbox-fill',
      new Vector3(4.4, 4.2, -2.1),
      this.scene,
    );
    fill.intensity = 34;
    fill.diffuse = new Color3(0.68, 0.83, 1.0);

    const shadow = new ShadowGenerator(2048, key);
    shadow.useBlurExponentialShadowMap = true;
    shadow.blurKernel = 22;
    shadow.bias = 0.0008;
    shadow.normalBias = 0.02;

    const ground = MeshBuilder.CreateGround(
      'bench-pick-surface',
      { width: 12.4, height: 7.4 },
      this.scene,
    );
    ground.position.y = 0.005;
    ground.material = this.theme.bench;
    ground.receiveShadows = true;
    this.bench = ground;

    const benchSlab = MeshBuilder.CreateBox(
      'bench-slab',
      { width: 12.6, height: 0.16, depth: 7.6 },
      this.scene,
    );
    benchSlab.position.y = -0.09;
    const slabMaterial = this.theme.bench.clone('bench-slab-material');
    if (slabMaterial) {
      slabMaterial.albedoColor = new Color3(0.052, 0.058, 0.064);
      slabMaterial.roughness = 0.8;
      benchSlab.material = slabMaterial;
    } else {
      benchSlab.material = this.theme.bench;
    }
    benchSlab.receiveShadows = true;

    const backRail = MeshBuilder.CreateBox(
      'bench-back-rail',
      { width: 12.2, height: 0.22, depth: 0.14 },
      this.scene,
    );
    backRail.position = new Vector3(0, 0.1, 3.55);
    backRail.material = this.theme.darkMetal;

    const registerTerminal = (
      id: TerminalId,
      position: Vector3,
      polarity: TerminalPolarity,
    ): Mesh => this.createTerminal(id, position, polarity);

    this.source = new PowerSupplyVisual(
      this.scene,
      this.theme,
      new Vector3(-3.75, 0, -0.78),
      ids.sourcePlus,
      ids.sourceMinus,
      registerTerminal,
    );

    this.resistor = new ResistorModuleVisual(
      this.scene,
      this.theme,
      new Vector3(-0.45, 0, 0.38),
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
        decimals: 3,
        position: new Vector3(3.25, 0, -0.65),
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
        position: new Vector3(1.05, 0, 2.0),
        plus: ids.voltmeterPlus,
        minus: ids.voltmeterMinus,
        width: 1.78,
        height: 1.48,
      },
      registerTerminal,
    );

    for (const mesh of this.scene.meshes) {
      if (mesh === ground || mesh.name.includes('glass') || mesh.name.includes('display')) continue;
      shadow.addShadowCaster(mesh, true);
    }
  }

  private createTerminal(
    id: TerminalId,
    position: Vector3,
    polarity: TerminalPolarity,
  ): Mesh {
    const metalBase = MeshBuilder.CreateCylinder(
      `terminal-base:${id}`,
      { height: 0.18, diameter: 0.34, tessellation: 36 },
      this.scene,
    );
    metalBase.position = position.add(new Vector3(0, 0, 0.075));
    metalBase.rotation.x = Math.PI / 2;
    metalBase.material = this.theme.metal;
    metalBase.isPickable = false;

    const ring = MeshBuilder.CreateTorus(
      `terminal-ring:${id}`,
      { diameter: 0.34, thickness: 0.055, tessellation: 40 },
      this.scene,
    );
    ring.position = position.add(new Vector3(0, 0, -0.028));
    ring.rotation.x = Math.PI / 2;
    ring.material = this.theme.darkMetal;
    ring.isPickable = false;

    const cap = MeshBuilder.CreateCylinder(
      `terminal:${id}`,
      { height: 0.18, diameter: 0.25, tessellation: 36 },
      this.scene,
    );
    cap.position = position.add(new Vector3(0, 0, -0.085));
    cap.rotation.x = Math.PI / 2;

    const baseColor = polarity === 'positive'
      ? new Color3(0.68, 0.035, 0.045)
      : polarity === 'negative'
        ? new Color3(0.025, 0.028, 0.032)
        : new Color3(0.29, 0.32, 0.34);
    const material = new StandardMaterial(`terminal-material:${id}`, this.scene);
    material.diffuseColor = baseColor;
    material.specularColor = new Color3(0.5, 0.5, 0.5);
    cap.material = material;
    cap.isPickable = true;
    cap.metadata = { terminalId: id } satisfies PickMetadata;

    const contact = MeshBuilder.CreateCylinder(
      `terminal-contact:${id}`,
      { height: 0.045, diameter: 0.105, tessellation: 28 },
      this.scene,
    );
    contact.position = position.add(new Vector3(0, 0, -0.19));
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

    if (!snapped) pointerPoint.y = Math.max(pointerPoint.y + 0.12, 0.12);
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
    const points = this.createWirePath(from, to, 0.5);
    if (!this.previewWire) {
      this.previewWire = MeshBuilder.CreateLines(
        'wire-preview',
        { points, updatable: true },
        this.scene,
      );
      this.previewWire.isPickable = false;
      this.previewWire.alpha = 0.9;
    } else {
      this.previewWire = MeshBuilder.CreateLines(
        'wire-preview',
        { points, instance: this.previewWire },
      );
    }
    this.previewWire.color = snapped
      ? new Color3(0.28, 0.82, 0.48)
      : new Color3(0.3, 0.7, 0.86);
  }

  private clearPreviewWire(): void {
    this.previewWire?.dispose();
    this.previewWire = null;
  }

  private createWirePath(from: Vector3, to: Vector3, liftScale = 0.7): Vector3[] {
    const distance = Vector3.Distance(from, to);
    const mid = Vector3.Lerp(from, to, 0.5).add(
      new Vector3(0, Math.min(liftScale, 0.18 + distance * 0.07), -0.05),
    );
    return [
      from.clone(),
      Vector3.Lerp(from, mid, 0.42),
      mid,
      Vector3.Lerp(mid, to, 0.58),
      to.clone(),
    ];
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
      visual.mesh.scaling.setAll(active ? 1.18 : candidate ? 1.12 : 1);
      visual.ring.scaling.setAll(active ? 1.08 : candidate ? 1.05 : 1);
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

      const path = this.createWirePath(from, to);
      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      const baseColor = red
        ? new Color3(0.5, 0.018, 0.025)
        : new Color3(0.018, 0.022, 0.025);
      const material = new PBRMaterial(`wire-material:${connection.id}`, this.scene);
      material.albedoColor = baseColor;
      material.metallic = 0.02;
      material.roughness = 0.82;

      const tube = MeshBuilder.CreateTube(
        `wire:${connection.id}`,
        { path, radius: 0.068, tessellation: 20, cap: Mesh.CAP_ALL },
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
        meshes: [tube, plugFrom, plugTo],
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
  ): Mesh {
    const plug = MeshBuilder.CreateCylinder(
      name,
      { height: 0.24, diameterTop: 0.18, diameterBottom: 0.24, tessellation: 28 },
      this.scene,
    );
    plug.position = terminalPosition.add(new Vector3(0, 0, -0.22));
    plug.rotation.x = Math.PI / 2;
    plug.material = material;
    plug.isPickable = true;
    plug.metadata = { connectionId: id } satisfies PickMetadata;
    return plug;
  }

  private refreshConnectionStyles(): void {
    for (const [id, visual] of this.connectionMeshes) {
      const selected = id === this.selectedConnection;
      visual.material.albedoColor = selected
        ? new Color3(0.12, 0.42, 0.54)
        : visual.baseColor;
      visual.material.emissiveColor = selected
        ? new Color3(0.035, 0.2, 0.27)
        : Color3.Black();
    }
  }
}
