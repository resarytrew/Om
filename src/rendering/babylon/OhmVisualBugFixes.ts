import { Mesh, Scene, Vector3 } from '@babylonjs/core';
import type { LabScene } from './LabScene';

interface TerminalVisualLike {
  readonly mesh: Mesh;
}

interface CableParticleLike {
  readonly position: Vector3;
  readonly previous: Vector3;
  readonly pin: Vector3 | null;
}

interface PhysicalCableLike {
  readonly particles: CableParticleLike[];
  readonly leadOut: number;
  readonly laneOffset: number;
  readonly cableY: number;
}

interface ConnectionVisualLike {
  readonly cable: PhysicalCableLike;
  readonly from: string;
  readonly to: string;
}

interface LooseWireLike {
  readonly cable: PhysicalCableLike;
  readonly start: Vector3;
  readonly end: Vector3;
  readonly startTerminal: string | null;
  readonly endTerminal: string | null;
}

interface LabSceneInternals {
  readonly scene: Scene;
  readonly terminalMeshes: Map<string, TerminalVisualLike>;
  readonly connectionMeshes: Map<string, ConnectionVisualLike>;
  readonly looseWires: Map<string, LooseWireLike>;
  positionBananaPlug(meshes: readonly Mesh[], terminalPosition: Vector3): void;
  syncMovingConnections(): void;
  syncLooseWires(): void;
}

const DEFAULT_OUTWARD = new Vector3(0, 0, -1);

function normalizedHorizontal(direction: Vector3): Vector3 {
  const result = direction.clone();
  result.y = 0;
  if (result.lengthSquared() < 1e-6) return DEFAULT_OUTWARD.clone();
  return result.normalize();
}

function directionFromTerminal(visual: TerminalVisualLike | undefined): Vector3 {
  const parent = visual?.mesh.parent;
  if (!parent) return DEFAULT_OUTWARD.clone();
  return normalizedHorizontal(
    Vector3.TransformNormal(DEFAULT_OUTWARD, parent.getWorldMatrix()),
  );
}

function terminalDirection(
  terminals: Map<string, TerminalVisualLike>,
  terminalPosition: Vector3,
): Vector3 {
  let nearest: TerminalVisualLike | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const visual of terminals.values()) {
    const position = visual.mesh.getAbsolutePosition();
    const distance = Vector3.DistanceSquared(position, terminalPosition);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = visual;
    }
  }

  // Exact terminal anchors differ only by floating-point noise. A loose plug
  // elsewhere on the bench keeps the normal forward direction.
  if (!nearest || nearestDistance > 1e-4) return DEFAULT_OUTWARD.clone();
  return directionFromTerminal(nearest);
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

function movePinnedParticle(particle: CableParticleLike | undefined, target: Vector3): void {
  if (!particle?.pin) return;
  particle.pin.copyFrom(target);
  particle.position.copyFrom(target);
  particle.previous.copyFrom(target);
}

function alignCableEnd(
  cable: PhysicalCableLike,
  terminalPosition: Vector3,
  requestedDirection: Vector3,
  end: 'start' | 'end',
): void {
  const outward = normalizedHorizontal(requestedDirection);
  const lead = terminalPosition.add(outward.scale(cable.leadOut));
  const bendBase = lead.add(outward.scale(0.15));
  const bend = new Vector3(
    bendBase.x,
    Math.max(cable.cableY + 0.08, cable.cableY + (terminalPosition.y - cable.cableY) * 0.48),
    bendBase.z,
  );
  const dropBase = lead.add(outward.scale(0.3));
  const lateralSign = end === 'start' ? 1 : -1;
  const lateral = new Vector3(outward.z, 0, -outward.x)
    .scale(cable.laneOffset * 0.08 * lateralSign);
  const drop = new Vector3(
    dropBase.x + lateral.x,
    cable.cableY,
    dropBase.z + lateral.z,
  );

  if (end === 'start') {
    const targets = [terminalPosition, lead, bend, drop];
    targets.forEach((target, index) => movePinnedParticle(cable.particles[index], target));
    return;
  }

  const targets = [drop, bend, lead, terminalPosition];
  const startIndex = Math.max(0, cable.particles.length - 4);
  targets.forEach((target, index) => movePinnedParticle(cable.particles[startIndex + index], target));
}

function alignConnectionCables(internal: LabSceneInternals): void {
  for (const visual of internal.connectionMeshes.values()) {
    const from = internal.terminalMeshes.get(visual.from);
    const to = internal.terminalMeshes.get(visual.to);
    if (from) {
      alignCableEnd(
        visual.cable,
        from.mesh.getAbsolutePosition(),
        directionFromTerminal(from),
        'start',
      );
    }
    if (to) {
      alignCableEnd(
        visual.cable,
        to.mesh.getAbsolutePosition(),
        directionFromTerminal(to),
        'end',
      );
    }
  }
}

function alignLooseWireCables(internal: LabSceneInternals): void {
  for (const loose of internal.looseWires.values()) {
    if (loose.startTerminal) {
      const terminal = internal.terminalMeshes.get(loose.startTerminal);
      if (terminal) alignCableEnd(loose.cable, loose.start, directionFromTerminal(terminal), 'start');
    }
    if (loose.endTerminal) {
      const terminal = internal.terminalMeshes.get(loose.endTerminal);
      if (terminal) alignCableEnd(loose.cable, loose.end, directionFromTerminal(terminal), 'end');
    }
  }
}

export function installOhmVisualBugFixes(labScene: LabScene): () => void {
  const internal = labScene as unknown as LabSceneInternals;
  const originalPositionBananaPlug = internal.positionBananaPlug;
  const originalSyncMovingConnections = internal.syncMovingConnections;
  const originalSyncLooseWires = internal.syncLooseWires;

  internal.positionBananaPlug = (meshes, terminalPosition): void => {
    placePlug(meshes, terminalPosition, terminalDirection(internal.terminalMeshes, terminalPosition));
  };

  // LabScene updates cable anchors every frame. Run the original synchronization
  // first, then rotate the four semi-rigid pinned particles at each connected end
  // into the terminal's real world-space normal. The flexible span is still left
  // to the existing physical cable solver.
  internal.syncMovingConnections = (): void => {
    originalSyncMovingConnections.call(internal);
    alignConnectionCables(internal);
  };
  internal.syncLooseWires = (): void => {
    originalSyncLooseWires.call(internal);
    alignLooseWireCables(internal);
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
    internal.syncMovingConnections = originalSyncMovingConnections;
    internal.syncLooseWires = originalSyncLooseWires;
  };
}
