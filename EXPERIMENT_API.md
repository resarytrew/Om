# Experiment API

Ученический код не должен сам вычислять физику.

Правильный будущий API:

```python
source.set_voltage(6)
resistor.set_resistance(3)
current = ammeter.read()
experiment.record()
```

TypeScript boundary уже существует в `src/programming/experimentApi.ts`.

Следующий этап — предоставить тот же API Blockly runtime и Python runtime через Pyodide.
