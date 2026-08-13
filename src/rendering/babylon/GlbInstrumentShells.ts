import {
  Color3,
  PBRMaterial,
  type AbstractMesh,
  Scene,
  SceneLoader,
  ShadowGenerator,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface ShellSpec {
  readonly instrumentId: string;
  readonly file: string;
  readonly position: Vector3;
  readonly fallbackNames: readonly string[];
  readonly fallbackPrefixes?: readonly string[];
}

function disableFallback(
  scene: Scene,
  names: readonly string[],
  prefixes: readonly string[] = [],
): void {
  for (const mesh of scene.meshes) {
    if (names.includes(mesh.name) || prefixes.some((prefix) => mesh.name.startsWith(prefix))) {
      mesh.setEnabled(false);
    }
  }
}

function tuneShellMaterial(material: PBRMaterial, instrumentId: string): void {
  material.environmentIntensity = 1.08;
  material.clearCoat.isEnabled = true;
  material.clearCoat.intensity = 0.16;
  material.clearCoat.roughness = 0.34;

  if (instrumentId === 'source') {
    material.albedoColor = new Color3(0.18, 0.195, 0.207);
    material.metallic = 0.34;
    material.roughness = 0.31;
    return;
  }

  if (instrumentId === 'resistor') {
    material.albedoColor = new Color3(0.12, 0.132, 0.142);
    material.metallic = 0.26;
    material.roughness = 0.37;
    return;
  }

  material.albedoColor = new Color3(0.19, 0.205, 0.215);
  material.metallic = 0.38;
  material.roughness = 0.29;
}

function prepareImportedMeshes(
  meshes: readonly AbstractMesh[],
  position: Vector3,
  shadow: ShadowGenerator,
  instrumentId: string,
  parent?: TransformNode,
): void {
  const root = meshes[0];
  if (root) {
    root.position = position.clone();
    if (parent) root.parent = parent;
  }

  for (const mesh of meshes) {
    mesh.isPickable = true;
    mesh.metadata = { ...(mesh.metadata ?? {}), instrumentId };
    if (mesh.material instanceof PBRMaterial) tuneShellMaterial(mesh.material, instrumentId);
    shadow.addShadowCaster(mesh, true);
  }
}

async function installShell(
  scene: Scene,
  shadow: ShadowGenerator,
  rootUrl: string,
  spec: ShellSpec,
  parent?: TransformNode,
): Promise<void> {
  const result = await SceneLoader.ImportMeshAsync('', rootUrl, spec.file, scene);
  if (result.meshes.length === 0) {
    throw new Error(`GLB shell ${spec.file} loaded without meshes`);
  }

  prepareImportedMeshes(result.meshes, spec.position, shadow, spec.instrumentId, parent);
  disableFallback(scene, spec.fallbackNames, spec.fallbackPrefixes);
}

/**
 * Replace only the static outer housings with authored GLB meshes.
 * Dynamic faces, needles, displays, terminals and circuit interaction remain
 * Babylon-controlled. Imported shells receive a controlled studio PBR finish
 * so authored geometry and procedural faces read as one manufactured object.
 */
export function installOhmGlbShells(
  scene: Scene,
  shadow: ShadowGenerator,
  parentFor?: (instrumentId: string) => TransformNode | undefined,
): void {
  const rootUrl = `${import.meta.env.BASE_URL}models/ohm/`;

  const specs: readonly ShellSpec[] = [
    {
      instrumentId: 'source',
      file: 'power-supply-shell.glb',
      position: new Vector3(-3.35, 0.94, 1.45),
      fallbackNames: ['source-shell'],
      fallbackPrefixes: ['source-vent-'],
    },
    {
      instrumentId: 'ammeter',
      file: 'analog-meter-shell.glb',
      position: new Vector3(3.55, 0.96, -0.35),
      fallbackNames: ['ammeter-shell'],
    },
    {
      instrumentId: 'voltmeter',
      file: 'analog-meter-shell.glb',
      position: new Vector3(1.48, 0.96, 1.72),
      fallbackNames: ['voltmeter-shell'],
    },
    {
      instrumentId: 'resistor',
      file: 'resistor-base.glb',
      position: new Vector3(-0.7, 0.24, -0.75),
      fallbackNames: ['resistor-module-base', 'resistor-module-deck'],
    },
  ];

  for (const spec of specs) {
    void installShell(scene, shadow, rootUrl, spec, parentFor?.(spec.instrumentId)).catch((error: unknown) => {
      console.warn(`Keeping procedural fallback for ${spec.file}`, error);
    });
  }
}
