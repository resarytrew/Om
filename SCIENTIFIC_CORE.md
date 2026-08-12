# Scientific Python Core

PHYSICS://LAB separates two Python roles:

1. **Student Python Runtime** — programmable experiment control (`source`, `ammeter`, `experiment`, etc.).
2. **Scientific Python Core** — trusted numerical models implemented in repository-owned Python and tested independently.

The charged-plate experiment is the first Scientific Core vertical slice.

## Charged rectangular plate

The plate is centered in the `x-y` plane at `z = 0`, with uniform surface charge density `sigma`.

The numerical model partitions the physical surface into rectangular cells and uses their centres as quadrature points:

```text
dx = width / nx
dy = height / ny
dA = dx * dy
dq = sigma * dA
```

For every observation point the solver sums

```text
dE = k * dq * r / |r|^3
```

The `dA` factor is essential. Without it, the absolute field grows with the number of integration points and mesh refinement does not converge to a physical integral.

Implementation: `src/scientific/python/charged_plate_solver.py`.

## Browser boundary

```text
UI parameters
    ↓
ScientificFieldClient
    ↓ postMessage
scientific-field.worker.ts
    ↓
Pyodide + NumPy
    ↓
charged_plate_solver.py
    ↓
{x,y,z,Ex,Ey,Ez,|E|,V} samples
    ↓
Babylon ElectricFieldScene
```

Babylon.js does not calculate electrostatics. It only renders the returned numerical state.

## Independent validation

Every solve reports four diagnostics.

### 1. Exact axis solution

For half-sides `a = width/2`, `b = height/2`, the exact normal field on the symmetry axis is obtained from the rectangle's solid angle:

```text
Ez = sigma/(pi*epsilon0) * atan(
    a*b / (z * sqrt(z^2 + a^2 + b^2))
)
```

The numerical field is compared with this value at the probe position.

### 2. Mesh convergence

The axis field is solved on the requested `nx × ny` grid and again on a refined `2nx × 2ny` grid (capped for browser safety). The relative change is reported as `convergence_delta`.

### 3. Symmetry

At the centre axis of a centred uniformly charged rectangle, transverse components must cancel. The solver reports

```text
sqrt(Ex^2 + Ey^2) / |Ez|
```

which should be approximately zero.

### 4. Far-field limit

At a distance much larger than the plate dimensions, the finite charged plate must approach a point charge with

```text
Q = sigma * width * height
E = kQ / z^2
```

The solver compares its far-axis value with that limit.

## CI

`python_tests/test_charged_plate_solver.py` runs the same repository Python code under CPython + NumPy in GitHub Actions. The tests check:

- agreement with the exact rectangle solution;
- improved accuracy under mesh refinement;
- far-field point-charge behaviour;
- symmetry and finite output values.

GitHub Pages deployment is gated on both TypeScript tests and Scientific Core Python tests.

## Next numerical models

The same boundary can support:

- disk / ellipse surface integration;
- arbitrary point-charge systems;
- electric potential maps;
- magnetic fields;
- ODE-based mechanics;
- oscillations and waves;
- heat transfer;
- numerical convergence experiments.
