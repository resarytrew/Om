import { readFileSync, writeFileSync } from 'node:fs';

const physicalPath = 'src/rendering/babylon/PhysicalCable.ts';
let text = readFileSync(physicalPath, 'utf8');

text = text.replace(
`export interface PhysicalCableOptions {
  readonly radius?: number;
  readonly particleCount?: number;
  readonly laneOffset?: number;
  readonly leadOut?: number;
}`,
`export interface PhysicalCableOptions {
  readonly radius?: number;
  readonly particleCount?: number;
  readonly laneOffset?: number;
  readonly leadOut?: number;
  readonly floorY?: number;
  readonly frontClearance?: number;
}`,
);

const constructorStart = `    this.radius = options.radius ?? 0.046;
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
    });`;

const constructorReplacement = `    this.radius = options.radius ?? 0.046;
    const particleCount = Math.max(20, options.particleCount ?? 28);
    const leadOut = options.leadOut ?? 0.34;
    const laneOffset = options.laneOffset ?? 0;
    const floorY = options.floorY ?? 0.045;
    const cableY = floorY + this.radius * 1.22;
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
    });`;

if (!text.includes(constructorStart)) throw new Error('PhysicalCable constructor fragment not found');
text = text.replace(constructorStart, constructorReplacement);

const environmentStart = `    for (let index = 2; index < this.particles.length - 2; index += 1) {
      const particle = this.particles[index]!;
      const floorHit = clampPointToBench(particle.position, floorY + this.radius);`;
const environmentReplacement = `    for (const particle of this.particles) {
      if (particle.pin) continue;
      const floorHit = clampPointToBench(particle.position, floorY + this.radius);`;
if (!text.includes(environmentStart)) throw new Error('environment loop fragment not found');
text = text.replace(environmentStart, environmentReplacement);

const selfStart = `    for (let aIndex = 2; aIndex < this.particles.length - 2; aIndex += 1) {
      for (let bIndex = aIndex + 3; bIndex < this.particles.length - 2; bIndex += 1) {`;
const selfReplacement = `    for (let aIndex = 0; aIndex < this.particles.length; aIndex += 1) {
      for (let bIndex = aIndex + 3; bIndex < this.particles.length; bIndex += 1) {`;
if (!text.includes(selfStart)) throw new Error('self-collision loop fragment not found');
text = text.replace(selfStart, selfReplacement);

const crossStart = `    for (let aIndex = 2; aIndex < this.particles.length - 2; aIndex += 1) {
      for (let bIndex = 2; bIndex < other.particles.length - 2; bIndex += 1) {`;
const crossReplacement = `    for (let aIndex = 0; aIndex < this.particles.length; aIndex += 1) {
      for (let bIndex = 0; bIndex < other.particles.length; bIndex += 1) {`;
if (!text.includes(crossStart)) throw new Error('cross-collision loop fragment not found');
text = text.replace(crossStart, crossReplacement);

writeFileSync(physicalPath, text);

const scenePath = 'src/rendering/babylon/LabScene.ts';
let scene = readFileSync(scenePath, 'utf8');
const optionsStart = `          radius: 0.046,
          particleCount: 24,
          laneOffset: this.wireLane(connection.id),
          leadOut: 0.34,`;
const optionsReplacement = `          radius: 0.046,
          particleCount: 28,
          laneOffset: this.wireLane(connection.id),
          leadOut: 0.34,
          floorY: 0.045,`;
if (!scene.includes(optionsStart)) throw new Error('LabScene cable options fragment not found');
scene = scene.replace(optionsStart, optionsReplacement);
writeFileSync(scenePath, scene);
