import { loadPyodide, version } from 'pyodide';
import type {
  PythonInitialState,
  PythonRunResult,
  PythonWorkerRequest,
  PythonWorkerResponse,
} from '../programming/python/protocol';

const PYODIDE_INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${version}/full/`;

const PRELUDE = String.raw`
import builtins
import json
import math
import sys
import types

_lab_initial = json.loads(__lab_initial_json)
_lab_events = []
_lab_stdout = []
_lab_state = {
    "voltage": float(_lab_initial["voltage"]),
    "resistance": float(_lab_initial["resistance"]),
    "circuit_status": str(_lab_initial["circuitStatus"]),
    "series_offset": float(_lab_initial["seriesResistanceOffset"]),
    "ammeter_range": float(_lab_initial["ammeterRange"]),
    "current": 0.0,
    "power": 0.0,
}

if not hasattr(builtins, "__physics_lab_original_print__"):
    builtins.__physics_lab_original_print__ = builtins.print


def _lab_print(*args, sep=" ", end="\n", **_kwargs):
    text = sep.join(str(arg) for arg in args)
    if end and end != "\n":
        text += end
    _lab_stdout.append(text)


builtins.print = _lab_print


def _emit(event_type, **payload):
    _lab_events.append({"type": event_type, **payload})


def _recalculate():
    voltage = _lab_state["voltage"]
    resistance = _lab_state["resistance"]
    status = _lab_state["circuit_status"]

    if voltage == 0 or status == "open" or status == "invalid":
        current = 0.0
    elif status == "short-circuit":
        current = math.inf
    else:
        total = max(resistance + _lab_state["series_offset"], 1e-12)
        current = voltage / total

    _lab_state["current"] = current
    _lab_state["power"] = voltage * current if math.isfinite(current) else math.inf
    return current


_recalculate()


class _Source:
    @property
    def voltage(self):
        return _lab_state["voltage"]

    @voltage.setter
    def voltage(self, value):
        self.set_voltage(value)

    def set_voltage(self, value):
        numeric = min(12.0, max(0.0, float(value)))
        _lab_state["voltage"] = numeric
        _recalculate()
        _emit("set-voltage", value=numeric)
        return numeric


class _Resistor:
    @property
    def resistance(self):
        return _lab_state["resistance"]

    @resistance.setter
    def resistance(self, value):
        self.set_resistance(value)

    def set_resistance(self, value):
        numeric = min(20.0, max(0.5, float(value)))
        _lab_state["resistance"] = numeric
        _recalculate()
        _emit("set-resistance", value=numeric)
        return numeric


class _Ammeter:
    def read(self):
        current = _recalculate()
        if not math.isfinite(current):
            raise RuntimeError("Ammeter overload: short circuit detected")
        return current

    read_current = read

    @property
    def current(self):
        return self.read()


class _Voltmeter:
    def read(self):
        current = _recalculate()
        if not math.isfinite(current) or _lab_state["circuit_status"] != "closed":
            return 0.0
        return current * _lab_state["resistance"]

    read_voltage = read


class _Experiment:
    def connect_standard(self):
        _lab_state["circuit_status"] = "closed"
        _recalculate()
        _emit("connect-standard")

    def clear_measurements(self):
        _emit("clear-measurements")

    def record(self):
        current = _recalculate()
        if not math.isfinite(current):
            raise RuntimeError("Cannot record an infinite current")
        _emit(
            "record",
            voltage=float(_lab_state["voltage"]),
            current=float(current),
            resistance=float(_lab_state["resistance"]),
            power=float(_lab_state["power"]),
        )
        return {
            "U": float(_lab_state["voltage"]),
            "I": float(current),
            "R": float(_lab_state["resistance"]),
            "P": float(_lab_state["power"]),
        }

    def plot(self, x="U", y="I"):
        _emit("plot", x=str(x), y=str(y))


source = _Source()
resistor = _Resistor()
ammeter = _Ammeter()
voltmeter = _Voltmeter()
experiment = _Experiment()


def wait(seconds):
    numeric = min(2.0, max(0.0, float(seconds)))
    _emit("wait", seconds=numeric)


physics_lab = types.ModuleType("physics_lab")
for _name in (
    "source",
    "resistor",
    "ammeter",
    "voltmeter",
    "experiment",
    "wait",
):
    setattr(physics_lab, _name, globals()[_name])
physics_lab.__all__ = [
    "source",
    "resistor",
    "ammeter",
    "voltmeter",
    "experiment",
    "wait",
]
sys.modules["physics_lab"] = physics_lab
`;

const RESULT_EXPRESSION = String.raw`
import json
import math


def _finite_or_none(value):
    return float(value) if math.isfinite(value) else None


json.dumps(
    {
        "events": _lab_events,
        "stdout": _lab_stdout,
        "finalState": {
            "voltage": float(_lab_state["voltage"]),
            "resistance": float(_lab_state["resistance"]),
            "current": _finite_or_none(_lab_state["current"]),
            "power": _finite_or_none(_lab_state["power"]),
            "circuitStatus": str(_lab_state["circuit_status"]),
        },
    },
    ensure_ascii=False,
    allow_nan=False,
)
`;

interface WorkerScope {
  postMessage(message: PythonWorkerResponse): void;
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<PythonWorkerRequest>) => void,
  ): void;
}

const scope = self as unknown as WorkerScope;
let runtimePromise: ReturnType<typeof loadPyodide> | null = null;

function getRuntime(): ReturnType<typeof loadPyodide> {
  runtimePromise ??= loadPyodide({ indexURL: PYODIDE_INDEX_URL });
  return runtimePromise;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function preparePackages(code: string): Promise<void> {
  const runtime = await getRuntime();
  const packages: string[] = [];
  if (/\b(?:import\s+numpy|from\s+numpy\b)/.test(code)) packages.push('numpy');
  if (/\b(?:import\s+scipy|from\s+scipy\b)/.test(code)) packages.push('scipy');
  for (const packageName of packages) {
    await runtime.loadPackage(packageName);
  }
}

async function execute(code: string, initial: PythonInitialState): Promise<PythonRunResult> {
  const runtime = await getRuntime();
  runtime.globals.set('__lab_initial_json', JSON.stringify(initial));
  await runtime.runPythonAsync(PRELUDE);
  await preparePackages(code);

  try {
    await runtime.runPythonAsync(code);
    const serialized = await runtime.runPythonAsync(RESULT_EXPRESSION);
    if (typeof serialized !== 'string') throw new Error('Python runtime returned a non-serializable result.');
    return JSON.parse(serialized) as PythonRunResult;
  } finally {
    await runtime.runPythonAsync(
      'import builtins; builtins.print = builtins.__physics_lab_original_print__',
    );
  }
}

scope.addEventListener('message', (event) => {
  const request = event.data;
  void (async () => {
    try {
      if (request.type === 'init') {
        await getRuntime();
        scope.postMessage({ type: 'ready', id: request.id, version });
        return;
      }

      const result = await execute(request.code, request.initial);
      scope.postMessage({ type: 'run-result', id: request.id, result });
    } catch (error) {
      scope.postMessage({ type: 'error', id: request.id, error: errorMessage(error) });
    }
  })();
});
