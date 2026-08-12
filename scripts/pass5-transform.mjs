import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      throw new Error(`Expected fragment not found in ${path}: ${from.slice(0, 120)}`);
    }
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/rendering/babylon/ProfessionalInstruments.ts', [
  [
    "import type { InstrumentTheme } from './InstrumentTheme';",
    "import type { InstrumentTheme } from './InstrumentTheme';\nimport {\n  createInsetPanel,\n  createProtectiveCheeks,\n  createRoundedEnclosure,\n} from './IndustrialGeometry';",
  ],
  [
`function createPanelFrame(
  scene: Scene,
  theme: InstrumentTheme,
  prefix: string,
  center: Vector3,
  width: number,
  height: number,
  frontZ: number,
): void {
  const strip = 0.07;
  const depth = 0.055;
  createBox(scene, \`${'${prefix}'}-frame-top\`, new Vector3(center.x, center.y + height / 2, frontZ), new Vector3(width, strip, depth), theme.meterBezel);
  createBox(scene, \`${'${prefix}'}-frame-bottom\`, new Vector3(center.x, center.y - height / 2, frontZ), new Vector3(width, strip, depth), theme.meterBezel);
  createBox(scene, \`${'${prefix}'}-frame-left\`, new Vector3(center.x - width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
  createBox(scene, \`${'${prefix}'}-frame-right\`, new Vector3(center.x + width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
}

`,
    '',
  ],
  [
`    createFeet(scene, theme, 'source', position, width, depth);
    createBox(scene, 'source-shell', bodyCenter, new Vector3(width, height, depth), theme.graphiteSoft);
    createBox(
      scene,
      'source-front-panel',
      new Vector3(position.x, 0.94, frontZ),
      new Vector3(width * 0.94, height * 0.9, 0.085),
      theme.frontPanel,
    );
    createPanelFrame(
      scene,
      theme,
      'source',
      new Vector3(position.x, 0.94, 0),
      width * 0.94,
      height * 0.9,
      frontZ - 0.047,
    );`,
`    createFeet(scene, theme, 'source', position, width, depth);
    createRoundedEnclosure(
      scene,
      'source-shell',
      bodyCenter,
      new Vector3(width, height, depth),
      0.14,
      theme.graphiteSoft,
    );
    createProtectiveCheeks(
      scene,
      'source',
      bodyCenter,
      width,
      height,
      depth * 0.96,
      theme.rubberBlack,
    );
    createInsetPanel(
      scene,
      'source-front',
      new Vector3(position.x, 0.94, frontZ),
      new Vector3(width * 0.91, height * 0.85, 0.078),
      0.085,
      theme.frontPanel,
      theme.meterBezel,
    );
    createRoundedEnclosure(
      scene,
      'source-top-cover',
      new Vector3(position.x, 1.77, position.z + 0.015),
      new Vector3(width * 0.9, 0.075, depth * 0.88),
      0.055,
      theme.darkMetal,
    );`,
  ],
  [
`    createFeet(scene, theme, spec.id, p, width, depth);
    createBox(
      scene,
      \`${'${spec.id}'}-shell\`,
      new Vector3(p.x, 0.96, p.z),
      new Vector3(width, height, depth),
      theme.graphite,
    );
    createBox(
      scene,
      \`${'${spec.id}'}-front\`,
      new Vector3(p.x, 0.96, frontZ),
      new Vector3(width * 0.95, height * 0.92, 0.085),
      theme.meterPanel,
    );
    createPanelFrame(
      scene,
      theme,
      spec.id,
      new Vector3(p.x, 0.96, 0),
      width * 0.95,
      height * 0.92,
      frontZ - 0.048,
    );

    const bezel = createBox(
      scene,
      \`${'${spec.id}'}-dial-bezel\`,
      new Vector3(p.x, 1.17, frontZ - 0.085),
      new Vector3(width * 0.84, 1.08, 0.06),
      theme.meterBezel,
    );
    bezel.isPickable = false;`,
`    createFeet(scene, theme, spec.id, p, width, depth);
    createRoundedEnclosure(
      scene,
      \`${'${spec.id}'}-shell\`,
      new Vector3(p.x, 0.96, p.z),
      new Vector3(width, height, depth),
      0.12,
      theme.graphite,
    );
    createProtectiveCheeks(
      scene,
      spec.id,
      new Vector3(p.x, 0.96, p.z),
      width,
      height,
      depth * 0.94,
      theme.rubberBlack,
    );
    createInsetPanel(
      scene,
      \`${'${spec.id}'}-front\`,
      new Vector3(p.x, 0.96, frontZ),
      new Vector3(width * 0.91, height * 0.88, 0.078),
      0.082,
      theme.meterPanel,
      theme.meterBezel,
    );

    createRoundedEnclosure(
      scene,
      \`${'${spec.id}'}-dial-bezel\`,
      new Vector3(p.x, 1.17, frontZ - 0.085),
      new Vector3(width * 0.82, 1.07, 0.062),
      0.06,
      theme.meterBezel,
    );`,
  ],
  [
"      [`LAB ${spec.label.toUpperCase()}`],\n      '#20282c',\n      'transparent',\n      34,\n      28,",
"      [`DC ${spec.label.toUpperCase()}`],\n      '#1d2529',\n      'transparent',\n      39,\n      28,",
  ],
  [
`    createBox(
      scene,
      'resistor-module-base',
      new Vector3(position.x, 0.24, position.z),
      new Vector3(2.72, 0.34, 1.18),
      theme.graphite,
    );
    createBox(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.42, 0.13, 0.9),
      theme.meterPanel,
    );`,
`    createRoundedEnclosure(
      scene,
      'resistor-module-base',
      new Vector3(position.x, 0.24, position.z),
      new Vector3(2.72, 0.34, 1.18),
      0.11,
      theme.graphite,
    );
    createRoundedEnclosure(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.42, 0.13, 0.9),
      0.065,
      theme.meterPanel,
    );`,
  ],
  ["{ height: 0.105, diameter: 0.24, tessellation: 24 }", "{ height: 0.085, diameter: 0.19, tessellation: 24 }"],
  ["        0.055,", "        0.046,"],
]);

patch('src/rendering/babylon/LabScene.ts', [
  [
`      1.315,
      9.6,
      new Vector3(-0.02, 0.83, 0.58),`,
`      1.37,
      9.35,
      new Vector3(-0.02, 0.79, 0.58),`,
  ],
  ["    camera.fov = 0.6;", "    camera.fov = 0.565;"],
  ["    camera.lowerBetaLimit = 1.25;\n    camera.upperBetaLimit = 1.36;", "    camera.lowerBetaLimit = 1.31;\n    camera.upperBetaLimit = 1.41;"],
  ["    benchSlab.material = this.theme.bench;", "    benchSlab.material = this.theme.darkMetal;"],
  [
`        position: new Vector3(2.62, 0, 0.34),
        plus: ids.ammeterPlus,
        minus: ids.ammeterMinus,`,
`        position: new Vector3(2.55, 0, 0.38),
        plus: ids.ammeterPlus,
        minus: ids.ammeterMinus,
        width: 1.98,
        height: 1.69,`,
  ],
  [
`        position: new Vector3(0.86, 0, 1.93),`,
`        position: new Vector3(0.82, 0, 1.88),`,
  ],
  [
`    return ((Math.abs(hash) % 5) - 2) * 0.22;`,
`    return ((Math.abs(hash) % 7) - 3) * 0.19;`,
  ],
  ["    const tableY = 0.082;", "    const tableY = 0.068;"],
  ["      { path, radius: 0.046, tessellation: 20, cap: Mesh.CAP_ALL },", "      { path, radius: 0.041, tessellation: 20, cap: Mesh.CAP_ALL },"],
]);
