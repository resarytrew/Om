# 3D Asset Guide

GLB-модель — визуальный адаптер, а не физический компонент.

Предпочтительная структура амперметра:

```text
Ammeter
├─ Body
├─ Display
├─ Needle (optional)
├─ TerminalPlus
└─ TerminalMinus
```

Для каждого ассета должен существовать mapping:

- logical component id;
- terminal node names;
- animated/display node names;
- scale/orientation transform.

Если GLB объединяет корпус, стрелку и клеммы в один mesh, он считается неудобным для интерактивной лаборатории и требует подготовки ассета.
