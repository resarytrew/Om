import { readFileSync, writeFileSync } from 'node:fs';

const instrumentPath = 'src/rendering/babylon/ProfessionalInstruments.ts';
let instrument = readFileSync(instrumentPath, 'utf8');

instrument = instrument.replace(
`  private readonly statusLed: Mesh;\n  private readonly knob: Mesh;`,
`  private readonly statusLed: Mesh;\n  private readonly powerSwitch: Mesh;\n  private readonly knob: Mesh;`,
);
instrument = instrument.replace(
`    const powerSwitch = createBox(\n      scene,\n      'source-power-switch',`,
`    this.powerSwitch = createBox(\n      scene,\n      'source-power-switch',`,
);
instrument = instrument.replace(
`    powerSwitch.rotation.z = -0.06;`,
`    this.powerSwitch.rotation.z = -0.08;\n    this.powerSwitch.isPickable = true;\n    this.powerSwitch.metadata = { instrumentControl: 'source-output' };`,
);
instrument = instrument.replace(
`  setControlActive(active: boolean): void {`,
`  setOutputEnabled(enabled: boolean): void {\n    this.powerSwitch.rotation.z = enabled ? -0.08 : 0.12;\n    this.powerSwitch.scaling.y = enabled ? 1 : 0.92;\n  }\n\n  setControlActive(active: boolean): void {`,
);
writeFileSync(instrumentPath, instrument);

const scenePath = 'src/rendering/babylon/LabScene.ts';
let scene = readFileSync(scenePath, 'utf8');
scene = scene.replace(
`  readonly instrumentControl?: 'source-voltage';`,
`  readonly instrumentControl?: 'source-voltage' | 'source-output';`,
);
scene = scene.replace(
`      if (metadata?.terminalId) {`,
`      if (metadata?.instrumentControl === 'source-output') {\n        this.runtime.setSourceEnabled(!this.currentSourceEnabled());\n        return;\n      }\n\n      if (metadata?.terminalId) {`,
);
scene = scene.replace(
`    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'ns-resize';\n    else if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';`,
`    if (metadata?.instrumentControl === 'source-voltage') this.canvas.style.cursor = 'ns-resize';\n    else if (metadata?.instrumentControl === 'source-output') this.canvas.style.cursor = 'pointer';\n    else if (metadata?.terminalId) this.canvas.style.cursor = 'crosshair';`,
);
scene = scene.replace(
`  private finishInstrumentControl(pointerId?: number): void {`,
`  private currentSourceEnabled(): boolean {\n    const source = this.runtime.circuit.snapshot().components.find((component) => component.kind === 'voltage-source');\n    return source?.kind === 'voltage-source' ? source.enabled : false;\n  }\n\n  private finishInstrumentControl(pointerId?: number): void {`,
);
scene = scene.replace(
`    const sourceVoltage = source?.kind === 'voltage-source' ? source.voltage : 0;\n    const resistance = resistor?.kind === 'resistor' ? resistor.resistance : 0;`,
`    const sourceVoltage = source?.kind === 'voltage-source' ? source.voltage : 0;\n    const sourceEnabled = source?.kind === 'voltage-source' ? source.enabled : false;\n    const resistance = resistor?.kind === 'resistor' ? resistor.resistance : 0;`,
);
scene = scene.replace(
`    this.source.setVoltage(sourceVoltage);\n    this.source.setActive(\n      state.result.status === 'closed',`,
`    this.source.setVoltage(sourceVoltage);\n    this.source.setOutputEnabled(sourceEnabled);\n    this.source.setActive(\n      sourceEnabled && state.result.status === 'closed',`,
);
writeFileSync(scenePath, scene);
