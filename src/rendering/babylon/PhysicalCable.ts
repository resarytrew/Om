import { Mesh, MeshBuilder, PBRMaterial, Scene, Vector3 } from '@babylonjs/core';

export interface CableCollider {
  readonly min: Vector3;
  readonly max: Vector3;
}

interface CableParticle {
  readonly position: Vector3;
  readonly previous: Vector3;
  readonly pin: Vector3 | null;
}

export interface PhysicalCableOptions {
  readonly radius?: number;
  readonly particleCount?: number;
  readonly laneOffset?: number;
  readonly leadOut?: number;
  readonly floorY?: number;
  readonly frontClearance?: number;
}

const EPSILON = 1e-4;

export function projectPointOutsideCollider(
  point: Vector3,
  collider: CableCollider,
  padding: number,
): boolean {
  const minX = collider.min.x - padding;
  const minY = collider.min.y - padding;
  const minZ = collider.min.z - padding;
  const maxX = collider.max.x + padding;
  const maxY = collider.max.y + padding;
  const maxZ = collider.max.z + padding;

  if (
    point.x <= minX || point.x >= maxX
    || point.y <= minY || point.y >= maxY
    || point.z <= minZ || point.z >= maxZ
  ) return false;

  const candidates = [
    { distance: point.x - minX, axis: 'x' as const, value: minX - EPSILON },
    { distance: maxX - point.x, axis: 'x' as const, value: maxX + EPSILON },
    { distance: point.y - minY, axis: 'y' as const, value: minY - EPSILON },
    { distance: maxY - point.y, axis: 'y' as const, value: maxY + EPSILON },
    { distance: point.z - minZ, axis: 'z' as const, value: minZ - EPSILON },
    { distance: maxZ - point.z, axis: 'z' as const, value: maxZ + EPSILON },
  ];
  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0]!;
  point[nearest.axis] = nearest.value;
  return true;
}

export function clampPointToBench(point: Vector3, floorY: number): boolean {
  if (point.y >= floorY) return false;
  point.y = floorY;
  return true;
}

export class PhysicalCable {
  readonly radius: number;
  readonly mesh: Mesh;
  private readonly particles: CableParticle[];
  private readonly restLengths: number[];
  private readonly gravity = new Vector3(0, -9.81, 0);
  private readonly leadOut: number;
  private readonly laneOffset: number;
  private readonly cableY: number;

  constructor(
    scene: Scene,
    readonly id: string,
    start: Vector3,
    end: Vector3,
    readonly material: PBRMaterial,
    options: PhysicalCableOptions = {},
  ) {
    this.radius = options.radius ?? 0.046;
    const particleCount = Math.max(20, options.particleCount ?? 28);
    this.leadOut = options.leadOut ?? 0.34;
    this.laneOffset = options.laneOffset ?? 0;
    const floorY = options.floorY ?? 0.045;
    this.cableY = floorY + this.radius * 1.22;
    const leadOut = this.leadOut;
    const laneOffset = this.laneOffset;
    const cableY = this.cableY;
    const frontClearance = options.frontClearance ?? (0.72 + Math.abs(laneOffset) * 0.42);

    // The first four points at each end model the semi-rigid strain-relief
    // section of a laboratory banana lead. The cable exits the socket toward
    // the learner and bends down before the flexible span begins. This keeps
    // the lead away from instrument faces without faking the free-span shape.
    const startLead = start.add(new Vector3(0, 0, -leadOut));
    const endLead = end.add(new Vector3(0, 0, -leadOut));
    const startBend = new Vector3(
      startLead.x,
      Math.max(cableY + 0.08, cableY + (start.y - cableY) * 0.48),
      startLead.z - 0.15,
    );
    const endBend = new Vector3(
      endLead.x,
      Math.max(cableY + 0.08, cableY + (end.y - cableY) * 0.48),
      endLead.z - 0.15,
    );
    const startDrop = new Vector3(
      startLead.x + laneOffset * 0.08,
      cableY,
      startLead.z - 0.3,
    );
    const endDrop = new Vector3(
      endLead.x - laneOffset * 0.08,
      cableY,
      endLead.z - 0.3,
    );

    const positions: Vector3[] = [
      start.clone(),
      startLead.clone(),
      startBend,
      startDrop,
    ];
    const pinnedPerEnd = 4;
    const freeCount = particleCount - pinnedPerEnd * 2;
    for (let index = 1; index <= freeCount; index += 1) {
      const t = index / (freeCount + 1);
      const point = Vector3.Lerp(startDrop, endDrop, t);
      const arch = Math.sin(Math.PI * t);
      // Seed the flexible span in front of the apparatus with a little extra
      // path length. Gravity then settles that slack naturally onto the bench.
      point.y += arch * 0.16;
      point.z -= arch * frontClearance;
      point.x += Math.sin(Math.PI * 2 * t) * laneOffset * 0.72;
      positions.push(point);
    }
    positions.push(endDrop.clone(), endBend, endLead.clone(), end.clone());

    this.particles = positions.map((position, index) => {
      const pinned = index < pinnedPerEnd || index >= positions.length - pinnedPerEnd;
      return {
        position: position.clone(),
        previous: position.clone(),
        pin: pinned ? position.clone() : null,
      };
    });

    this.restLengths = [];
    for (let index = 0; index < this.particles.length - 1; index += 1) {
      const current = this.particles[index]!;
      const next = this.particles[index + 1]!;
      this.restLengths.push(Vector3.Distance(current.position, next.position));
    }

    this.mesh = MeshBuilder.CreateTube(
      `wire:${id}`,
      {
        path: this.positions(),
        radius: this.radius,
        tessellation: 20,
        cap: Mesh.CAP_ALL,
        updatable: true,
      },
      scene,
    );
    this.mesh.material = material;
    this.mesh.isPickable = true;
  }

  integrate(dt: number): void {
    const dtSquared = dt * dt;
    for (const particle of this.particles) {
      if (particle.pin) {
        particle.position.copyFrom(particle.pin);
        particle.previous.copyFrom(particle.pin);
        continue;
      }
      const velocity = particle.position.subtract(particle.previous).scaleInPlace(0.985);
      particle.previous.copyFrom(particle.position);
      particle.position.addInPlace(velocity);
      particle.position.addInPlace(this.gravity.scale(dtSquared));
    }
  }

  solveLengthConstraints(): void {
    for (let index = 0; index < this.particles.length - 1; index += 1) {
      const a = this.particles[index]!;
      const b = this.particles[index + 1]!;
      const delta = b.position.subtract(a.position);
      const distance = delta.length();
      if (distance < EPSILON) continue;
      const error = (distance - this.restLengths[index]!) / distance;

      if (!a.pin && !b.pin) {
        const correction = delta.scale(error * 0.5);
        a.position.addInPlace(correction);
        b.position.subtractInPlace(correction);
      } else if (!a.pin) {
        a.position.addInPlace(delta.scale(error));
      } else if (!b.pin) {
        b.position.subtractInPlace(delta.scale(error));
      }
    }
    this.restorePins();
  }

  solveEnvironment(colliders: readonly CableCollider[], floorY: number): void {
    const padding = this.radius * 1.18;
    for (const particle of this.particles) {
      if (particle.pin) continue;
      const floorHit = clampPointToBench(particle.position, floorY + this.radius);
      let obstacleHit = false;
      for (const collider of colliders) {
        obstacleHit = projectPointOutsideCollider(particle.position, collider, padding) || obstacleHit;
      }
      if (floorHit || obstacleHit) {
        // Remove most penetration velocity so a cable settles instead of buzzing.
        particle.previous.copyFrom(Vector3.Lerp(particle.previous, particle.position, 0.72));
      }
    }
    this.restorePins();
  }

  solveSelfCollision(): void {
    const minDistance = this.radius * 2.05;
    const minDistanceSquared = minDistance * minDistance;
    for (let aIndex = 0; aIndex < this.particles.length; aIndex += 1) {
      for (let bIndex = aIndex + 3; bIndex < this.particles.length; bIndex += 1) {
        this.separateParticles(
          this.particles[aIndex]!,
          this.particles[bIndex]!,
          minDistance,
          minDistanceSquared,
        );
      }
    }
  }

  solveCollisionWith(other: PhysicalCable): void {
    const minDistance = (this.radius + other.radius) * 1.08;
    const minDistanceSquared = minDistance * minDistance;
    for (let aIndex = 0; aIndex < this.particles.length; aIndex += 1) {
      for (let bIndex = 0; bIndex < other.particles.length; bIndex += 1) {
        this.separateParticles(
          this.particles[aIndex]!,
          other.particles[bIndex]!,
          minDistance,
          minDistanceSquared,
        );
      }
    }
  }

  updateAnchors(start: Vector3, end: Vector3): void {
    const startLead = start.add(new Vector3(0, 0, -this.leadOut));
    const endLead = end.add(new Vector3(0, 0, -this.leadOut));
    const startBend = new Vector3(
      startLead.x,
      Math.max(this.cableY + 0.08, this.cableY + (start.y - this.cableY) * 0.48),
      startLead.z - 0.15,
    );
    const endBend = new Vector3(
      endLead.x,
      Math.max(this.cableY + 0.08, this.cableY + (end.y - this.cableY) * 0.48),
      endLead.z - 0.15,
    );
    const startDrop = new Vector3(
      startLead.x + this.laneOffset * 0.08,
      this.cableY,
      startLead.z - 0.3,
    );
    const endDrop = new Vector3(
      endLead.x - this.laneOffset * 0.08,
      this.cableY,
      endLead.z - 0.3,
    );

    const startPins = [start, startLead, startBend, startDrop];
    const endPins = [endDrop, endBend, endLead, end];
    for (let index = 0; index < 4; index += 1) {
      this.movePin(index, startPins[index]!);
      this.movePin(this.particles.length - 4 + index, endPins[index]!);
    }
  }

  updateMesh(): void {
    MeshBuilder.CreateTube(
      `wire:${this.id}`,
      { path: this.positions(), instance: this.mesh },
    );
  }

  dispose(): void {
    this.mesh.dispose();
  }

  private movePin(index: number, target: Vector3): void {
    const particle = this.particles[index];
    if (!particle?.pin) return;
    particle.pin.copyFrom(target);
    particle.position.copyFrom(target);
    particle.previous.copyFrom(target);
  }

  private positions(): Vector3[] {
    return this.particles.map((particle) => particle.position);
  }

  private restorePins(): void {
    for (const particle of this.particles) {
      if (particle.pin) particle.position.copyFrom(particle.pin);
    }
  }

  private separateParticles(
    a: CableParticle,
    b: CableParticle,
    minDistance: number,
    minDistanceSquared: number,
  ): void {
    const delta = b.position.subtract(a.position);
    const distanceSquared = delta.lengthSquared();
    if (distanceSquared >= minDistanceSquared) return;

    let direction: Vector3;
    let distance: number;
    if (distanceSquared < EPSILON) {
      direction = new Vector3(1, 0, 0);
      distance = 0;
    } else {
      distance = Math.sqrt(distanceSquared);
      direction = delta.scale(1 / distance);
    }
    const overlap = minDistance - distance;
    if (!a.pin && !b.pin) {
      const correction = direction.scale(overlap * 0.5);
      a.position.subtractInPlace(correction);
      b.position.addInPlace(correction);
    } else if (!a.pin) {
      a.position.subtractInPlace(direction.scale(overlap));
    } else if (!b.pin) {
      b.position.addInPlace(direction.scale(overlap));
    }
  }
}

export class PhysicalCableSystem {
  private readonly cables = new Set<PhysicalCable>();
  private accumulator = 0;

  constructor(
    private colliders: readonly CableCollider[],
    private readonly floorY = 0.045,
  ) {}

  setColliders(colliders: readonly CableCollider[]): void {
    this.colliders = colliders;
  }

  add(cable: PhysicalCable): void {
    this.cables.add(cable);
  }

  remove(cable: PhysicalCable): void {
    this.cables.delete(cable);
    cable.dispose();
  }

  step(frameDt: number): void {
    if (this.cables.size === 0) return;
    this.accumulator += Math.min(frameDt, 1 / 20);
    const fixedDt = 1 / 60;
    let steps = 0;
    while (this.accumulator >= fixedDt && steps < 3) {
      this.substep(fixedDt);
      this.accumulator -= fixedDt;
      steps += 1;
    }
    for (const cable of this.cables) cable.updateMesh();
  }

  dispose(): void {
    for (const cable of this.cables) cable.dispose();
    this.cables.clear();
  }

  private substep(dt: number): void {
    const cables = [...this.cables];
    for (const cable of cables) cable.integrate(dt);

    // PBD converges through several inexpensive projection passes.
    for (let iteration = 0; iteration < 7; iteration += 1) {
      for (const cable of cables) {
        cable.solveLengthConstraints();
        cable.solveEnvironment(this.colliders, this.floorY);
        cable.solveSelfCollision();
      }
      for (let first = 0; first < cables.length; first += 1) {
        for (let second = first + 1; second < cables.length; second += 1) {
          cables[first]!.solveCollisionWith(cables[second]!);
        }
      }
    }
  }
}
