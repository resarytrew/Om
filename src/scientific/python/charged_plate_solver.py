"""Numerical electric field of a uniformly charged finite rectangular plate.

The plate is centered at the origin in the x-y plane (z = 0).  The numerical
integration deliberately uses cell centres and the physical area element
``dA = dx * dy`` so the result converges under mesh refinement instead of
scaling with the number of integration points.
"""

from __future__ import annotations

import json
import math
from typing import Any

import numpy as np

EPSILON_0 = 8.854_187_812_8e-12
COULOMB_K = 1.0 / (4.0 * math.pi * EPSILON_0)


def _validate_positive(name: str, value: float) -> float:
    value = float(value)
    if not math.isfinite(value) or value <= 0.0:
        raise ValueError(f"{name} must be a positive finite number")
    return value


def _validate_resolution(name: str, value: int) -> int:
    value = int(value)
    if value < 4 or value > 240:
        raise ValueError(f"{name} must be in the range 4..240")
    return value


def _surface_cells(width: float, height: float, nx: int, ny: int) -> tuple[np.ndarray, float]:
    dx = width / nx
    dy = height / ny
    xs = np.linspace(-width / 2.0 + dx / 2.0, width / 2.0 - dx / 2.0, nx)
    ys = np.linspace(-height / 2.0 + dy / 2.0, height / 2.0 - dy / 2.0, ny)
    xx, yy = np.meshgrid(xs, ys, indexing="xy")
    sources = np.column_stack((xx.ravel(), yy.ravel(), np.zeros(xx.size)))
    return sources, dx * dy


def field_at_points(
    points: np.ndarray,
    *,
    width: float,
    height: float,
    sigma: float,
    nx: int,
    ny: int,
    chunk_size: int = 96,
) -> np.ndarray:
    """Return E vectors for M points as an ``(M, 3)`` NumPy array."""

    width = _validate_positive("width", width)
    height = _validate_positive("height", height)
    nx = _validate_resolution("nx", nx)
    ny = _validate_resolution("ny", ny)
    sigma = float(sigma)
    if not math.isfinite(sigma):
        raise ValueError("sigma must be finite")

    probes = np.asarray(points, dtype=float)
    if probes.ndim != 2 or probes.shape[1] != 3:
        raise ValueError("points must have shape (M, 3)")
    if not np.all(np.isfinite(probes)):
        raise ValueError("probe coordinates must be finite")

    sources, d_area = _surface_cells(width, height, nx, ny)
    dq = sigma * d_area
    result = np.empty((len(probes), 3), dtype=float)

    for start in range(0, len(probes), chunk_size):
        batch = probes[start : start + chunk_size]
        displacement = batch[:, None, :] - sources[None, :, :]
        radius_squared = np.einsum("mni,mni->mn", displacement, displacement)
        # Points exactly on a source cell centre are outside the intended
        # observation domain. Masking avoids NaNs while making their direct
        # contribution zero rather than inventing an arbitrary softening term.
        safe_radius_squared = np.where(radius_squared > 1e-24, radius_squared, np.inf)
        inverse_r3 = 1.0 / (safe_radius_squared * np.sqrt(safe_radius_squared))
        result[start : start + len(batch)] = (
            COULOMB_K
            * dq
            * np.einsum("mn,mni->mi", inverse_r3, displacement)
        )

    return result


def potential_at_points(
    points: np.ndarray,
    *,
    width: float,
    height: float,
    sigma: float,
    nx: int,
    ny: int,
    chunk_size: int = 128,
) -> np.ndarray:
    """Return electric potential V with zero at infinity."""

    probes = np.asarray(points, dtype=float)
    sources, d_area = _surface_cells(
        _validate_positive("width", width),
        _validate_positive("height", height),
        _validate_resolution("nx", nx),
        _validate_resolution("ny", ny),
    )
    sigma = float(sigma)
    if not math.isfinite(sigma):
        raise ValueError("sigma must be finite")
    dq = sigma * d_area
    result = np.empty(len(probes), dtype=float)

    for start in range(0, len(probes), chunk_size):
        batch = probes[start : start + chunk_size]
        displacement = batch[:, None, :] - sources[None, :, :]
        radii = np.linalg.norm(displacement, axis=2)
        safe_radii = np.where(radii > 1e-12, radii, np.inf)
        result[start : start + len(batch)] = COULOMB_K * dq * np.sum(1.0 / safe_radii, axis=1)

    return result


def analytic_axis_field(width: float, height: float, sigma: float, z: float) -> float:
    """Exact normal field on the symmetry axis of a finite rectangle.

    Uses the solid-angle result for half-sides a and b:

        E_z = sigma/(pi*eps0) * atan(a*b / (z*sqrt(z^2+a^2+b^2)))

    for z > 0.  The sign reverses below the plate.
    """

    width = _validate_positive("width", width)
    height = _validate_positive("height", height)
    sigma = float(sigma)
    z = float(z)
    if not math.isfinite(sigma) or not math.isfinite(z):
        raise ValueError("sigma and z must be finite")
    if z == 0.0:
        return math.copysign(abs(sigma) / (2.0 * EPSILON_0), sigma)

    a = width / 2.0
    b = height / 2.0
    magnitude = (sigma / (math.pi * EPSILON_0)) * math.atan(
        (a * b) / (abs(z) * math.sqrt(z * z + a * a + b * b))
    )
    return math.copysign(abs(magnitude), sigma * z)


def point_charge_far_field(width: float, height: float, sigma: float, z: float) -> float:
    total_charge = float(sigma) * float(width) * float(height)
    return COULOMB_K * total_charge / (float(z) ** 2)


def _axis_numeric(width: float, height: float, sigma: float, nx: int, ny: int, z: float) -> np.ndarray:
    return field_at_points(
        np.array([[0.0, 0.0, z]], dtype=float),
        width=width,
        height=height,
        sigma=sigma,
        nx=nx,
        ny=ny,
    )[0]


def solve(parameters: dict[str, Any]) -> dict[str, Any]:
    width = _validate_positive("width", parameters.get("width", 2.0))
    height = _validate_positive("height", parameters.get("height", 1.2))
    sigma = float(parameters.get("sigma", 1e-9))
    if not math.isfinite(sigma):
        raise ValueError("sigma must be finite")
    nx = _validate_resolution("nx", parameters.get("nx", 36))
    ny = _validate_resolution("ny", parameters.get("ny", 24))
    probe_z = _validate_positive("probe_z", parameters.get("probe_z", 0.75))
    sample_x_count = max(5, min(31, int(parameters.get("sample_x_count", 15))))
    sample_z_count = max(4, min(25, int(parameters.get("sample_z_count", 9))))
    sample_z_min = _validate_positive("sample_z_min", parameters.get("sample_z_min", 0.15))
    sample_z_max = _validate_positive("sample_z_max", parameters.get("sample_z_max", 2.5))
    if sample_z_max <= sample_z_min:
        raise ValueError("sample_z_max must be greater than sample_z_min")

    x_extent = max(width * 0.9, 1.2)
    sample_x = np.linspace(-x_extent, x_extent, sample_x_count)
    sample_z = np.linspace(sample_z_min, sample_z_max, sample_z_count)
    xx, zz = np.meshgrid(sample_x, sample_z, indexing="xy")
    probes = np.column_stack((xx.ravel(), np.zeros(xx.size), zz.ravel()))

    vectors = field_at_points(
        probes,
        width=width,
        height=height,
        sigma=sigma,
        nx=nx,
        ny=ny,
    )
    potentials = potential_at_points(
        probes,
        width=width,
        height=height,
        sigma=sigma,
        nx=nx,
        ny=ny,
    )
    magnitudes = np.linalg.norm(vectors, axis=1)

    axis = _axis_numeric(width, height, sigma, nx, ny, probe_z)
    refined = _axis_numeric(width, height, sigma, min(nx * 2, 240), min(ny * 2, 240), probe_z)
    analytic = analytic_axis_field(width, height, sigma, probe_z)
    analytic_scale = max(abs(analytic), 1e-30)
    relative_error = abs(axis[2] - analytic) / analytic_scale
    refined_relative_error = abs(refined[2] - analytic) / analytic_scale
    convergence_delta = abs(refined[2] - axis[2]) / max(abs(refined[2]), 1e-30)
    transverse_ratio = math.hypot(float(axis[0]), float(axis[1])) / max(abs(float(axis[2])), 1e-30)

    far_z = max(width, height) * 20.0
    far_numeric = float(_axis_numeric(width, height, sigma, nx, ny, far_z)[2])
    far_point = point_charge_far_field(width, height, sigma, far_z)
    far_relative_error = abs(far_numeric - far_point) / max(abs(far_point), 1e-30)

    samples = [
        {
            "x": float(point[0]),
            "y": float(point[1]),
            "z": float(point[2]),
            "ex": float(field[0]),
            "ey": float(field[1]),
            "ez": float(field[2]),
            "magnitude": float(magnitude),
            "potential": float(potential),
        }
        for point, field, magnitude, potential in zip(probes, vectors, magnitudes, potentials, strict=True)
    ]

    return {
        "parameters": {
            "width": width,
            "height": height,
            "sigma": sigma,
            "nx": nx,
            "ny": ny,
            "probe_z": probe_z,
        },
        "samples": samples,
        "probe": {
            "x": 0.0,
            "y": 0.0,
            "z": probe_z,
            "ex": float(axis[0]),
            "ey": float(axis[1]),
            "ez": float(axis[2]),
            "magnitude": float(np.linalg.norm(axis)),
        },
        "validation": {
            "axis_analytic_ez": float(analytic),
            "axis_numeric_ez": float(axis[2]),
            "axis_refined_ez": float(refined[2]),
            "relative_error": float(relative_error),
            "refined_relative_error": float(refined_relative_error),
            "convergence_delta": float(convergence_delta),
            "transverse_symmetry_ratio": float(transverse_ratio),
            "far_z": float(far_z),
            "far_numeric_ez": float(far_numeric),
            "far_point_charge_ez": float(far_point),
            "far_relative_error": float(far_relative_error),
        },
    }


def solve_json(parameters_json: str) -> str:
    return json.dumps(solve(json.loads(parameters_json)), ensure_ascii=False, allow_nan=False)
