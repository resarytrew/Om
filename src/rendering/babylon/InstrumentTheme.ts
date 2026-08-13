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
  glass.diffuseColor = new Color3(0.72, 0.82, 0.86);
  glass.specularColor = new Color3(1, 1, 1);
  glass.specularPower = 160;
  glass.alpha = 0.065;
  glass.backFaceCulling = false;
  glass.disableDepthWrite = false;

  const displayGlass = new StandardMaterial('display-glass', scene);
  displayGlass.diffuseColor = new Color3(0.01, 0.025, 0.03);
  displayGlass.specularColor = new Color3(0.72, 0.88, 0.94);
  displayGlass.specularPower = 120;
  displayGlass.emissiveColor = new Color3(0.012, 0.045, 0.05);
  displayGlass.alpha = 0.985;
  displayGlass.backFaceCulling = false;

  const ledGreen = new StandardMaterial('led-green', scene);
  ledGreen.diffuseColor = new Color3(0.04, 0.48, 0.18);
  ledGreen.emissiveColor = new Color3(0.025, 0.3, 0.1);
  ledGreen.specularColor = new Color3(0.8, 1, 0.9);

  const ledAmber = new StandardMaterial('led-amber', scene);
  ledAmber.diffuseColor = new Color3(0.78, 0.34, 0.045);
  ledAmber.emissiveColor = new Color3(0.44, 0.15, 0.01);

  const graphite = pbr(scene, 'graphite', new Color3(0.072, 0.082, 0.09), 0.04, 0.66);
  graphite.environmentIntensity = 0.75;

  const graphiteSoft = pbr(scene, 'graphite-soft', new Color3(0.105, 0.116, 0.124), 0.035, 0.7);
  graphiteSoft.environmentIntensity = 0.72;

  const frontPanel = pbr(scene, 'front-panel', new Color3(0.285, 0.305, 0.315), 0.13, 0.46);
  frontPanel.environmentIntensity = 0.9;

  const meterPanel = pbr(scene, 'meter-panel', new Color3(0.48, 0.49, 0.475), 0.06, 0.54);
  meterPanel.environmentIntensity = 0.82;

  const meterBezel = pbr(scene, 'meter-bezel', new Color3(0.055, 0.062, 0.067), 0.16, 0.42);
  meterBezel.environmentIntensity = 0.82;

  const ceramic = pbr(scene, 'ceramic', new Color3(0.82, 0.77, 0.65), 0, 0.82);
  ceramic.environmentIntensity = 0.55;

  const metal = pbr(scene, 'metal', new Color3(0.62, 0.64, 0.65), 0.82, 0.19);
  metal.environmentIntensity = 1.15;

  const darkMetal = pbr(scene, 'dark-metal', new Color3(0.125, 0.135, 0.142), 0.7, 0.28);
  darkMetal.environmentIntensity = 1.0;

  const rubberBlack = pbr(scene, 'rubber-black', new Color3(0.018, 0.021, 0.024), 0, 0.96);

  const terminalRed = pbr(scene, 'terminal-red', new Color3(0.68, 0.025, 0.032), 0.03, 0.52);
  const terminalBlack = pbr(scene, 'terminal-black', new Color3(0.018, 0.021, 0.024), 0.02, 0.66);
  const terminalNeutral = pbr(scene, 'terminal-neutral', new Color3(0.25, 0.27, 0.285), 0.22, 0.44);

  const bench = pbr(scene, 'bench-pro', new Color3(0.22, 0.225, 0.22), 0.02, 0.86);
  bench.environmentIntensity = 0.55;

  const benchMat = pbr(scene, 'bench-mat', new Color3(0.042, 0.052, 0.058), 0, 0.98);
  benchMat.environmentIntensity = 0.35;

  const backdrop = pbr(scene, 'lab-backdrop', new Color3(0.026, 0.033, 0.039), 0, 0.97);
  backdrop.environmentIntensity = 0.16;

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
