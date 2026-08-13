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
  const nearest = candidates[0];
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

  constructor(
    scene: Scene,
    readonly id: string,
    start: Vector3,
    end: Vector3,
    readonly material: PBRMaterial,
    options: PhysicalCableOptions = {},
  ) {
    this.radius = options.radius ?? 0.046;
    const particleCount = Math.max(12, options.particleCount ?? 24);
    const leadOut = options.leadOut ?? 0.34;
    const laneOffset = options.laneOffset ?? 0;
    const startGuide = start.add(new Vector3(0, 0, -leadOut));
    const endGuide = end.add(new Vector3(0, 0, -leadOut));

    const positions: Vector3[] = [];
    positions.push(start.clone(), startGuide.clone());
    const freeCount = particleCount - 4;
    for (let index = 1; index <= freeCount; index += 1) {
      const t = index / (freeCount + 1);
      const point = Vector3.Lerp(startGuide, endGuide, t);
      const arch = Math.sin(Math.PI * t);
      // A small initial arch gives the newly connected lead visible momentum;
      // gravity then makes it settle naturally onto the bench and obstacles.
      point.y += arch * 0.42;
      point.z -= arch * (0.34 + Math.abs(laneOffset) * 0.35);
      point.x += Math.sin(Math.PI * 2 * t) * laneOffset * 0.45;
      positions.push(point);
    }
    positions.push(endGuide.clone(), end.clone());

    this.particles = positions.map((position, index) => {
      const pin = index === 0
        ? start.clone()
        : index === 1
          ? startGuide.clone()
          : index === positions.length - 2
            ? endGuide.clone()
            : index === positions.length - 1
              ? end.clone()
              : null;
      return {
        position: position.clone(),
        previous: position.clone(),
        pin,
      };
    });

    this.restLengths = [];
    for (let index = 0; index < this.particles.length - 1; index += 1) {
      this.restLengths.push(Vector3.Distance(
        this.particles[index].position,
        this.particles[index + 1].position,
      ));
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
      const a = this.particles[index];
      const b = this.particles[index + 1];
      const delta = b.position.subtract(a.position);
      const distance = delta.length();
      if (distance < EPSILON) continue;
      const error = (distance - this.restLengths[index]) / distance;

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
    for (let index = 2; index < this.particles.length - 2; index += 1) {
      const particle = this.particles[index];
      const floorHit = clampPointToBench(particle.position, floorY + this.radius);
      let obstacleHit = false;
      for (const collider of colliders) {
        obstacleHit = projectPointOutsideCollider(particle.position, collider, padding) || obstacleHit;
      }
      if (floorHit || obstacleHit) {
        // Remove most penetration velocity so a cable settles instead of buzzing.
        particle.previous.lerpInPlace(particle.position, 0.72);
      }
    }
    this.restorePins();
  }

  solveSelfCollision(): void {
    const minDistance = this.radius * 2.05;
    const minDistanceSquared = minDistance * minDistance;
    for (let aIndex = 2; aIndex < this.particles.length - 2; aIndex += 1) {
      for (let bIndex = aIndex + 3; bIndex < this.particles.length - 2; bIndex += 1) {
        this.separateParticles(
          this.particles[aIndex],
          this.particles[bIndex],
          minDistance,
          minDistanceSquared,
        );
      }
    }
  }

  solveCollisionWith(other: PhysicalCable): void {
    const minDistance = (this.radius + other.radius) * 1.08;
    const minDistanceSquared = minDistance * minDistance;
    for (let aIndex = 2; aIndex < this.particles.length - 2; aIndex += 1) {
      for (let bIndex = 2; bIndex < other.particles.length - 2; bIndex += 1) {
        this.separateParticles(
          this.particles[aIndex],
          other.particles[bIndex],
          minDistance,
          minDistanceSquared,
        );
      }
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
    private readonly colliders: readonly CableCollider[],
    private readonly floorY = 0.045,
  ) {}

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
          cables[first].solveCollisionWith(cables[second]);
        }
      }
    }
  }
}
