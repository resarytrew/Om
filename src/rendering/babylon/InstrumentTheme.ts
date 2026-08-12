import {
  Color3,
  PBRMaterial,
  Scene,
  StandardMaterial,
} from '@babylonjs/core';

export interface InstrumentTheme {
  readonly graphite: PBRMaterial;
  readonly graphiteSoft: PBRMaterial;
  readonly frontPanel: PBRMaterial;
  readonly meterPanel: PBRMaterial;
  readonly meterBezel: PBRMaterial;
  readonly ceramic: PBRMaterial;
  readonly metal: PBRMaterial;
  readonly darkMetal: PBRMaterial;
  readonly rubberBlack: PBRMaterial;
  readonly terminalRed: PBRMaterial;
  readonly terminalBlack: PBRMaterial;
  readonly terminalNeutral: PBRMaterial;
  readonly glass: StandardMaterial;
  readonly ledGreen: StandardMaterial;
  readonly ledAmber: StandardMaterial;
  readonly displayGlass: StandardMaterial;
  readonly bench: PBRMaterial;
  readonly benchMat: PBRMaterial;
  readonly backdrop: PBRMaterial;
}

function pbr(
  scene: Scene,
  name: string,
  color: Color3,
  metallic: number,
  roughness: number,
): PBRMaterial {
  const material = new PBRMaterial(name, scene);
  material.albedoColor = color;
  material.metallic = metallic;
  material.roughness = roughness;
  return material;
}

export function createInstrumentTheme(scene: Scene): InstrumentTheme {
  const glass = new StandardMaterial('instrument-glass', scene);
  glass.diffuseColor = new Color3(0.42, 0.54, 0.58);
  glass.specularColor = new Color3(0.96, 0.98, 1);
  glass.alpha = 0.12;
  glass.backFaceCulling = false;

  const displayGlass = new StandardMaterial('display-glass', scene);
  displayGlass.diffuseColor = new Color3(0.018, 0.035, 0.04);
  displayGlass.specularColor = new Color3(0.56, 0.72, 0.76);
  displayGlass.emissiveColor = new Color3(0.012, 0.045, 0.052);
  displayGlass.alpha = 0.96;
  displayGlass.backFaceCulling = false;

  const ledGreen = new StandardMaterial('led-green', scene);
  ledGreen.diffuseColor = new Color3(0.05, 0.52, 0.2);
  ledGreen.emissiveColor = new Color3(0.035, 0.34, 0.12);

  const ledAmber = new StandardMaterial('led-amber', scene);
  ledAmber.diffuseColor = new Color3(0.78, 0.38, 0.055);
  ledAmber.emissiveColor = new Color3(0.48, 0.18, 0.015);

  return {
    graphite: pbr(scene, 'graphite', new Color3(0.095, 0.108, 0.118), 0.08, 0.56),
    graphiteSoft: pbr(scene, 'graphite-soft', new Color3(0.145, 0.16, 0.172), 0.06, 0.62),
    frontPanel: pbr(scene, 'front-panel', new Color3(0.34, 0.37, 0.39), 0.12, 0.42),
    meterPanel: pbr(scene, 'meter-panel', new Color3(0.68, 0.7, 0.69), 0.04, 0.5),
    meterBezel: pbr(scene, 'meter-bezel', new Color3(0.105, 0.115, 0.12), 0.18, 0.38),
    ceramic: pbr(scene, 'ceramic', new Color3(0.86, 0.82, 0.7), 0.0, 0.72),
    metal: pbr(scene, 'metal', new Color3(0.58, 0.6, 0.61), 0.62, 0.24),
    darkMetal: pbr(scene, 'dark-metal', new Color3(0.18, 0.19, 0.2), 0.48, 0.32),
    rubberBlack: pbr(scene, 'rubber-black', new Color3(0.028, 0.032, 0.035), 0.0, 0.92),
    terminalRed: pbr(scene, 'terminal-red', new Color3(0.72, 0.035, 0.045), 0.04, 0.48),
    terminalBlack: pbr(scene, 'terminal-black', new Color3(0.028, 0.032, 0.036), 0.03, 0.58),
    terminalNeutral: pbr(scene, 'terminal-neutral', new Color3(0.31, 0.34, 0.36), 0.18, 0.42),
    glass,
    ledGreen,
    ledAmber,
    displayGlass,
    bench: pbr(scene, 'bench-pro', new Color3(0.24, 0.255, 0.27), 0.04, 0.78),
    benchMat: pbr(scene, 'bench-mat', new Color3(0.07, 0.09, 0.105), 0.0, 0.92),
    backdrop: pbr(scene, 'lab-backdrop', new Color3(0.075, 0.095, 0.115), 0.02, 0.86),
  };
}
