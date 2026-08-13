from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial

OUT = Path('public/models/ohm')
OUT.mkdir(parents=True, exist_ok=True)


def material(name: str, rgba: tuple[float, float, float, float], metallic: float, roughness: float) -> PBRMaterial:
    return PBRMaterial(
        name=name,
        baseColorFactor=[int(max(0.0, min(1.0, value)) * 255) for value in rgba],
        metallicFactor=metallic,
        roughnessFactor=roughness,
    )


GRAPHITE = material('graphite', (0.10, 0.11, 0.12, 1.0), 0.08, 0.48)
GRAPHITE_2 = material('graphite-2', (0.16, 0.17, 0.18, 1.0), 0.12, 0.38)
RUBBER = material('rubber', (0.018, 0.02, 0.022, 1.0), 0.0, 0.92)
CREAM = material('cream', (0.76, 0.73, 0.65, 1.0), 0.0, 0.72)


def rounded_rect_points(width: float, height: float, radius: float, segments: int = 10) -> np.ndarray:
    radius = min(radius, width / 2, height / 2)
    points: list[tuple[float, float]] = []
    corners = [
        (width / 2 - radius, height / 2 - radius, 0, math.pi / 2),
        (-width / 2 + radius, height / 2 - radius, math.pi / 2, math.pi),
        (-width / 2 + radius, -height / 2 + radius, math.pi, 3 * math.pi / 2),
        (width / 2 - radius, -height / 2 + radius, 3 * math.pi / 2, 2 * math.pi),
    ]
    for cx, cy, start, end in corners:
        for angle in np.linspace(start, end, segments, endpoint=False):
            points.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    return np.asarray(points, dtype=float)


def bevel_box(width: float, height: float, depth: float, radius: float, bevel: float = 0.06) -> trimesh.Trimesh:
    bevel = min(bevel, depth / 4, width / 10, height / 10)
    sections = [
        (-depth / 2, width - 2 * bevel, height - 2 * bevel, max(radius - bevel * 0.45, 0.01)),
        (-depth / 2 + bevel, width, height, radius),
        (depth / 2 - bevel, width, height, radius),
        (depth / 2, width - 2 * bevel, height - 2 * bevel, max(radius - bevel * 0.45, 0.01)),
    ]
    vertices: list[tuple[float, float, float]] = []
    rings: list[list[int]] = []
    for z, section_width, section_height, section_radius in sections:
        ring: list[int] = []
        for x, y in rounded_rect_points(section_width, section_height, section_radius):
            ring.append(len(vertices))
            vertices.append((x, y, z))
        rings.append(ring)

    faces: list[tuple[int, int, int]] = []
    count = len(rings[0])
    for section in range(len(rings) - 1):
        current = rings[section]
        following = rings[section + 1]
        for index in range(count):
            nxt = (index + 1) % count
            faces.append((current[index], current[nxt], following[nxt]))
            faces.append((current[index], following[nxt], following[index]))

    front_center = len(vertices)
    vertices.append((0, 0, -depth / 2))
    rear_center = len(vertices)
    vertices.append((0, 0, depth / 2))
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((front_center, rings[0][nxt], rings[0][index]))
        faces.append((rear_center, rings[-1][index], rings[-1][nxt]))

    return trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=True)


def add(scene: trimesh.Scene, name: str, mesh: trimesh.Trimesh, mat: PBRMaterial, xyz=(0.0, 0.0, 0.0)) -> None:
    mesh = mesh.copy()
    mesh.visual.material = mat
    mesh.apply_translation(xyz)
    scene.add_geometry(mesh, node_name=name, geom_name=name)


def cylinder(radius: float, height: float, sections: int = 32, axis: str = 'y') -> trimesh.Trimesh:
    mesh = trimesh.creation.cylinder(radius=radius, height=height, sections=sections)
    if axis == 'y':
        mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [1, 0, 0]))
    elif axis == 'x':
        mesh.apply_transform(trimesh.transformations.rotation_matrix(math.pi / 2, [0, 1, 0]))
    return mesh


def build_power_supply() -> None:
    scene = trimesh.Scene()
    add(scene, 'body', bevel_box(2.62, 1.64, 1.46, 0.12, 0.075), GRAPHITE)
    for side in (-1, 1):
        add(scene, f'side-rail-{side}', bevel_box(0.10, 1.48, 1.30, 0.035, 0.025), RUBBER, (side * 1.285, 0, 0.03))
    add(scene, 'top-cap', bevel_box(2.40, 0.10, 1.24, 0.045, 0.02), GRAPHITE_2, (0, 0.77, 0.04))
    for index in range(7):
        vent = trimesh.creation.box(extents=(0.13, 0.025, 0.62))
        add(scene, f'vent-{index}', vent, RUBBER, (-0.84 + index * 0.28, 0.835, 0.12))
    scene.export(OUT / 'power-supply-shell.glb')


def build_meter() -> None:
    scene = trimesh.Scene()
    add(scene, 'body', bevel_box(2.08, 1.78, 0.84, 0.115, 0.065), GRAPHITE)
    add(scene, 'back-cap', bevel_box(1.90, 1.58, 0.10, 0.08, 0.025), GRAPHITE_2, (0, 0, 0.42))
    scene.export(OUT / 'analog-meter-shell.glb')


def build_resistor_base() -> None:
    scene = trimesh.Scene()
    add(scene, 'base', bevel_box(2.72, 0.34, 1.18, 0.09, 0.045), GRAPHITE)
    add(scene, 'deck', bevel_box(2.40, 0.11, 0.88, 0.05, 0.022), CREAM, (0, 0.22, 0.03))
    scene.export(OUT / 'resistor-base.glb')


if __name__ == '__main__':
    build_power_supply()
    build_meter()
    build_resistor_base()
