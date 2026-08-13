import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`Missing fragment in ${path}: ${from.slice(0, 160)}`);
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/rendering/babylon/LabScene.ts', [
  [
`      1.325,
      10.15,
      new Vector3(-0.08, 0.82, 0.58),`,
`      1.385,
      10.55,
      new Vector3(-0.08, 0.88, 0.66),`,
  ],
  ['    camera.fov = 0.585;', '    camera.fov = 0.57;'],
  ['    camera.lowerRadiusLimit = 9.75;\n    camera.upperRadiusLimit = 10.8;', '    camera.lowerRadiusLimit = 10.1;\n    camera.upperRadiusLimit = 11.1;'],
  ['    camera.lowerBetaLimit = 1.25;\n    camera.upperBetaLimit = 1.36;', '    camera.lowerBetaLimit = 1.34;\n    camera.upperBetaLimit = 1.42;'],
  ['      new Vector3(-3.12, 0, 0.4),', '      new Vector3(-2.75, 0, 0.4),'],
  ['      new Vector3(-0.58, 0, 0.48),', '      new Vector3(-0.4, 0, 0.48),'],
  ['        position: new Vector3(2.62, 0, 0.34),', '        position: new Vector3(2.25, 0, 0.34),'],
  ['        position: new Vector3(0.68, 0, 2.04),', '        position: new Vector3(0.55, 0, 1.94),'],
]);

patch('src/rendering/babylon/GlbInstrumentShells.ts', [
  ['      position: new Vector3(-3.12, 0.94, 0.4),', '      position: new Vector3(-2.75, 0.94, 0.4),'],
  ['      position: new Vector3(2.62, 0.96, 0.34),', '      position: new Vector3(2.25, 0.96, 0.34),'],
  ['      position: new Vector3(0.68, 0.96, 2.04),', '      position: new Vector3(0.55, 0.96, 1.94),'],
  ['      position: new Vector3(-0.58, 0.24, 0.48),', '      position: new Vector3(-0.4, 0.24, 0.48),'],
]);

patch('src/rendering/babylon/ProfessionalInstruments.ts', [
  [
`    faceMaterial.specularColor = new Color3(0.12, 0.12, 0.11);
    faceMaterial.backFaceCulling = false;`,
`    faceMaterial.specularColor = Color3.Black();
    faceMaterial.disableLighting = true;
    faceMaterial.backFaceCulling = false;`,
  ],
  [
`export class ResistorModuleVisual {
  private readonly display: DigitalDisplay;
  private readonly ceramicMaterial: PBRMaterial;`,
`export class ResistorModuleVisual {
  private readonly valueTexture: DynamicTexture;
  private readonly ceramicMaterial: PBRMaterial;`,
  ],
  [
`    this.display = new DigitalDisplay(scene, theme, {
      id: 'resistor-module',
      width: 0.92,
      height: 0.25,
      unit: 'Ω',
      decimals: 2,
      position: new Vector3(position.x, 0.27, position.z - 0.625),
      textColor: '#f0ce86',
      fontSize: 74,
    });

`,
`    const valuePlate = MeshBuilder.CreatePlane(
      'resistor-value-plate',
      { width: 0.98, height: 0.27 },
      scene,
    );
    valuePlate.position = new Vector3(position.x, 0.27, position.z - 0.63);
    valuePlate.rotation.y = 0;
    valuePlate.isPickable = false;
    this.valueTexture = new DynamicTexture(
      'resistor-value-texture',
      { width: 640, height: 190 },
      scene,
      true,
    );
    const valueMaterial = new StandardMaterial('resistor-value-material', scene);
    valueMaterial.diffuseTexture = this.valueTexture;
    valueMaterial.emissiveColor = new Color3(0.08, 0.075, 0.06);
    valueMaterial.disableLighting = true;
    valueMaterial.backFaceCulling = false;
    valuePlate.material = valueMaterial;

`,
  ],
  [
`  setResistance(value: number): void {
    this.display.setValue(value);
  }`,
`  setResistance(value: number): void {
    const context = this.valueTexture.getContext();
    context.clearRect(0, 0, 640, 190);
    context.fillStyle = '#d6d0bd';
    context.fillRect(0, 0, 640, 190);
    context.strokeStyle = '#8d887b';
    context.lineWidth = 8;
    context.strokeRect(5, 5, 630, 180);
    this.valueTexture.drawText(
      \`R = ${'${value.toFixed(2)}'} Ω\`,
      null,
      126,
      '600 78px ui-monospace, SFMono-Regular, Menlo, monospace',
      '#2d302f',
      null,
      true,
    );
  }`,
  ],
]);
