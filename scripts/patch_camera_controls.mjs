import { readFileSync, writeFileSync } from 'node:fs';

function replace(path, from, to) {
  const text = readFileSync(path, 'utf8');
  if (!text.includes(from)) throw new Error(`Expected fragment not found in ${path}`);
  writeFileSync(path, text.replace(from, to));
}

replace(
  'src/rendering/babylon/LabScene.ts',
`    camera.fov = 0.66;
    camera.lowerRadiusLimit = 10.65;
    camera.upperRadiusLimit = 11.55;
    camera.lowerBetaLimit = 1.1;
    camera.upperBetaLimit = 1.27;
    camera.lowerAlphaLimit = -1.67;
    camera.upperAlphaLimit = -1.47;
    camera.wheelPrecision = 180;
    camera.panningSensibility = 0;
    camera.attachControl(this.canvas, true);`,
`    camera.fov = 0.66;

    // Interactive orbit camera for the laboratory bench. The limits keep the
    // learner above the table and in front of the studio backdrop, while still
    // allowing a wide inspection angle around every instrument.
    camera.lowerRadiusLimit = 5.4;
    camera.upperRadiusLimit = 16.5;
    camera.lowerBetaLimit = 0.46;
    camera.upperBetaLimit = 1.48;
    camera.lowerAlphaLimit = -Math.PI + 0.16;
    camera.upperAlphaLimit = -0.16;
    camera.wheelPrecision = 34;
    camera.pinchPrecision = 72;
    camera.inertia = 0.82;
    camera.panningSensibility = 95;
    camera.attachControl(this.canvas, true, true);`,
);

replace(
  'src/rendering/babylon/LabScene.ts',
  '      if (pointerInfo.type !== PointerEventTypes.POINTERDOWN) return;',
  `      // POINTERTAP fires only when the pointer is released without a drag.
      // This keeps terminal/wire selection independent from camera orbiting.
      if (pointerInfo.type !== PointerEventTypes.POINTERTAP) return;`,
);

replace(
  'src/ui/renderApp.ts',
  'Клемма → клемма: создать провод · Провод: выбрать, Delete удалить · Esc отмена.',
  'Drag: вращать камеру · Колесо: приблизить/отдалить · Ctrl + drag: сдвиг · Клик по клемме: провод.',
);

// The same hint appears once in the live state update; replace the remaining copy.
replace(
  'src/ui/renderApp.ts',
  'Клемма → клемма: создать провод · Провод: выбрать, Delete удалить · Esc отмена.',
  'Drag: вращать камеру · Колесо: приблизить/отдалить · Ctrl + drag: сдвиг · Клик по клемме: провод.',
);
