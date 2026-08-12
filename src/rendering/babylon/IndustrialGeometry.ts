import {
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';

export type IndustrialMaterial = PBRMaterial | StandardMaterial;

function prepare(mesh: Mesh, material: IndustrialMaterial): Mesh {
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

/**
 * Lightweight rounded rectangular enclosure built only from Babylon primitives.
 * Overlapping parts are intentional: this keeps the silhouette smooth without
 * coupling the rendering layer to a CSG or authored-asset pipeline.
 */
export function createRoundedEnclosure(
  scene: Scene,
  name: string,
  center: Vector3,
  size: Vector3,
  radius: number,
  material: IndustrialMaterial,
): Mesh[] {
  const r = Math.max(0.035, Math.min(radius, size.x * 0.24, size.y * 0.24));
  const meshes: Mesh[] = [];

  meshes.push(prepare(MeshBuilder.CreateBox(
    `${name}-core-x`,
    { width: Math.max(0.02, size.x - r * 2), height: size.y, depth: size.z },
    scene,
  ), material));
  meshes.at(-1)!.position = center.clone();

  meshes.push(prepare(MeshBuilder.CreateBox(
    `${name}-core-y`,
    { width: size.x, height: Math.max(0.02, size.y - r * 2), depth: size.z },
    scene,
  ), material));
  meshes.at(-1)!.position = center.clone();

  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const corner = prepare(MeshBuilder.CreateCylinder(
        `${name}-corner-${sx}-${sy}`,
        { height: size.z, diameter: r * 2, tessellation: 28 },
        scene,
      ), material);
      corner.rotation.x = Math.PI / 2;
      corner.position = new Vector3(
        center.x + sx * (size.x / 2 - r),
        center.y + sy * (size.y / 2 - r),
        center.z,
      );
      meshes.push(corner);
    }
  }

  return meshes;
}

export function createInsetPanel(
  scene: Scene,
  name: string,
  center: Vector3,
  size: Vector3,
  radius: number,
  panelMaterial: IndustrialMaterial,
  recessMaterial: IndustrialMaterial,
): Mesh[] {
  const recess = createRoundedEnclosure(
    scene,
    `${name}-recess`,
    center.add(new Vector3(0, 0, size.z * 0.22)),
    new Vector3(size.x * 1.025, size.y * 1.045, size.z * 0.7),
    radius * 1.12,
    recessMaterial,
  );
  const panel = createRoundedEnclosure(
    scene,
    `${name}-panel`,
    center,
    size,
    radius,
    panelMaterial,
  );
  return [...recess, ...panel];
}

export function createProtectiveCheeks(
  scene: Scene,
  name: string,
  center: Vector3,
  width: number,
  height: number,
  depth: number,
  material: IndustrialMaterial,
): Mesh[] {
  const cheekWidth = 0.11;
  const offsetX = width / 2 + cheekWidth * 0.28;
  const meshes: Mesh[] = [];
  for (const side of [-1, 1]) {
    meshes.push(...createRoundedEnclosure(
      scene,
      `${name}-cheek-${side}`,
      new Vector3(center.x + side * offsetX, center.y, center.z),
      new Vector3(cheekWidth, height * 0.96, depth),
      0.045,
      material,
    ));
  }
  return meshes;
}
