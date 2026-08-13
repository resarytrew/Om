from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)


path = Path('src/rendering/babylon/LabScene.ts')
text = path.read_text()

text = replace_once(text, "import { ids } from '../../experiments/ohms-law/createOhmsLaw';\n", "import { ids } from '../../experiments/ohms-law/createOhmsLaw';\nimport { CircuitKeyVisual } from './CircuitKeyVisual';\nimport { CompactResistorVisual } from './CompactResistorVisual';\nimport { LampVisual } from './LampVisual';\n", 'expanded visual imports')

text = replace_once(text, "  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance';\n", "  readonly instrumentControl?: 'source-voltage' | 'source-output' | 'resistor-resistance' | 'switch-toggle';\n", 'switch metadata')

text = replace_once(text, "  private resistor!: ResistorModuleVisual;\n  private ammeter!: AnalogMeterVisual;\n", "  private resistor!: ResistorModuleVisual;\n  private resistor2!: CompactResistorVisual;\n  private resistor3!: CompactResistorVisual;\n  private resistor4!: CompactResistorVisual;\n  private circuitSwitch!: CircuitKeyVisual;\n  private lamp!: LampVisual;\n  private ammeter!: AnalogMeterVisual;\n", 'extra visual fields')

text = replace_once(text, "      11.05,\n      new Vector3(0.05, 0.68, 0.48),\n", "      13.2,\n      new Vector3(0.05, 0.68, 0.42),\n", 'camera radius')
text = replace_once(text, "    this.camera.lowerRadiusLimit = 5.4;\n    this.camera.upperRadiusLimit = 16.5;\n", "    this.camera.lowerRadiusLimit = 6.2;\n    this.camera.upperRadiusLimit = 21;\n", 'camera limits')

text = replace_once(text, "      { width: 11.55, height: 5.85 },\n", "      { width: 14.1, height: 8.35 },\n", 'ground size')
text = replace_once(text, "      { width: 11.72, height: 0.2, depth: 6.02 },\n", "      { width: 14.3, height: 0.2, depth: 8.55 },\n", 'slab size')
text = replace_once(text, "      { width: 9.9, height: 0.028, depth: 4.6 },\n", "      { width: 12.95, height: 0.028, depth: 6.75 },\n", 'mat size')
text = replace_once(text, "      { width: 9.94, height: 0.035, depth: 0.035 },\n", "      { width: 13.0, height: 0.035, depth: 0.035 },\n", 'mat trim width')
text = replace_once(text, "    matFrontTrim.position = new Vector3(0, 0.052, -1.835);\n", "    matFrontTrim.position = new Vector3(0, 0.052, -2.89);\n", 'mat trim position')
text = replace_once(text, "    for (const x of [-4.97, 4.97]) {\n", "    for (const x of [-6.5, 6.5]) {\n", 'side trim positions')
text = replace_once(text, "        { width: 0.035, height: 0.035, depth: 4.63 },\n", "        { width: 0.035, height: 0.035, depth: 6.78 },\n", 'side trim depth')
text = replace_once(text, "      { width: 11.82, height: 0.18, depth: 0.13 },\n", "      { width: 14.4, height: 0.18, depth: 0.13 },\n", 'front lip width')
text = replace_once(text, "    frontLip.position = new Vector3(0, -0.08, -2.94);\n", "    frontLip.position = new Vector3(0, -0.08, -4.18);\n", 'front lip position')
text = replace_once(text, "      { width: 11.7, height: 0.16, depth: 0.12 },\n", "      { width: 14.3, height: 0.16, depth: 0.12 },\n", 'back rail width')
text = replace_once(text, "    backRail.position = new Vector3(0, 0.1, 3.0);\n", "    backRail.position = new Vector3(0, 0.1, 4.22);\n", 'back rail position')

text = replace_once(text, """    this.resistor = new ResistorModuleVisual(
      this.scene,
      this.theme,
      new Vector3(-0.7, 0, -0.75),
      ids.resistorA,
      ids.resistorB,
      registerTerminal,
    );

    this.ammeter = new AnalogMeterVisual(
""", """    this.resistor = new ResistorModuleVisual(
      this.scene,
      this.theme,
      new Vector3(-0.7, 0, -0.75),
      ids.resistorA,
      ids.resistorB,
      registerTerminal,
    );

    this.resistor2 = new CompactResistorVisual(
      this.scene,
      this.theme,
      'resistor-02',
      'R2',
      new Vector3(2.05, 0, -2.35),
      ids.resistor2A,
      ids.resistor2B,
      registerTerminal,
    );
    this.resistor3 = new CompactResistorVisual(
      this.scene,
      this.theme,
      'resistor-03',
      'R3',
      new Vector3(-3.85, 0, -2.35),
      ids.resistor3A,
      ids.resistor3B,
      registerTerminal,
    );
    this.resistor4 = new CompactResistorVisual(
      this.scene,
      this.theme,
      'resistor-04',
      'R4',
      new Vector3(5.0, 0, -2.35),
      ids.resistor4A,
      ids.resistor4B,
      registerTerminal,
    );
    this.circuitSwitch = new CircuitKeyVisual(
      this.scene,
      this.theme,
      new Vector3(-0.7, 0, 3.0),
      ids.switchA,
      ids.switchB,
      registerTerminal,
    );
    this.lamp = new LampVisual(
      this.scene,
      this.theme,
      new Vector3(5.2, 0, 2.55),
      ids.lampA,
      ids.lampB,
      registerTerminal,
    );

    this.ammeter = new AnalogMeterVisual(
""", 'extra instruments')

text = replace_once(text, "    const ids: readonly InstrumentId[] = ['source', 'resistor', 'ammeter', 'voltmeter'];\n", "    const ids: readonly InstrumentId[] = ['source', 'resistor', 'resistor-02', 'resistor-03', 'resistor-04', 'switch', 'lamp', 'ammeter', 'voltmeter'];\n", 'instrument roots')

text = replace_once(text, """      if (metadata?.instrumentControl === 'source-output') {
        this.runtime.setSourceEnabled(!this.currentSourceEnabled());
        return;
      }

      if (metadata?.terminalId) {
""", """      if (metadata?.instrumentControl === 'source-output') {
        this.runtime.setSourceEnabled(!this.currentSourceEnabled());
        return;
      }

      if (metadata?.instrumentControl === 'switch-toggle') {
        const circuitSwitch = this.runtime.circuit.snapshot().components.find((component) => component.id === ids.switch);
        if (circuitSwitch?.kind === 'switch') {
          circuitSwitch.closed = !circuitSwitch.closed;
          this.runtime.recalculate();
        }
        return;
      }

      if (metadata?.terminalId) {
""", 'switch interaction')

text = replace_once(text, "    else if (metadata?.instrumentControl === 'source-output') this.canvas.style.cursor = 'pointer';\n", "    else if (metadata?.instrumentControl === 'source-output' || metadata?.instrumentControl === 'switch-toggle') this.canvas.style.cursor = 'pointer';\n", 'switch cursor')

text = replace_once(text, """    return new Vector3(
      Math.min(4.55, Math.max(-4.55, point.x)),
      Math.max(0.13, point.y),
      Math.min(2.42, Math.max(-1.48, point.z)),
    );
""", """    return new Vector3(
      Math.min(6.2, Math.max(-6.2, point.x)),
      Math.max(0.13, point.y),
      Math.min(3.42, Math.max(-3.25, point.z)),
    );
""", 'loose wire bounds')

text = replace_once(text, """    const base: Record<InstrumentId, CableCollider> = {
      source: { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },
      resistor: { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },
      ammeter: { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },
      voltmeter: { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },
    };
""", """    const base: Record<InstrumentId, CableCollider> = {
      source: { min: new Vector3(-4.78, -0.5, 0.52), max: new Vector3(-1.9, 1.94, 2.3) },
      resistor: { min: new Vector3(-2.12, -0.5, -1.38), max: new Vector3(0.72, 1.18, -0.08) },
      'resistor-02': { min: new Vector3(1.05, -0.5, -2.9), max: new Vector3(3.05, 0.98, -1.8) },
      'resistor-03': { min: new Vector3(-4.85, -0.5, -2.9), max: new Vector3(-2.85, 0.98, -1.8) },
      'resistor-04': { min: new Vector3(4.0, -0.5, -2.9), max: new Vector3(6.0, 0.98, -1.8) },
      switch: { min: new Vector3(-1.65, -0.5, 2.43), max: new Vector3(0.25, 1.08, 3.58) },
      lamp: { min: new Vector3(4.42, -0.5, 1.77), max: new Vector3(5.98, 1.72, 3.33) },
      ammeter: { min: new Vector3(2.42, -0.5, -0.98), max: new Vector3(4.68, 1.95, 0.16) },
      voltmeter: { min: new Vector3(0.4, -0.5, 1.12), max: new Vector3(2.56, 1.86, 2.24) },
    };
""", 'expanded cable colliders')

text = replace_once(text, """    const resistorMeasurement = state.result.measurements[ids.resistor];

    this.source.setVoltage(sourceVoltage);
""", """    const resistorMeasurement = state.result.measurements[ids.resistor];
    const resistor2Measurement = state.result.measurements[ids.resistor2];
    const resistor3Measurement = state.result.measurements[ids.resistor3];
    const resistor4Measurement = state.result.measurements[ids.resistor4];
    const lampMeasurement = state.result.measurements[ids.lamp];
    const circuitSwitch = snapshot.components.find((component) => component.id === ids.switch);

    this.source.setVoltage(sourceVoltage);
""", 'expanded measurements')

text = replace_once(text, """    this.resistor.setResistance(resistance);
    this.resistor.setPower(resistorMeasurement?.power ?? state.result.power ?? 0);
    this.ammeter.setValue(
""", """    this.resistor.setResistance(resistance);
    this.resistor.setPower(resistorMeasurement?.power ?? state.result.power ?? 0);
    this.resistor2.setPower(resistor2Measurement?.power ?? 0);
    this.resistor3.setPower(resistor3Measurement?.power ?? 0);
    this.resistor4.setPower(resistor4Measurement?.power ?? 0);
    this.lamp.setElectrical(lampMeasurement?.voltage ?? 0, lampMeasurement?.power ?? 0);
    this.circuitSwitch.setClosed(circuitSwitch?.kind === 'switch' ? circuitSwitch.closed : false);
    this.ammeter.setValue(
""", 'expanded visual state')

path.write_text(text)
print('expanded Ohm bench integration applied')
