export const DEFAULT_PYTHON_PROGRAM = `from physics_lab import *
import numpy as np

# Собираем стандартную измерительную цепь.
experiment.connect_standard()
experiment.clear_measurements()
resistor.resistance = 3

# Автоматически снимаем вольт-амперную характеристику.
for voltage in np.arange(2, 12.1, 2):
    source.voltage = float(voltage)
    wait(0.15)

    current = ammeter.read()
    experiment.record()
    print(f"U={voltage:4.1f} V   I={current:.3f} A")

experiment.plot("U", "I")
`;
