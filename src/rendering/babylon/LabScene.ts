import {
  ArcRotateCamera,
  Color3,
  Color4,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  StandardMaterial,
  Vector3,
  type AbstractMesh,
} from '@babylonjs/core';
import type { SimulationRuntime, SimulationState } from '../../core/simulation';
import { terminalId, type Connection, type TerminalId } from '../../core/types';
import { ids } from '../../experiments/ohms-law/createOhmsLaw';

interface MeterReadout {
  readonly texture: DynamicTexture;
  readonly unit: string;
  readonly decimals: number;
}

interface TerminalVisual {
  readonly mesh: Mesh;
  readonly material: StandardMaterial;
}

export class LabScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly terminalMeshes = new Map<string, TerminalVisual>();
  private readonly connectionMeshes = new Map<string, AbstractMesh>();
  private readonly readouts = new Map<string, MeterReadout>();
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly runtime: SimulationRuntime,
  ) {
    this.engine = new Engine(canvas, true, {
      antialias: true,
      preserveDrawingBuffer: false,
      stencil: true,
    });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.055, 0.065, 0.075, 1);
    this.buildScene();
    this.bindPicking();
    this.unsubscribe = runtime.subscribe((state) => this.applyState(state));

    this.engine.runRenderLoop(() => this.scene.render());
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.resizeObserver.observe(canvas);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    this.scene.dispose();
    this.engine.dispose();
  }

  private buildScene(): void {
    const camera = new ArcRotateCamera('camera', -Math.PI / 2, 1.05, 11.4, new Vector3(0, 0.65, 0), this.scene);
    camera.lowerRadiusLimit = 9.5;
    camera.upperRadiusLimit = 12.5;
    camera.lowerBetaLimit = 0.82;
    camera.upperBetaLimit = 1.18;
    camera.lowerAlphaLimit = -2.0;
    camera.upperAlphaLimit = -1.15;
    camera.wheelPrecision = 80;
    camera.panningSensibility = 0;
    camera.attachControl(this.canvas, true);

    const hemi = new HemisphericLight('hemi', new Vector3(0.2, 1, -0.25), this.scene);
    hemi.intensity = 1.25;
    const key = new PointLight('key', new Vector3(-2.5, 6, -4), this.scene);
    key.intensity = 90;

    const ground = MeshBuilder.CreateGround('bench', { width: 12, height: 7.2 }, this.scene);
    const groundMaterial = new PBRMaterial('bench-material', this.scene);
    groundMaterial.albedoColor = new Color3(0.085, 0.095, 0.105);
    groundMaterial.metallic = 0.08;
    groundMaterial.roughness = 0.78;
    ground.material = groundMaterial;

    this.createSource(new Vector3(-3.55, 0.56, -0.75));
    this.createResistor(new Vector3(-0.15, 0.34, 0.1));
    this.createAmmeter(new Vector3(3.1, 0.48, -0.45));
    this.createVoltmeter(new Vector3(0.75, 0.42, 2.05));
  }

  private createSource(position: Vector3): void {
    const body = this.createBox('source-body', position, new Vector3(2.15, 1.25, 1.35), new Color3(0.67, 0.69, 0.7));
    body.rotation.y = -0.04;
    this.createReadout('source', new Vector3(position.x, position.y + 0.28, position.z - 0.69), 'V', 2, new Vector3(0.92, 0.32, 0.02));
    this.createTerminal(ids.sourcePlus, new Vector3(position.x - 0.55, 0.27, position.z - 0.82), 'positive');
    this.createTerminal(ids.sourceMinus, new Vector3(position.x + 0.52, 0.27, position.z - 0.82), 'negative');
    const knob = MeshBuilder.CreateCylinder('source-knob', { height: 0.2, diameter: 0.46, tessellation: 32 }, this.scene);
    knob.position = new Vector3(position.x + 0.72, position.y + 0.25, position.z - 0.73);
    knob.rotation.x = Math.PI / 2;
    knob.material = this.simpleMaterial('knob', new Color3(0.48, 0.49, 0.49));
  }

  private createResistor(position: Vector3): void {
    this.createBox('resistor-base', position, new Vector3(2.25, 0.42, 1.0), new Color3(0.09, 0.1, 0.11));
    const resistor = MeshBuilder.CreateCylinder('resistor', { height: 1.05, diameter: 0.34, tessellation: 32 }, this.scene);
    resistor.position = new Vector3(position.x, position.y + 0.4, position.z);
    resistor.rotation.z = Math.PI / 2;
    resistor.material = this.simpleMaterial('resistor-material', new Color3(0.18, 0.54, 0.69));
    this.createTerminal(ids.resistorA, new Vector3(position.x - 0.92, 0.42, position.z), 'neutral');
    this.createTerminal(ids.resistorB, new Vector3(position.x + 0.92, 0.42, position.z), 'neutral');
    this.createReadout('resistor', new Vector3(position.x, position.y + 0.82, position.z + 0.05), 'Ω', 2, new Vector3(0.78, 0.28, 0.02));
  }

  private createAmmeter(position: Vector3): void {
    this.createBox('ammeter-body', position, new Vector3(1.75, 1.25, 1.1), new Color3(0.11, 0.12, 0.13));
    this.createReadout('ammeter', new Vector3(position.x, position.y + 0.28, position.z - 0.58), 'A', 3, new Vector3(0.78, 0.32, 0.02));
    this.createTerminal(ids.ammeterPlus, new Vector3(position.x - 0.52, 0.22, position.z - 0.66), 'positive');
    this.createTerminal(ids.ammeterMinus, new Vector3(position.x + 0.52, 0.22, position.z - 0.66), 'negative');
  }

  private createVoltmeter(position: Vector3): void {
    this.createBox('voltmeter-body', position, new Vector3(1.65, 1.02, 0.95), new Color3(0.105, 0.115, 0.125));
    this.createReadout('voltmeter', new Vector3(position.x, position.y + 0.23, position.z - 0.5), 'V', 2, new Vector3(0.72, 0.28, 0.02));
    this.createTerminal(ids.voltmeterPlus, new Vector3(position.x - 0.48, 0.2, position.z - 0.57), 'positive');
    this.createTerminal(ids.voltmeterMinus, new Vector3(position.x + 0.48, 0.2, position.z - 0.57), 'negative');
  }

  private createBox(name: string, position: Vector3, size: Vector3, color: Color3): Mesh {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, this.scene);
    mesh.position = position;
    const material = new PBRMaterial(`${name}-material`, this.scene);
    material.albedoColor = color;
    material.metallic = 0.12;
    material.roughness = 0.5;
    mesh.material = material;
    return mesh;
  }

  private createReadout(
    id: string,
    position: Vector3,
    unit: string,
    decimals: number,
    size: Vector3,
  ): void {
    const plane = MeshBuilder.CreatePlane(`${id}-readout`, { width: size.x, height: size.y }, this.scene);
    plane.position = position;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    const texture = new DynamicTexture(`${id}-readout-texture`, { width: 512, height: 160 }, this.scene, true);
    texture.hasAlpha = true;
    const material = new StandardMaterial(`${id}-readout-material`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveColor = new Color3(0.05, 0.28, 0.34);
    material.disableLighting = true;
    plane.material = material;
    this.readouts.set(id, { texture, unit, decimals });
    this.drawReadout(id, 0);
  }

  private drawReadout(id: string, value: number): void {
    const readout = this.readouts.get(id);
    if (!readout) return;
    const context = readout.texture.getContext();
    context.clearRect(0, 0, 512, 160);
    context.fillStyle = '#0b1014';
    context.fillRect(0, 0, 512, 160);
    readout.texture.drawText(
      `${Number.isFinite(value) ? value.toFixed(readout.decimals) : 'OVER'} ${readout.unit}`,
      null,
      105,
      '700 72px monospace',
      '#58d7ff',
      '#0b1014',
      true,
    );
  }

  private createTerminal(id: TerminalId, position: Vector3, polarity: 'positive' | 'negative' | 'neutral'): void {
    const mesh = MeshBuilder.CreateCylinder(`terminal:${id}`, { height: 0.24, diameter: 0.28, tessellation: 28 }, this.scene);
    mesh.position = position;
    const color = polarity === 'positive' ? new Color3(0.82, 0.11, 0.13) : polarity === 'negative' ? new Color3(0.06, 0.07, 0.08) : new Color3(0.45, 0.48, 0.5);
    const material = this.simpleMaterial(`terminal-material:${id}`, color);
    mesh.material = material;
    mesh.isPickable = true;
    mesh.metadata = { terminalId: id };
    this.terminalMeshes.set(id, { mesh, material });
  }

  private simpleMaterial(name: string, color: Color3): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.35, 0.35, 0.35);
    return material;
  }

  private bindPicking(): void {
    this.scene.onPointerDown = (_event, pickResult) => {
      const terminal = (pickResult.pickedMesh?.metadata as { terminalId?: string } | null)?.terminalId;
      if (terminal) this.runtime.chooseTerminal(terminalId(terminal));
    };
  }

  private applyState(state: SimulationState): void {
    const snapshot = this.runtime.circuit.snapshot();
    const source = snapshot.components.find((component) => component.id === ids.source);
    const resistor = snapshot.components.find((component) => component.id === ids.resistor);
    this.drawReadout('source', source?.kind === 'voltage-source' ? source.voltage : 0);
    this.drawReadout('resistor', resistor?.kind === 'resistor' ? resistor.resistance : 0);
    this.drawReadout('ammeter', state.result.measurements[ids.ammeter]?.current ?? 0);
    this.drawReadout('voltmeter', state.result.measurements[ids.voltmeter]?.voltage ?? 0);
    this.refreshTerminals(state.selectedTerminal);
    this.refreshConnections(snapshot.connections);
  }

  private refreshTerminals(selected: TerminalId | null): void {
    for (const [id, visual] of this.terminalMeshes) {
      const active = id === selected;
      visual.material.emissiveColor = active ? new Color3(0.1, 0.65, 0.85) : Color3.Black();
      visual.mesh.scaling.setAll(active ? 1.25 : 1);
    }
  }

  private refreshConnections(connections: readonly Connection[]): void {
    const activeIds = new Set(connections.map((connection) => connection.id as string));
    for (const [id, mesh] of this.connectionMeshes) {
      if (!activeIds.has(id)) {
        mesh.dispose();
        this.connectionMeshes.delete(id);
      }
    }

    for (const connection of connections) {
      if (this.connectionMeshes.has(connection.id)) continue;
      const from = this.terminalMeshes.get(connection.from)?.mesh.position;
      const to = this.terminalMeshes.get(connection.to)?.mesh.position;
      if (!from || !to) continue;
      const distance = Vector3.Distance(from, to);
      const mid = Vector3.Lerp(from, to, 0.5).add(new Vector3(0, Math.min(0.7, 0.16 + distance * 0.06), 0));
      const path = [from.clone(), Vector3.Lerp(from, mid, 0.5), mid, Vector3.Lerp(mid, to, 0.5), to.clone()];
      const tube = MeshBuilder.CreateTube(`wire:${connection.id}`, { path, radius: 0.055, tessellation: 16 }, this.scene);
      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
      const toTerminal = this.runtime.circuit.getTerminal(connection.to);
      const red = fromTerminal.polarity === 'positive' || toTerminal.polarity === 'positive';
      tube.material = this.simpleMaterial(`wire-material:${connection.id}`, red ? new Color3(0.66, 0.05, 0.08) : new Color3(0.045, 0.05, 0.055));
      this.connectionMeshes.set(connection.id, tube);
    }
  }
}
