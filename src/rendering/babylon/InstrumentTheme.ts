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
  glass.diffuseColor = new Color3(0.1, 0.16, 0.18);
  glass.specularColor = new Color3(0.8, 0.88, 0.9);
  glass.alpha = 0.18;
  glass.backFaceCulling = false;

  const displayGlass = new StandardMaterial('display-glass', scene);
  displayGlass.diffuseColor = new Color3(0.015, 0.04, 0.045);
  displayGlass.specularColor = new Color3(0.45, 0.65, 0.72);
  displayGlass.emissiveColor = new Color3(0.015, 0.055, 0.06);
  displayGlass.alpha = 0.94;
  displayGlass.backFaceCulling = false;

  const ledGreen = new StandardMaterial('led-green', scene);
  ledGreen.diffuseColor = new Color3(0.05, 0.42, 0.18);
  ledGreen.emissiveColor = new Color3(0.04, 0.34, 0.13);

  const ledAmber = new StandardMaterial('led-amber', scene);
  ledAmber.diffuseColor = new Color3(0.65, 0.32, 0.04);
  ledAmber.emissiveColor = new Color3(0.45, 0.18, 0.015);

  return {
    graphite: pbr(scene, 'graphite', new Color3(0.055, 0.065, 0.072), 0.16, 0.48),
    graphiteSoft: pbr(scene, 'graphite-soft', new Color3(0.09, 0.1, 0.108), 0.08, 0.62),
    frontPanel: pbr(scene, 'front-panel', new Color3(0.16, 0.175, 0.185), 0.28, 0.38),
    ceramic: pbr(scene, 'ceramic', new Color3(0.76, 0.72, 0.62), 0.02, 0.78),
    metal: pbr(scene, 'metal', new Color3(0.48, 0.5, 0.52), 0.82, 0.26),
    darkMetal: pbr(scene, 'dark-metal', new Color3(0.15, 0.16, 0.17), 0.72, 0.34),
    rubberBlack: pbr(scene, 'rubber-black', new Color3(0.018, 0.022, 0.025), 0.0, 0.9),
    terminalRed: pbr(scene, 'terminal-red', new Color3(0.63, 0.035, 0.045), 0.08, 0.42),
    terminalBlack: pbr(scene, 'terminal-black', new Color3(0.022, 0.025, 0.028), 0.1, 0.5),
    terminalNeutral: pbr(scene, 'terminal-neutral', new Color3(0.26, 0.29, 0.31), 0.38, 0.38),
    glass,
    ledGreen,
    ledAmber,
    displayGlass,
    bench: pbr(scene, 'bench-pro', new Color3(0.075, 0.083, 0.09), 0.1, 0.72),
  };
}
