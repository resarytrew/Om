import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) throw new Error(`Missing fragment in ${path}: ${from.slice(0, 140)}`);
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/rendering/babylon/LabScene.ts', [
  ['  Color4,\n  Curve3,', '  Color4,\n  CubeTexture,\n  Curve3,'],
  [
`    this.theme = createInstrumentTheme(this.scene);`,
`    this.theme = createInstrumentTheme(this.scene);
    this.scene.environmentTexture = CubeTexture.CreateFromPrefilteredData(
      \`${'${import.meta.env.BASE_URL}'}models/ohm/studio.env\`,
      this.scene,
    );`,
  ],
  [
`      1.315,
      9.6,
      new Vector3(-0.02, 0.83, 0.58),`,
`      1.325,
      10.15,
      new Vector3(-0.08, 0.82, 0.58),`,
  ],
  ['    camera.fov = 0.6;', '    camera.fov = 0.585;'],
  ['    camera.lowerRadiusLimit = 9.1;\n    camera.upperRadiusLimit = 10.4;', '    camera.lowerRadiusLimit = 9.75;\n    camera.upperRadiusLimit = 10.8;'],
  ['    hemi.intensity = 0.48;', '    hemi.intensity = 0.34;'],
  ['    key.intensity = 1.72;', '    key.intensity = 1.48;'],
  ['    fill.intensity = 11.5;', '    fill.intensity = 7.8;'],
  ['    frontFill.intensity = 7.5;', '    frontFill.intensity = 5.8;'],
  ['    rim.intensity = 8.5;', '    rim.intensity = 6.6;'],
  [
`    wallRail.material = this.theme.darkMetal;
    wallRail.isPickable = false;`,
`    wallRail.material = this.theme.darkMetal;
    wallRail.isPickable = false;
    wallRail.setEnabled(false);`,
  ],
  ['        position: new Vector3(0.86, 0, 1.93),', '        position: new Vector3(0.68, 0, 2.04),'],
]);

patch('src/rendering/babylon/GlbInstrumentShells.ts', [
  ['      position: new Vector3(0.86, 0.96, 1.93),', '      position: new Vector3(0.68, 0.96, 2.04),'],
]);

patch('src/rendering/babylon/ProfessionalInstruments.ts', [
  ['    plane.rotation.y = Math.PI;\n    plane.isPickable = false;', '    plane.rotation.y = 0;\n    plane.isPickable = false;'],
  ['    glass.rotation.y = Math.PI;\n    glass.material = theme.glass;', '    glass.rotation.y = 0;\n    glass.material = theme.glass;'],
  ['  plane.rotation.y = Math.PI;\n  plane.isPickable = false;', '  plane.rotation.y = 0;\n  plane.isPickable = false;'],
  [
`  private readonly display: DigitalDisplay;
  private readonly needlePivot: TransformNode;`,
`  private readonly needlePivot: TransformNode;`,
  ],
  [
`  const strip = 0.07;
  const depth = 0.055;`,
`  const strip = 0.045;
  const depth = 0.042;`,
  ],
  ['    face.rotation.y = Math.PI;\n    face.isPickable = false;', '    face.rotation.y = 0;\n    face.isPickable = false;'],
  [
`    faceMaterial.emissiveColor = new Color3(0.16, 0.16, 0.145);
    faceMaterial.backFaceCulling = false;`,
`    faceMaterial.emissiveColor = new Color3(0.105, 0.103, 0.095);
    faceMaterial.specularColor = new Color3(0.12, 0.12, 0.11);
    faceMaterial.backFaceCulling = false;`,
  ],
  ['    glass.rotation.y = Math.PI;\n    glass.material = theme.glass;', '    glass.rotation.y = 0;\n    glass.material = theme.glass;'],
  [
"      [`LAB ${spec.label.toUpperCase()}`],\n      '#20282c',\n      'transparent',\n      34,\n      28,",
"      [`DC ${spec.label.toUpperCase()}`],\n      '#20282c',\n      'transparent',\n      38,\n      28,",
  ],
  [
`    this.display = new DigitalDisplay(scene, theme, {
      id: \`${'${spec.id}'}-digital\`,
      width: 0.9,
      height: 0.24,
      unit: spec.unit,
      decimals: spec.decimals,
      position: new Vector3(p.x, 0.44, frontZ - 0.13),
      textColor: '#72e5f7',
      fontSize: 72,
    });

`,
    '',
  ],
  ['    this.warningLed.position = new Vector3(p.x + 0.7, 0.44, frontZ - 0.18);', '    this.warningLed.position = new Vector3(p.x + 0.72, 0.37, frontZ - 0.18);'],
  [
`    this.display.setValue(overload ? Number.POSITIVE_INFINITY : value);

    const material = this.warningLed.material as StandardMaterial | null;`,
`    const material = this.warningLed.material as StandardMaterial | null;`,
  ],
  [
`    ctx.strokeStyle = '#c9c7bf';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 1164, 624);

`,
    '',
  ],
]);

patch('src/rendering/babylon/InstrumentTheme.ts', [
  [
`  const meterPanel = pbr(scene, 'meter-panel', new Color3(0.62, 0.63, 0.615), 0.04, 0.58);
  meterPanel.environmentIntensity = 0.76;`,
`  const meterPanel = pbr(scene, 'meter-panel', new Color3(0.48, 0.49, 0.475), 0.06, 0.54);
  meterPanel.environmentIntensity = 0.82;`,
  ],
  [
`  const backdrop = pbr(scene, 'lab-backdrop', new Color3(0.035, 0.048, 0.058), 0, 0.94);
  backdrop.environmentIntensity = 0.35;`,
`  const backdrop = pbr(scene, 'lab-backdrop', new Color3(0.026, 0.033, 0.039), 0, 0.97);
  backdrop.environmentIntensity = 0.16;`,
  ],
]);
