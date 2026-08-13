import {
  type AbstractMesh,
  Scene,
  SceneLoader,
  ShadowGenerator,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';

interface ShellSpec {
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

function prepareImportedMeshes(
  meshes: readonly AbstractMesh[],
  position: Vector3,
  shadow: ShadowGenerator,
): void {
  const root = meshes[0];
  if (root) root.position = position.clone();

  for (const mesh of meshes) {
    mesh.isPickable = false;
    shadow.addShadowCaster(mesh, true);
  }
}

async function installShell(
  scene: Scene,
  shadow: ShadowGenerator,
  rootUrl: string,
  spec: ShellSpec,
): Promise<void> {
  const result = await SceneLoader.ImportMeshAsync('', rootUrl, spec.file, scene);
  if (result.meshes.length === 0) {
    throw new Error(`GLB shell ${spec.file} loaded without meshes`);
  }

  prepareImportedMeshes(result.meshes, spec.position, shadow);
  disableFallback(scene, spec.fallbackNames, spec.fallbackPrefixes);
}

/**
 * Replace only the static outer housings with authored GLB meshes.
 * Dynamic faces, needles, displays, terminals and circuit interaction remain
 * Babylon-controlled. Each replacement is fail-safe: a Pass 4 primitive shell
 * is disabled only after its corresponding GLB has loaded successfully.
 */
export function installOhmGlbShells(scene: Scene, shadow: ShadowGenerator): void {
  const rootUrl = `${import.meta.env.BASE_URL}models/ohm/`;

  const specs: readonly ShellSpec[] = [
    {
      file: 'power-supply-shell.glb',
      position: new Vector3(-3.35, 0.94, 1.45),
      fallbackNames: ['source-shell'],
      fallbackPrefixes: ['source-vent-'],
    },
    {
      file: 'analog-meter-shell.glb',
      position: new Vector3(3.55, 0.96, -0.35),
      fallbackNames: ['ammeter-shell'],
    },
    {
      file: 'analog-meter-shell.glb',
      position: new Vector3(1.48, 0.96, 1.72),
      fallbackNames: ['voltmeter-shell'],
    },
    {
      file: 'resistor-base.glb',
      position: new Vector3(-0.7, 0.24, -0.75),
      fallbackNames: ['resistor-module-base', 'resistor-module-deck'],
    },
  ];

  for (const spec of specs) {
    void installShell(scene, shadow, rootUrl, spec).catch((error: unknown) => {
      console.warn(`Keeping Pass 4 fallback for ${spec.file}`, error);
    });
  }
}
