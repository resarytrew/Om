# PHYSICS://LAB

**Programmable Virtual Physics Laboratory** — программируемая виртуальная физическая лаборатория.

Работающие vertical slices:

- **Закон Ома** — ручная 3D-сборка цепи + Blocks + Python.
- **Поле заряженной пластины** — проверяемый Python/NumPy Scientific Core + Babylon-визуализация.

## Что уже реализовано

- Vite + strict TypeScript.
- Babylon.js как отдельный 3D rendering layer.
- Physics Core с сущностями `Component`, `Terminal`, `Connection`, `Circuit`.
- Анализ фактической топологии цепи вместо заранее запрограммированной анимации.
- Источник, резистор, амперметр и вольтметр как независимые физические компоненты.
- Интерактивные 3D-клеммы и редактор проводов: live preview, snapping, выбор и Delete.
- Обнаружение разомкнутой цепи и короткого замыкания.
- Расчёт тока, мощности и показаний приборов.
- MeasurementStore, таблица измерений и график I(U), строящийся только из реально зафиксированных измерений.
- **Manual mode** — прямое управление одной и той же физической установкой.
- **Blocks mode** — Blockly 13 с собственными физическими блоками.
- **Experiment AST** — нейтральное представление алгоритма между Blocks, runtime и Python.
- Подсветка выполняемого визуального блока, Stop/Reset и журнал выполнения.
- Live preview Python-кода, полученного из AST.
- Переход **Blocks → Python** без создания второй лаборатории.
- **Python mode:** настоящий CPython/Pyodide в Web Worker.
- **Monaco Editor** с Python syntax highlighting.
- Ученический API `source / resistor / ammeter / voltmeter / experiment`.
- Python-скрипт может менять параметры, снимать показания, записывать измерения и строить экспериментальную серию на той же лаборатории.
- **Scientific Python Core:** отдельный доверенный Pyodide Worker для численных моделей.
- NumPy solver поля конечной равномерно заряженной прямоугольной пластины.
- Векторное поле и потенциал с правильным `dA = dx·dy`.
- Автоматические проверки: аналитическое решение на оси, mesh convergence, симметрия, far-field point-charge limit.
- Python/NumPy unit tests scientific solver в GitHub Actions.
- Pages deploy блокируется, если падают TypeScript или scientific Python tests.

## Локальный запуск

```bash
npm install
npm run dev
```

Проверка TypeScript-ядра:

```bash
npm test
npm run build
```

Проверка Scientific Python Core:

```bash
python -m pip install "numpy>=2,<3"
python -m unittest discover -s python_tests -p "test_*.py" -v
```

## Закон Ома / Manual

1. Кликните по первой клемме — появляется live preview провода.
2. Наведите на вторую клемму — зелёная подсветка означает snap.
3. Кликните по ней — создаётся реальный `Connection`.
4. Соберите последовательную цепь `источник → резистор → амперметр → источник`.
5. Вольтметр подключите параллельно резистору.
6. Выберите существующий провод и нажмите Delete/Backspace, чтобы удалить его; Esc отменяет выбор.
7. Изменяйте U и R и фиксируйте измерения.

Для проверки архитектуры есть кнопка **«Собрать эталонную цепь»**.

## Blocks

Переключитесь на **Blocks**. По умолчанию загружается алгоритм:

```text
когда эксперимент запущен
  собрать стандартную цепь
  очистить измерения
  установить R = 3 Ω
  изменять U от 2 до 12 В с шагом 2 В
    измерить силу тока
    записать измерение
  построить I(U)
```

Blockly workspace компилируется в `Experiment AST`; AST исполняется через тот же `SimulationRuntime`, который обслуживает ручной режим. Python-представление текущего алгоритма генерируется отдельно из AST.

Подробнее: [EXPERIMENT_AST.md](EXPERIMENT_AST.md).

## Python

Переключитесь на вкладку **Python**. Pyodide загружается только при первом открытии режима.

```python
from physics_lab import *
import numpy as np

experiment.connect_standard()
experiment.clear_measurements()
resistor.resistance = 3

for voltage in np.arange(2, 12.1, 2):
    source.voltage = float(voltage)
    wait(0.15)
    current = ammeter.read()
    experiment.record()

experiment.plot("U", "I")
```

Подробнее: [PYTHON_RUNTIME.md](PYTHON_RUNTIME.md).

## Поля / Scientific Core

Раздел **«Поля»** рассчитывает электрическое поле конечной прямоугольной пластины Python/NumPy-кодом из репозитория. Можно менять:

- ширину и высоту пластины;
- поверхностную плотность заряда `σ`;
- разрешение сетки интегрирования;
- высоту датчика над центром.

Babylon.js визуализирует полученный массив векторов `E`, но не рассчитывает поле самостоятельно.

Каждый solve дополнительно сравнивается с:

- точным аналитическим полем конечного прямоугольника на оси;
- результатом на удвоенной сетке;
- условием симметрии `Ex = Ey = 0` на оси;
- точечным зарядом в дальнем пределе.

Подробнее: [SCIENTIFIC_CORE.md](SCIENTIFIC_CORE.md).

## Следующие этапы

1. Rive adapter для приборных интерфейсов и motion feedback.
2. GLB asset adapter и замена Babylon primitives на качественные модели без изменения Physics Core.
3. Интерактивный probe и карты потенциала/модуля поля.
4. Диск/эллипс как второй численный surface solver и сравнение с аналитическими случаями.
5. Расширение Experiment AST: условия, датчики, переменные и пользовательские функции.

Архитектура: [ARCHITECTURE.md](ARCHITECTURE.md).
