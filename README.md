# PHYSICS://LAB

**Programmable Virtual Physics Laboratory** — программируемая виртуальная физическая лаборатория.

Текущий vertical slice: **закон Ома для участка цепи**.

## Что уже реализовано

- Vite + strict TypeScript.
- Babylon.js как отдельный 3D rendering layer.
- Physics Core с сущностями `Component`, `Terminal`, `Connection`, `Circuit`.
- Анализ фактической топологии цепи вместо заранее запрограммированной анимации.
- Источник, резистор, амперметр и вольтметр как независимые физические компоненты.
- Интерактивные 3D-клеммы: клик по двум клеммам создаёт провод и новое соединение в модели.
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
- NumPy/SciPy подгружаются лениво для научных вычислений.
- Unit tests Physics Core, Python replay и Experiment AST.

## Локальный запуск

```bash
npm install
npm run dev
```

Проверка:

```bash
npm test
npm run build
```

## Manual

1. Кликните по первой клемме в 3D-сцене.
2. Кликните по второй клемме — будет создан провод.
3. Соберите последовательную цепь `источник → резистор → амперметр → источник`.
4. Вольтметр подключите параллельно резистору.
5. Изменяйте U и R.
6. Нажимайте «Зафиксировать измерение» — точки появятся на графике.

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

Blockly workspace компилируется в `Experiment AST`; AST исполняется через тот же `SimulationRuntime`, который обслуживает ручной режим. Справа снизу показывается Python-представление текущего алгоритма. Кнопка **«Открыть как Python»** переносит этот код в Monaco/Pyodide.

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
    print(f"U={voltage:.1f} V  I={current:.3f} A")

experiment.plot("U", "I")
```

Код выполняется Python-движком в Web Worker. Команды затем проходят через тот же `SimulationRuntime`, поэтому 3D-сцена, измерения и график остаются единым состоянием.

Подробнее: [PYTHON_RUNTIME.md](PYTHON_RUNTIME.md).

## Следующие этапы

1. Rive adapter для приборных интерфейсов и motion feedback.
2. Улучшенный редактор 3D-проводов: live preview, snapping, удаление выбранного провода.
3. Замена Babylon primitives на качественные GLB-модели без изменения Physics Core.
4. Обобщённый Python scientific solver для полей, численного интегрирования и более сложных экспериментов.
5. Расширение Experiment AST: условия, измерительные датчики, переменные и пользовательские функции.

Архитектура: [ARCHITECTURE.md](ARCHITECTURE.md).
