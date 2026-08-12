# PHYSICS://LAB

**Programmable Virtual Physics Laboratory** — архитектурный фундамент программируемой виртуальной физической лаборатории.

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
- **Python mode:** настоящий CPython/Pyodide в Web Worker.
- **Monaco Editor** с Python syntax highlighting.
- Ученический API `source / resistor / ammeter / voltmeter / experiment`.
- Python-скрипт может менять параметры, снимать показания, записывать измерения и строить экспериментальную серию на той же лаборатории.
- NumPy/SciPy подгружаются лениво для научных вычислений.
- Unit tests Physics Core и Python event replay.

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

## Python

Переключитесь на вкладку **Python**. Pyodide загружается только при первом открытии режима.

Пример:

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

Код действительно выполняется Python-движком в Web Worker. Команды затем проходят через тот же `SimulationRuntime`, который используется ручным режимом, поэтому 3D-сцена, измерения и график обновляются из общего состояния.

Подробнее: [PYTHON_RUNTIME.md](PYTHON_RUNTIME.md).

## Следующие этапы

1. Experiment AST и Blockly runtime.
2. Преобразование Blocks → AST → Python.
3. Rive adapter для приборных интерфейсов и motion feedback.
4. Улучшенный редактор 3D-проводов: live preview, snapping, удаление выбранного провода.
5. Замена Babylon primitives на качественные GLB-модели без изменения Physics Core.
6. Обобщённый Python scientific solver для полей, численного интегрирования и более сложных экспериментов.

Архитектура: [ARCHITECTURE.md](ARCHITECTURE.md).
