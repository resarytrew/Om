import { Mesh, Scene, Vector3 } from '@babylonjs/core';
import type { LabScene } from './LabScene';

interface TerminalVisualLike {
  readonly mesh: Mesh;
}

interface LabSceneInternals {
  readonly scene: Scene;
  readonly terminalMeshes: Map<string, TerminalVisualLike>;
  positionBananaPlug(meshes: readonly Mesh[], terminalPosition: Vector3): void;
}

const DEFAULT_OUTWARD = new Vector3(0, 0, -1);

function normalizedHorizontal(direction: Vector3): Vector3 {
  const result = direction.clone();
  result.y = 0;
  if (result.lengthSquared() < 1e-6) return DEFAULT_OUTWARD.clone();
  return result.normalize();
}

function terminalDirection(
  terminals: Map<string, TerminalVisualLike>,
  terminalPosition: Vector3,
): Vector3 {
  let nearest: Mesh | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const visual of terminals.values()) {
    const position = visual.mesh.getAbsolutePosition();
    const distance = Vector3.DistanceSquared(position, terminalPosition);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = visual.mesh;
    }
  }

  // Exact terminal anchors differ only by floating-point noise. A loose plug
  // elsewhere on the bench keeps the normal forward direction.
  if (!nearest || nearestDistance > 1e-4 || !nearest.parent) return DEFAULT_OUTWARD.clone();
  return normalizedHorizontal(
    Vector3.TransformNormal(DEFAULT_OUTWARD, nearest.parent.getWorldMatrix()),
  );
}

function placePlug(
  meshes: readonly Mesh[],
  terminalPosition: Vector3,
  direction: Vector3,
): void {
  const outward = normalizedHorizontal(direction);
  const sleeve = meshes[0];
  const collar = meshes[1];
  const strainRelief = meshes[2];

  if (sleeve) sleeve.position = terminalPosition.add(outward.scale(0.27));
  if (collar) collar.position = terminalPosition.add(outward.scale(0.155));
  if (strainRelief) strainRelief.position = terminalPosition.add(outward.scale(0.455));

  // The plug cylinders are authored along Z after the X rotation. Keep that
  // axis parallel to the rotated socket instead of leaving it in world -Z.
  const yaw = Math.atan2(-outward.x, -outward.z);
  for (const mesh of meshes) {
    mesh.rotationQuaternion = null;
    mesh.rotation.set(Math.PI / 2, yaw, 0);
  }
}

export function installOhmVisualBugFixes(labScene: LabScene): () => void {
  const internal = labScene as unknown as LabSceneInternals;
  const originalPositionBananaPlug = internal.positionBananaPlug;

  internal.positionBananaPlug = (meshes, terminalPosition): void => {
    placePlug(meshes, terminalPosition, terminalDirection(internal.terminalMeshes, terminalPosition));
  };

  // These ultra-thin decorative toruses overlap in perspective and looked like
  // detached wire loops on the adjustable resistor. The structural end collars
  // remain, so the resistor keeps its mechanical detail without visual debris.
  for (const mesh of [...internal.scene.meshes]) {
    if (
      mesh.name.startsWith('resistor-ceramic-band-')
      || mesh.name.startsWith('resistor-polish-body-band-')
    ) {
      mesh.dispose();
    }
  }

  return () => {
    internal.positionBananaPlug = originalPositionBananaPlug;
  };
}
