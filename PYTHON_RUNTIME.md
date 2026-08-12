# Python Runtime

Python mode is a real CPython/Pyodide runtime running in a module Web Worker.

## Boundary

```text
Monaco Editor
    ↓
PythonRuntimeClient
    ↓ postMessage
Pyodide Web Worker
    ↓
student Python program
    ↓
physics_lab API / event plan
    ↓
replayPythonEvents
    ↓
SimulationRuntime
    ↓
Physics Core → Babylon / MeasurementStore / Graph
```

The browser UI never evaluates Python on the main thread.

The worker produces typed laboratory events (`set-voltage`, `set-resistance`, `record`, `wait`, etc.). Those events are replayed through the same `SimulationRuntime` used by Manual mode. Therefore Babylon, diagnostics, table and graph continue to read one shared application state.

## Current limitation

The first Python bridge keeps a lightweight mirror of the Ohm experiment inside the worker so that synchronous-looking calls such as `ammeter.read()` can be used naturally in student Python code. The main laboratory remains authoritative during event replay.

A future solver boundary will accept a serialized circuit topology and let the Python scientific core solve arbitrary experiments instead of the current Ohm-specific mirror.

## Student API

```python
from physics_lab import *

experiment.connect_standard()
resistor.resistance = 3
source.voltage = 6

current = ammeter.read()
experiment.record()
experiment.plot("U", "I")
```

`wait(seconds)` schedules visual pacing during replay; it does not block the Web Worker with a sleep call.

## Packages

NumPy and SciPy are loaded lazily when imports are detected in the student program.

## Safety

Pyodide isolates execution from the host operating system, but this browser runtime is not a hardened hostile-code sandbox. Do not treat it as a multi-tenant security boundary.
