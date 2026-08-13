import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { InstrumentTheme } from './InstrumentTheme';

type SurfaceMaterial = PBRMaterial | StandardMaterial;

function box(scene: Scene, name: string, position: Vector3, size: Vector3, material: SurfaceMaterial): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  mesh.position = position;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function cylinder(scene: Scene, name: string, position: Vector3, diameter: number, height: number, material: SurfaceMaterial, tessellation = 36): Mesh {
  const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, scene);
  mesh.position = position;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function textPlate(scene: Scene, name: string, position: Vector3, width: number, height: number, text: string, color: string, fontSize = 38): Mesh {
  const plane = MeshBuilder.CreatePlane(name, { width, height }, scene);
  plane.position = position;
  plane.isPickable = false;
  const texture = new DynamicTexture(`${name}-texture`, { width: 720, height: 180 }, scene, true);
  texture.hasAlpha = true;
  const context = texture.getContext();
  context.clearRect(0, 0, 720, 180);
  texture.drawText(text, null, 116, `600 ${fontSize}px Inter, Arial, sans-serif`, color, null, true);
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = Color3.White();
  material.disableLighting = true;
  material.backFaceCulling = false;
  plane.material = material;
  return plane;
}

function buildSourceDetail(scene: Scene, theme: InstrumentTheme): void {
  const p = new Vector3(-3.35, 0, 1.45);
  const frontZ = p.z - 1.46 / 2 - 0.055;
  for (let index = 0; index < 9; index += 1) {
    const vent = box(scene, `source-polish-top-vent-${index}`, new Vector3(p.x - 0.9 + index * 0.225, 1.79, p.z + 0.17), new Vector3(0.105, 0.018, 0.68), theme.rubberBlack);
    vent.rotation.z = -0.025;
  }
  for (const x of [-1, 1]) {
    box(scene, `source-polish-front-edge-${x}`, new Vector3(p.x + x * 1.235, 0.95, frontZ - 0.112), new Vector3(0.025, 1.37, 0.025), theme.chrome);
    box(scene, `source-polish-top-seam-${x}`, new Vector3(p.x + x * 1.18, 1.75, p.z + 0.05), new Vector3(0.03, 0.025, 1.18), theme.darkMetal);
  }
  const knobCenter = new Vector3(p.x + 0.77, 1.1, frontZ - 0.132);
  const start = Math.PI * 0.77;
  const sweep = Math.PI * 1.46;
  const radius = 0.405;
  for (let index = 0; index <= 18; index += 1) {
    const angle = start + sweep * (index / 18);
    const major = index % 3 === 0;
    const tick = box(scene, `source-polish-knob-scale-${index}`, new Vector3(knobCenter.x + Math.cos(angle) * radius, knobCenter.y + Math.sin(angle) * radius, knobCenter.z), new Vector3(major ? 0.024 : 0.014, major ? 0.085 : 0.055, 0.014), major ? theme.chrome : theme.labelMetal);
    tick.rotation.z = angle + Math.PI / 2;
  }
  textPlate(scene, 'source-polish-scale-zero', new Vector3(knobCenter.x - 0.34, knobCenter.y - 0.32, knobCenter.z - 0.006), 0.22, 0.11, '0', '#d8dde0', 32);
  textPlate(scene, 'source-polish-scale-max', new Vector3(knobCenter.x + 0.34, knobCenter.y - 0.32, knobCenter.z - 0.006), 0.28, 0.11, '12', '#d8dde0', 32);
  box(scene, 'source-polish-serial-badge', new Vector3(p.x + 0.54, 0.31, frontZ - 0.12), new Vector3(0.56, 0.16, 0.025), theme.labelMetal);
  textPlate(scene, 'source-polish-serial-text', new Vector3(p.x + 0.54, 0.31, frontZ - 0.139), 0.48, 0.1, 'LAB • CV', '#25292b', 27);
}

function buildMeterDetail(scene: Scene, theme: InstrumentTheme, prefix: 'ammeter' | 'voltmeter', p: Vector3, width: number, height: number): void {
  const frontZ = p.z - 0.84 / 2 - 0.055;
  for (const x of [-1, 1]) {
    box(scene, `${prefix}-polish-edge-v-${x}`, new Vector3(p.x + x * width * 0.476, 0.96, frontZ - 0.102), new Vector3(0.022, height * 0.85, 0.022), theme.chrome);
  }
  for (const y of [-1, 1]) {
    box(scene, `${prefix}-polish-edge-h-${y}`, new Vector3(p.x, 0.96 + y * height * 0.43, frontZ - 0.102), new Vector3(width * 0.91, 0.022, 0.022), theme.chrome);
  }
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      const boss = cylinder(scene, `${prefix}-polish-glass-boss-${x}-${y}`, new Vector3(p.x + x * width * 0.365, 1.18 + y * 0.39, frontZ - 0.18), 0.075, 0.035, theme.chrome, 28);
      boss.rotation.x = Math.PI / 2;
    }
  }
  const reflectionMaterial = new StandardMaterial(`${prefix}-polish-glass-reflection`, scene);
  reflectionMaterial.diffuseColor = new Color3(0.78, 0.9, 1.0);
  reflectionMaterial.emissiveColor = new Color3(0.18, 0.28, 0.34);
  reflectionMaterial.specularColor = Color3.White();
  reflectionMaterial.alpha = 0.11;
  reflectionMaterial.backFaceCulling = false;
  const reflection = MeshBuilder.CreatePlane(`${prefix}-polish-glass-streak`, { width: width * 0.57, height: 0.035 }, scene);
  reflection.position = new Vector3(p.x - width * 0.08, 1.48, frontZ - 0.187);
  reflection.rotation.z = -0.11;
  reflection.material = reflectionMaterial;
  reflection.isPickable = false;
  box(scene, `${prefix}-polish-lower-badge`, new Vector3(p.x, 0.42, frontZ - 0.135), new Vector3(width * 0.64, 0.16, 0.022), theme.labelMetal);
  textPlate(scene, `${prefix}-polish-lower-text`, new Vector3(p.x, 0.42, frontZ - 0.153), width * 0.58, 0.1, prefix === 'ammeter' ? 'DC • 5 A • CLASS 1.5' : 'DC • 12 V • CLASS 1.5', '#23282b', 23);
}

function buildResistorDetail(scene: Scene, theme: InstrumentTheme): void {
  const p = new Vector3(-0.7, 0, -0.75);
  for (const x of [-1, 1]) {
    box(scene, `resistor-polish-base-edge-${x}`, new Vector3(p.x + x * 1.31, 0.28, p.z - 0.02), new Vector3(0.025, 0.26, 1.02), theme.chrome);
    const bolt = cylinder(scene, `resistor-polish-mount-bolt-${x}`, new Vector3(p.x + x * 0.92, 0.49, p.z + 0.35), 0.11, 0.045, theme.chrome, 28);
    bolt.rotation.x = Math.PI / 2;
  }
  box(scene, 'resistor-polish-front-rail', new Vector3(p.x, 0.34, p.z - 0.595), new Vector3(2.28, 0.035, 0.025), theme.chrome);
  const pivot = scene.getTransformNodeByName('power-resistor-pivot') as TransformNode | null;
  if (!pivot) return;
  for (const offset of [-0.58, 0.58]) {
    const band = MeshBuilder.CreateTorus(`resistor-polish-body-band-${offset}`, { diameter: 0.448, thickness: 0.018, tessellation: 48 }, scene);
    band.position = new Vector3(offset, 0, 0);
    band.rotation.z = Math.PI / 2;
    band.parent = pivot;
    band.material = theme.copper;
    band.isPickable = false;
  }
  const marking = textPlate(scene, 'resistor-polish-body-marking', new Vector3(0, 0.228, 0), 0.82, 0.11, 'WIREWOUND • 20 W', '#514532', 22);
  marking.rotation.x = -Math.PI / 2;
  marking.parent = pivot;
}

function buildBenchAndStudioDetail(scene: Scene, theme: InstrumentTheme): void {
  box(scene, 'studio-polish-lower-plinth', new Vector3(0, -0.235, 0.05), new Vector3(11.98, 0.12, 6.18), theme.darkMetal);
  box(scene, 'studio-polish-plinth-highlight', new Vector3(0, -0.164, -2.99), new Vector3(11.92, 0.028, 0.035), theme.chrome);
  box(scene, 'studio-polish-mat-back-trim', new Vector3(0, 0.052, 2.795), new Vector3(9.94, 0.035, 0.035), theme.chrome);
  for (const x of [-5.86, 5.86]) {
    const rail = box(scene, `studio-polish-side-rail-${x}`, new Vector3(x, 0.01, 0.04), new Vector3(0.08, 0.22, 5.82), theme.chrome);
    rail.rotation.z = x < 0 ? 0.008 : -0.008;
  }
  const blue = new StandardMaterial('studio-polish-blue-accent-material', scene);
  blue.diffuseColor = new Color3(0.015, 0.08, 0.12);
  blue.emissiveColor = new Color3(0.015, 0.18, 0.31);
  blue.specularColor = new Color3(0.12, 0.42, 0.7);
  for (const x of [-6.2, 6.2]) {
    box(scene, `studio-polish-blue-accent-${x}`, new Vector3(x, 3.15, 6.12), new Vector3(0.09, 5.6, 0.06), blue);
  }
  const blueSoft = blue.clone('studio-polish-blue-soft') as StandardMaterial;
  blueSoft.alpha = 0.3;
  for (const x of [-5.2, 5.2]) {
    box(scene, `studio-polish-blue-soft-${x}`, new Vector3(x, 2.75, 6.105), new Vector3(0.025, 4.8, 0.04), blueSoft);
  }
}

export function installOhmVisualPolish(scene: Scene, theme: InstrumentTheme): void {
  buildSourceDetail(scene, theme);
  buildMeterDetail(scene, theme, 'ammeter', new Vector3(3.55, 0, -0.35), 2.08, 1.78);
  buildMeterDetail(scene, theme, 'voltmeter', new Vector3(1.48, 0, 1.72), 1.96, 1.67);
  buildResistorDetail(scene, theme);
  buildBenchAndStudioDetail(scene, theme);
}
