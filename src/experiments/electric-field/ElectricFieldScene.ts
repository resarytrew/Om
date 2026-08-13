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
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type { ChargedPlateResult } from '../../scientific/field/protocol';

export class ElectricFieldScene {
  private readonly engine: Engine;
  private readonly scene: Scene;
  private readonly plate: Mesh;
  private readonly plateMaterial: PBRMaterial;
  private readonly probe: Mesh;
  private vectors: LinesMesh | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { antialias: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.045, 0.055, 0.065, 1);

    const camera = new ArcRotateCamera(
      'field-camera',
      -Math.PI / 2,
      1.12,
      8.2,
      new Vector3(0, 1.05, 0),
      this.scene,
    );
    camera.lowerRadiusLimit = 6.6;
    camera.upperRadiusLimit = 9.5;
    camera.lowerBetaLimit = 0.85;
    camera.upperBetaLimit = 1.32;
    camera.lowerAlphaLimit = -1.85;
    camera.upperAlphaLimit = -1.3;
    camera.panningSensibility = 0;
    camera.wheelPrecision = 90;
    camera.attachControl(canvas, true);

    const hemi = new HemisphericLight('field-hemi', new Vector3(0.1, 1, -0.2), this.scene);
    hemi.intensity = 1.15;
    const key = new PointLight('field-key', new Vector3(-3, 5, -4), this.scene);
    key.intensity = 70;

    const bench = MeshBuilder.CreateGround('field-bench', { width: 8, height: 5.6 }, this.scene);
    const benchMaterial = new PBRMaterial('field-bench-material', this.scene);
    benchMaterial.albedoColor = new Color3(0.065, 0.075, 0.085);
    benchMaterial.metallic = 0.05;
    benchMaterial.roughness = 0.82;
    bench.material = benchMaterial;

    this.plate = MeshBuilder.CreateBox(
      'charged-plate',
      { width: 1, height: 0.055, depth: 1 },
      this.scene,
    );
    this.plate.position.y = 0.12;
    this.plateMaterial = new PBRMaterial('charged-plate-material', this.scene);
    this.plateMaterial.albedoColor = new Color3(0.08, 0.33, 0.43);
    this.plateMaterial.emissiveColor = new Color3(0.015, 0.08, 0.1);
    this.plateMaterial.metallic = 0.32;
    this.plateMaterial.roughness = 0.42;
    this.plate.material = this.plateMaterial;

    this.probe = MeshBuilder.CreateSphere('field-probe', { diameter: 0.14, segments: 20 }, this.scene);
    const probeMaterial = new StandardMaterial('field-probe-material', this.scene);
    probeMaterial.diffuseColor = new Color3(0.25, 0.84, 0.48);
    probeMaterial.emissiveColor = new Color3(0.08, 0.32, 0.16);
    this.probe.material = probeMaterial;

    this.engine.runRenderLoop(() => this.scene.render());
    this.resizeObserver = new ResizeObserver(() => this.engine.resize());
    this.resizeObserver.observe(canvas);
  }

  update(result: ChargedPlateResult): void {
    this.plate.scaling.x = result.parameters.width;
    this.plate.scaling.z = result.parameters.height;
    this.probe.position.set(0, result.parameters.probe_z + 0.12, 0);
    this.updatePolarity(result.parameters.sigma);
    this.drawVectors(result);
  }

  resize(): void {
    this.engine.resize();
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.vectors?.dispose();
    this.scene.dispose();
    this.engine.dispose();
  }

  private updatePolarity(sigma: number): void {
    if (sigma > 0) {
      this.plateMaterial.albedoColor = new Color3(0.08, 0.33, 0.43);
      this.plateMaterial.emissiveColor = new Color3(0.015, 0.08, 0.1);
      return;
    }
    if (sigma < 0) {
      this.plateMaterial.albedoColor = new Color3(0.43, 0.12, 0.16);
      this.plateMaterial.emissiveColor = new Color3(0.11, 0.02, 0.035);
      return;
    }
    this.plateMaterial.albedoColor = new Color3(0.22, 0.24, 0.26);
    this.plateMaterial.emissiveColor = new Color3(0.02, 0.02, 0.02);
  }

  private drawVectors(result: ChargedPlateResult): void {
    this.vectors?.dispose();
    this.vectors = null;

    const maxMagnitude = Math.max(
      1e-30,
      ...result.samples.map((sample) => sample.magnitude),
    );
    const lines: Vector3[][] = [];

    for (const sample of result.samples) {
      if (!Number.isFinite(sample.magnitude) || sample.magnitude <= 0) continue;
      const dx = sample.ex / sample.magnitude;
      const dz = sample.ez / sample.magnitude;
      const normalizedStrength = Math.sqrt(sample.magnitude / maxMagnitude);
      const length = 0.13 + 0.38 * normalizedStrength;
      const start = new Vector3(sample.x, sample.z + 0.12, 0);
      const direction = new Vector3(dx, dz, 0);
      const end = start.add(direction.scale(length));
      const perpendicular = new Vector3(-direction.y, direction.x, 0);
      const headBase = end.subtract(direction.scale(Math.min(0.09, length * 0.3)));
      const headWidth = Math.min(0.055, length * 0.18);

      lines.push([start, end]);
      lines.push([end, headBase.add(perpendicular.scale(headWidth))]);
      lines.push([end, headBase.subtract(perpendicular.scale(headWidth))]);
    }

    if (lines.length === 0) return;
    this.vectors = MeshBuilder.CreateLineSystem(
      'electric-field-vectors',
      { lines },
      this.scene,
    );
    this.vectors.color = result.parameters.sigma < 0
      ? new Color3(0.95, 0.43, 0.48)
      : new Color3(0.28, 0.76, 0.92);
    this.vectors.alpha = 0.82;
    this.vectors.isPickable = false;
  }
}
