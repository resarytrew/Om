import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      throw new Error(`Missing fragment in ${path}: ${from.slice(0, 160)}`);
    }
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/rendering/babylon/LabScene.ts', [
  [
`      1.18,
      10.75,
      new Vector3(-0.05, 0.7, 0.52),`,
`      1.16,
      11.05,
      new Vector3(0.05, 0.68, 0.48),`,
  ],
  ['    camera.fov = 0.6;', '    camera.fov = 0.66;'],
  ['    camera.lowerRadiusLimit = 10.35;\n    camera.upperRadiusLimit = 11.35;', '    camera.lowerRadiusLimit = 10.65;\n    camera.upperRadiusLimit = 11.55;'],
  [
`      new Vector3(-2.8, 0, 1.18),`,
`      new Vector3(-3.35, 0, 1.45),`,
  ],
  [
`      new Vector3(-0.55, 0, -0.62),`,
`      new Vector3(-0.7, 0, -0.75),`,
  ],
  [
`        position: new Vector3(2.35, 0, -0.22),`,
`        position: new Vector3(3.55, 0, -0.35),`,
  ],
  [
`        position: new Vector3(0.72, 0, 1.86),`,
`        position: new Vector3(1.48, 0, 1.72),`,
  ],
]);

patch('src/rendering/babylon/GlbInstrumentShells.ts', [
  ['      position: new Vector3(-2.8, 0.94, 1.18),', '      position: new Vector3(-3.35, 0.94, 1.45),'],
  ['      position: new Vector3(2.35, 0.96, -0.22),', '      position: new Vector3(3.55, 0.96, -0.35),'],
  ['      position: new Vector3(0.72, 0.96, 1.86),', '      position: new Vector3(1.48, 0.96, 1.72),'],
  ['      position: new Vector3(-0.55, 0.24, -0.62),', '      position: new Vector3(-0.7, 0.24, -0.75),'],
]);
