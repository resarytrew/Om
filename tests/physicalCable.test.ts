import { describe, expect, it } from 'vitest';
import { Vector3 } from '@babylonjs/core';
import {
  clampPointToBench,
  projectPointOutsideCollider,
  type CableCollider,
} from '../src/rendering/babylon/PhysicalCable';

const collider: CableCollider = {
  min: new Vector3(-1, 0, -1),
  max: new Vector3(1, 2, 1),
};

describe('physical cable collision helpers', () => {
  it('projects a cable point out of an instrument body', () => {
    const point = new Vector3(0, 1, -0.95);
    const hit = projectPointOutsideCollider(point, collider, 0.1);
    expect(hit).toBe(true);
    expect(point.z).toBeLessThan(-1.09);
  });

  it('does not move a point already outside an instrument', () => {
    const point = new Vector3(2, 1, 0);
    const before = point.clone();
    const hit = projectPointOutsideCollider(point, collider, 0.1);
    expect(hit).toBe(false);
    expect(point.equals(before)).toBe(true);
  });

  it('keeps cable particles above the laboratory bench', () => {
    const point = new Vector3(0, -0.4, 0);
    const hit = clampPointToBench(point, 0.09);
    expect(hit).toBe(true);
    expect(point.y).toBeCloseTo(0.09);
  });

  it('leaves particles above the floor untouched', () => {
    const point = new Vector3(0, 0.4, 0);
    const hit = clampPointToBench(point, 0.09);
    expect(hit).toBe(false);
    expect(point.y).toBeCloseTo(0.4);
  });
});
