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
  glass.diffuseColor = new Color3(0.66, 0.78, 0.84);
  glass.specularColor = new Color3(1, 1, 1);
  glass.specularPower = 190;
  glass.alpha = 0.055;
  glass.backFaceCulling = false;
  glass.disableDepthWrite = false;

  const displayGlass = new StandardMaterial('display-glass', scene);
  displayGlass.diffuseColor = new Color3(0.006, 0.018, 0.022);
  displayGlass.specularColor = new Color3(0.78, 0.91, 0.96);
  displayGlass.specularPower = 150;
  displayGlass.emissiveColor = new Color3(0.012, 0.05, 0.058);
  displayGlass.alpha = 0.99;
  displayGlass.backFaceCulling = false;

  const ledGreen = new StandardMaterial('led-green', scene);
  ledGreen.diffuseColor = new Color3(0.04, 0.48, 0.18);
  ledGreen.emissiveColor = new Color3(0.025, 0.3, 0.1);
  ledGreen.specularColor = new Color3(0.8, 1, 0.9);

  const ledAmber = new StandardMaterial('led-amber', scene);
  ledAmber.diffuseColor = new Color3(0.78, 0.34, 0.045);
  ledAmber.emissiveColor = new Color3(0.44, 0.15, 0.01);

  const graphite = pbr(scene, 'graphite', new Color3(0.058, 0.066, 0.073), 0.055, 0.7);
  graphite.environmentIntensity = 0.68;

  const graphiteSoft = pbr(scene, 'graphite-soft', new Color3(0.085, 0.095, 0.103), 0.045, 0.72);
  graphiteSoft.environmentIntensity = 0.68;

  const frontPanel = pbr(scene, 'front-panel', new Color3(0.245, 0.26, 0.268), 0.16, 0.47);
  frontPanel.environmentIntensity = 0.86;

  const meterPanel = pbr(scene, 'meter-panel', new Color3(0.57, 0.58, 0.565), 0.035, 0.64);
  meterPanel.environmentIntensity = 0.72;

  const meterBezel = pbr(scene, 'meter-bezel', new Color3(0.042, 0.048, 0.052), 0.2, 0.4);
  meterBezel.environmentIntensity = 0.84;

  const ceramic = pbr(scene, 'ceramic', new Color3(0.79, 0.735, 0.61), 0, 0.88);
  ceramic.environmentIntensity = 0.5;

  const metal = pbr(scene, 'metal', new Color3(0.66, 0.68, 0.69), 0.86, 0.17);
  metal.environmentIntensity = 1.18;

  const darkMetal = pbr(scene, 'dark-metal', new Color3(0.095, 0.105, 0.112), 0.74, 0.27);
  darkMetal.environmentIntensity = 1.0;

  const rubberBlack = pbr(scene, 'rubber-black', new Color3(0.012, 0.014, 0.017), 0, 0.98);

  const terminalRed = pbr(scene, 'terminal-red', new Color3(0.64, 0.018, 0.026), 0.025, 0.56);
  const terminalBlack = pbr(scene, 'terminal-black', new Color3(0.012, 0.014, 0.017), 0.02, 0.7);
  const terminalNeutral = pbr(scene, 'terminal-neutral', new Color3(0.22, 0.24, 0.255), 0.22, 0.46);

  const bench = pbr(scene, 'bench-pro', new Color3(0.155, 0.165, 0.17), 0.025, 0.9);
  bench.environmentIntensity = 0.48;

  const benchMat = pbr(scene, 'bench-mat', new Color3(0.032, 0.04, 0.046), 0, 0.99);
  benchMat.environmentIntensity = 0.3;

  const backdrop = pbr(scene, 'lab-backdrop', new Color3(0.014, 0.018, 0.022), 0, 1);
  backdrop.environmentIntensity = 0;
  backdrop.unlit = true;

  return {
    graphite,
    graphiteSoft,
    frontPanel,
    meterPanel,
    meterBezel,
    ceramic,
    metal,
    darkMetal,
    rubberBlack,
    terminalRed,
    terminalBlack,
    terminalNeutral,
    glass,
    ledGreen,
    ledAmber,
    displayGlass,
    bench,
    benchMat,
    backdrop,
  };
}
