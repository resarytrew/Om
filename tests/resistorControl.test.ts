import { describe, expect, it } from 'vitest';
import { connectStandardCircuit, createOhmsLawRuntime, ids } from '../src/experiments/ohms-law/createOhmsLaw';

describe('interactive resistor', () => {
  it('changes the real resistor and immediately changes circuit current', () => {
    const runtime = createOhmsLawRuntime();
    connectStandardCircuit(runtime);
    runtime.setVoltage(6);
    runtime.setResistance(3);
    expect(runtime.getState().result.current).toBeCloseTo(2, 8);

    runtime.setResistance(6);
    expect(runtime.getState().result.current).toBeCloseTo(1, 8);
    const resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);
    expect(resistor?.kind).toBe('resistor');
    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(6);
  });

  it('clamps resistance to the physical control range', () => {
    const runtime = createOhmsLawRuntime();
    runtime.setResistance(0);
    let resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);
    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(0.5);

    runtime.setResistance(50);
    resistor = runtime.circuit.snapshot().components.find((component) => component.id === ids.resistor);
    if (resistor?.kind === 'resistor') expect(resistor.resistance).toBe(20);
  });
});
