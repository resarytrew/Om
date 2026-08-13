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
`      1.385,
      10.55,
      new Vector3(-0.08, 0.88, 0.66),`,
`      1.18,
      10.75,
      new Vector3(-0.05, 0.7, 0.52),`,
  ],
  ['    camera.fov = 0.57;', '    camera.fov = 0.6;'],
  ['    camera.lowerRadiusLimit = 10.1;\n    camera.upperRadiusLimit = 11.1;', '    camera.lowerRadiusLimit = 10.35;\n    camera.upperRadiusLimit = 11.35;'],
  ['    camera.lowerBetaLimit = 1.34;\n    camera.upperBetaLimit = 1.42;', '    camera.lowerBetaLimit = 1.1;\n    camera.upperBetaLimit = 1.27;'],
  [
`      new Vector3(-2.75, 0, 0.4),`,
`      new Vector3(-2.8, 0, 1.18),`,
  ],
  [
`      new Vector3(-0.4, 0, 0.48),`,
`      new Vector3(-0.55, 0, -0.62),`,
  ],
  [
`        position: new Vector3(2.25, 0, 0.34),`,
`        position: new Vector3(2.35, 0, -0.22),`,
  ],
  [
`        position: new Vector3(0.55, 0, 1.94),`,
`        position: new Vector3(0.72, 0, 1.86),`,
  ],
  [
`    const distance = Vector3.Distance(from, to);
    const tableY = 0.082;
    const frontOffset = 0.28 + Math.min(0.55, distance * 0.065);
    const routeZ = Math.min(from.z, to.z) - frontOffset - Math.abs(lane) * 0.2;
    const first = from.add(new Vector3(0, -0.08, -0.16));
    const last = to.add(new Vector3(0, -0.08, -0.16));
    const middleA = Vector3.Lerp(from, to, 0.3);
    middleA.x += lane;
    middleA.y = tableY;
    middleA.z = Math.min(middleA.z, routeZ);
    const middleB = Vector3.Lerp(from, to, 0.7);
    middleB.x -= lane * 0.45;
    middleB.y = tableY;
    middleB.z = Math.min(middleB.z, routeZ + 0.06);
    return Curve3.CreateCatmullRomSpline(
      [from.clone(), first, middleA, middleB, last, to.clone()],
      12,
      false,
    ).getPoints();`,
`    const distance = Vector3.Distance(from, to);
    const tableY = 0.082;
    const leadOut = 0.34;
    const frontOffset = 0.46 + Math.min(0.72, distance * 0.08);
    const routeZ = Math.min(from.z, to.z) - frontOffset - Math.abs(lane) * 0.18;

    // Keep the socket visible: every cable leaves the terminal straight toward
    // the viewer before dropping to table height and turning into its route.
    const fromLead = from.add(new Vector3(0, 0, -leadOut));
    const fromDrop = new Vector3(fromLead.x, tableY, fromLead.z - 0.1);
    const toLead = to.add(new Vector3(0, 0, -leadOut));
    const toDrop = new Vector3(toLead.x, tableY, toLead.z - 0.1);

    const middleA = Vector3.Lerp(fromDrop, toDrop, 0.32);
    middleA.x += lane;
    middleA.y = tableY;
    middleA.z = Math.min(middleA.z, routeZ);
    const middleB = Vector3.Lerp(fromDrop, toDrop, 0.68);
    middleB.x -= lane * 0.45;
    middleB.y = tableY;
    middleB.z = Math.min(middleB.z, routeZ + 0.08);

    return Curve3.CreateCatmullRomSpline(
      [
        from.clone(),
        fromLead,
        fromDrop,
        middleA,
        middleB,
        toDrop,
        toLead,
        to.clone(),
      ],
      12,
      false,
    ).getPoints();`,
  ],
]);

patch('src/rendering/babylon/GlbInstrumentShells.ts', [
  ['      position: new Vector3(-2.75, 0.94, 0.4),', '      position: new Vector3(-2.8, 0.94, 1.18),'],
  ['      position: new Vector3(2.25, 0.96, 0.34),', '      position: new Vector3(2.35, 0.96, -0.22),'],
  ['      position: new Vector3(0.55, 0.96, 1.94),', '      position: new Vector3(0.72, 0.96, 1.86),'],
  ['      position: new Vector3(-0.4, 0.24, 0.48),', '      position: new Vector3(-0.55, 0.24, -0.62),'],
]);
