import { readFileSync, writeFileSync } from 'node:fs';

function replace(path, from, to) {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error(`Expected fragment not found in ${path}`);
  writeFileSync(path, text.replace(from, to));
}

replace(
  'src/rendering/babylon/LabScene.ts',
  "        max: 4,",
  "        max: 5,",
);

replace(
  'src/rendering/babylon/ProfessionalInstruments.ts',
  "import type { InstrumentTheme } from './InstrumentTheme';",
  "import type { InstrumentTheme } from './InstrumentTheme';\nimport { clampMeterAngle, meterNeedleAngle, METER_ZERO_ANGLE } from './MeterScale';",
);

replace(
  'src/rendering/babylon/ProfessionalInstruments.ts',
`  private targetAngle = 0;
  private currentAngle = 0;`,
`  private targetAngle = METER_ZERO_ANGLE;
  private currentAngle = METER_ZERO_ANGLE;`,
);

replace(
  'src/rendering/babylon/ProfessionalInstruments.ts',
`  setValue(value: number, overload: boolean): void {
    const safe = Number.isFinite(value) ? Math.max(0, value) : this.max;
    const ratio = Math.min(1, safe / this.max);
    this.targetAngle = 1.03 - ratio * 2.06;`,
`  setValue(value: number, overload: boolean): void {
    this.targetAngle = meterNeedleAngle(value, this.max);`,
);

replace(
  'src/rendering/babylon/ProfessionalInstruments.ts',
`  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 9);
    this.currentAngle += (this.targetAngle - this.currentAngle) * factor;
    this.needlePivot.rotation.z = this.currentAngle;
  }`,
`  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 9);
    this.currentAngle += (this.targetAngle - this.currentAngle) * factor;
    this.currentAngle = clampMeterAngle(this.currentAngle);
    this.needlePivot.rotation.z = this.currentAngle;
  }`,
);
