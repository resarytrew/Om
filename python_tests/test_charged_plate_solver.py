from __future__ import annotations

import math
import pathlib
import sys
import unittest

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src" / "scientific" / "python"))

from charged_plate_solver import (  # noqa: E402
    analytic_axis_field,
    field_at_points,
    point_charge_far_field,
    solve,
)


class ChargedPlateSolverTests(unittest.TestCase):
    def test_axis_matches_exact_rectangle_solution(self) -> None:
        width = 2.0
        height = 1.2
        sigma = 1e-9
        z = 0.75
        numeric = field_at_points(
            np.array([[0.0, 0.0, z]]),
            width=width,
            height=height,
            sigma=sigma,
            nx=80,
            ny=48,
        )[0]
        exact = analytic_axis_field(width, height, sigma, z)
        relative_error = abs(numeric[2] - exact) / abs(exact)

        self.assertLess(relative_error, 0.003)
        self.assertLess(abs(numeric[0]), abs(exact) * 1e-12)
        self.assertLess(abs(numeric[1]), abs(exact) * 1e-12)

    def test_mesh_refinement_converges_instead_of_rescaling_field(self) -> None:
        kwargs = dict(width=2.0, height=1.2, sigma=1e-9)
        point = np.array([[0.0, 0.0, 0.6]])
        coarse = field_at_points(point, nx=20, ny=12, **kwargs)[0, 2]
        fine = field_at_points(point, nx=80, ny=48, **kwargs)[0, 2]
        exact = analytic_axis_field(kwargs["width"], kwargs["height"], kwargs["sigma"], 0.6)

        self.assertLess(abs(fine - exact), abs(coarse - exact))
        self.assertLess(abs(fine - coarse) / abs(fine), 0.01)

    def test_far_field_tends_to_point_charge(self) -> None:
        width = 2.0
        height = 1.2
        sigma = 1e-9
        z = 40.0
        numeric = field_at_points(
            np.array([[0.0, 0.0, z]]),
            width=width,
            height=height,
            sigma=sigma,
            nx=40,
            ny=24,
        )[0, 2]
        point_charge = point_charge_far_field(width, height, sigma, z)

        self.assertLess(abs(numeric - point_charge) / abs(point_charge), 0.001)

    def test_solve_reports_validation_metrics_and_finite_samples(self) -> None:
        result = solve(
            {
                "width": 2.0,
                "height": 1.2,
                "sigma": 1e-9,
                "nx": 30,
                "ny": 18,
                "probe_z": 0.75,
                "sample_x_count": 9,
                "sample_z_count": 6,
            }
        )

        validation = result["validation"]
        self.assertLess(validation["relative_error"], 0.02)
        self.assertLess(validation["refined_relative_error"], validation["relative_error"])
        self.assertLess(validation["transverse_symmetry_ratio"], 1e-12)
        self.assertLess(validation["far_relative_error"], 0.01)
        self.assertEqual(len(result["samples"]), 54)
        self.assertTrue(all(math.isfinite(sample["magnitude"]) for sample in result["samples"]))
        self.assertTrue(all(math.isfinite(sample["potential"]) for sample in result["samples"]))


if __name__ == "__main__":
    unittest.main()
