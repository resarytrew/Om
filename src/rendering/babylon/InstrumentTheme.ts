import {
  Color3,
  DynamicTexture,
  PBRMaterial,
  Scene,
  StandardMaterial,
  Texture,
} from '@babylonjs/core';

export interface InstrumentTheme {
  readonly graphite: PBRMaterial;
  readonly graphiteSoft: PBRMaterial;
  readonly frontPanel: PBRMaterial;
  readonly meterPanel: PBRMaterial;
  readonly meterBezel: PBRMaterial;
  readonly ceramic: PBRMaterial;
  readonly metal: PBRMaterial;
  readonly chrome: PBRMaterial;
  readonly brass: PBRMaterial;
  readonly copper: PBRMaterial;
  readonly darkMetal: PBRMaterial;
  readonly knobPlastic: PBRMaterial;
  readonly labelMetal: PBRMaterial;
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

type MicroFinish = 'powder' | 'brushed' | 'ceramic';

/**
 * Small deterministic normal maps keep procedural instruments from looking like
 * perfectly smooth CAD primitives. They are intentionally subtle: the goal is
 * powder coat / machining / ceramic grain, not visible "noise".
 */
function microNormal(
  scene: Scene,
  name: string,
  finish: MicroFinish,
  scale: number,
  level: number,
): DynamicTexture {
  const size = 128;
  const texture = new DynamicTexture(name, { width: size, height: size }, scene, false);
  const context = texture.getContext();
  const image = context.createImageData(size, size);

  const hash = (x: number, y: number): number => {
    const value = Math.sin(x * 12.9898 + y * 78.233 + 19.19) * 43758.5453;
    return value - Math.floor(value);
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const noise = hash(x, y) - 0.5;
      let nx = 128;
      let ny = 128;

      if (finish === 'brushed') {
        nx += Math.round(Math.sin(y * 1.9) * 3 + noise * 5);
        ny += Math.round(noise * 2);
      } else if (finish === 'ceramic') {
        nx += Math.round(noise * 7);
        ny += Math.round((hash(y, x) - 0.5) * 7);
      } else {
        nx += Math.round(noise * 5);
        ny += Math.round((hash(y + 7, x + 11) - 0.5) * 5);
      }

      image.data[index] = Math.max(0, Math.min(255, nx));
      image.data[index + 1] = Math.max(0, Math.min(255, ny));
      image.data[index + 2] = 255;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  texture.update(false);
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.uScale = scale;
  texture.vScale = scale;
  texture.level = level;
  return texture;
}

function applyFinish(
  material: PBRMaterial,
  texture: DynamicTexture,
  environmentIntensity: number,
): PBRMaterial {
  material.bumpTexture = texture;
  material.environmentIntensity = environmentIntensity;
  return material;
}

export function createInstrumentTheme(scene: Scene): InstrumentTheme {
  const powderNormal = microNormal(scene, 'finish-powder-normal', 'powder', 9, 0.14);
  const brushedNormal = microNormal(scene, 'finish-brushed-normal', 'brushed', 13, 0.18);
  const ceramicNormal = microNormal(scene, 'finish-ceramic-normal', 'ceramic', 7, 0.11);

  const glass = new StandardMaterial('instrument-glass', scene);
  glass.diffuseColor = new Color3(0.62, 0.76, 0.82);
  glass.specularColor = new Color3(1, 1, 1);
  glass.specularPower = 220;
  glass.alpha = 0.105;
  glass.backFaceCulling = false;
  glass.disableDepthWrite = false;

  const displayGlass = new StandardMaterial('display-glass', scene);
  displayGlass.diffuseColor = new Color3(0.008, 0.019, 0.024);
  displayGlass.specularColor = new Color3(0.82, 0.94, 1.0);
  displayGlass.specularPower = 180;
  displayGlass.emissiveColor = new Color3(0.008, 0.032, 0.041);
  displayGlass.alpha = 0.992;
  displayGlass.backFaceCulling = false;

  const ledGreen = new StandardMaterial('led-green', scene);
  ledGreen.diffuseColor = new Color3(0.035, 0.46, 0.17);
  ledGreen.emissiveColor = new Color3(0.02, 0.34, 0.11);
  ledGreen.specularColor = new Color3(0.82, 1, 0.9);
  ledGreen.specularPower = 150;

  const ledAmber = new StandardMaterial('led-amber', scene);
  ledAmber.diffuseColor = new Color3(0.78, 0.31, 0.035);
  ledAmber.emissiveColor = new Color3(0.48, 0.13, 0.006);
  ledAmber.specularColor = new Color3(1, 0.74, 0.36);
  ledAmber.specularPower = 120;

  const graphite = applyFinish(
    pbr(scene, 'graphite', new Color3(0.085, 0.096, 0.105), 0.19, 0.47),
    powderNormal,
    0.92,
  );
  graphite.clearCoat.isEnabled = true;
  graphite.clearCoat.intensity = 0.12;
  graphite.clearCoat.roughness = 0.48;

  const graphiteSoft = applyFinish(
    pbr(scene, 'graphite-soft', new Color3(0.145, 0.157, 0.168), 0.24, 0.4),
    powderNormal,
    0.96,
  );
  graphiteSoft.clearCoat.isEnabled = true;
  graphiteSoft.clearCoat.intensity = 0.16;
  graphiteSoft.clearCoat.roughness = 0.42;

  const frontPanel = applyFinish(
    pbr(scene, 'front-panel', new Color3(0.31, 0.325, 0.335), 0.3, 0.34),
    brushedNormal,
    1.05,
  );
  frontPanel.clearCoat.isEnabled = true;
  frontPanel.clearCoat.intensity = 0.18;
  frontPanel.clearCoat.roughness = 0.32;

  const meterPanel = applyFinish(
    pbr(scene, 'meter-panel', new Color3(0.39, 0.405, 0.405), 0.22, 0.38),
    powderNormal,
    0.96,
  );

  const meterBezel = applyFinish(
    pbr(scene, 'meter-bezel', new Color3(0.043, 0.049, 0.054), 0.4, 0.27),
    brushedNormal,
    1.02,
  );

  const ceramic = applyFinish(
    pbr(scene, 'ceramic', new Color3(0.865, 0.825, 0.72), 0, 0.72),
    ceramicNormal,
    0.66,
  );

  const metal = applyFinish(
    pbr(scene, 'metal', new Color3(0.67, 0.69, 0.7), 0.88, 0.18),
    brushedNormal,
    1.28,
  );

  const chrome = applyFinish(
    pbr(scene, 'chrome', new Color3(0.79, 0.81, 0.82), 0.96, 0.11),
    brushedNormal,
    1.42,
  );

  const brass = applyFinish(
    pbr(scene, 'brass', new Color3(0.62, 0.315, 0.075), 0.9, 0.19),
    brushedNormal,
    1.28,
  );

  const copper = applyFinish(
    pbr(scene, 'copper', new Color3(0.56, 0.19, 0.055), 0.9, 0.21),
    brushedNormal,
    1.24,
  );

  const darkMetal = applyFinish(
    pbr(scene, 'dark-metal', new Color3(0.105, 0.116, 0.124), 0.76, 0.22),
    brushedNormal,
    1.14,
  );

  const knobPlastic = applyFinish(
    pbr(scene, 'knob-plastic', new Color3(0.018, 0.021, 0.024), 0.03, 0.3),
    powderNormal,
    0.86,
  );
  knobPlastic.clearCoat.isEnabled = true;
  knobPlastic.clearCoat.intensity = 0.3;
  knobPlastic.clearCoat.roughness = 0.26;

  const labelMetal = applyFinish(
    pbr(scene, 'label-metal', new Color3(0.58, 0.555, 0.47), 0.38, 0.42),
    brushedNormal,
    0.92,
  );

  const rubberBlack = pbr(scene, 'rubber-black', new Color3(0.014, 0.017, 0.02), 0, 0.92);
  rubberBlack.environmentIntensity = 0.32;

  const terminalRed = pbr(scene, 'terminal-red', new Color3(0.72, 0.018, 0.026), 0.02, 0.36);
  terminalRed.clearCoat.isEnabled = true;
  terminalRed.clearCoat.intensity = 0.28;
  terminalRed.clearCoat.roughness = 0.26;

  const terminalBlack = pbr(scene, 'terminal-black', new Color3(0.012, 0.015, 0.018), 0.02, 0.42);
  terminalBlack.clearCoat.isEnabled = true;
  terminalBlack.clearCoat.intensity = 0.22;
  terminalBlack.clearCoat.roughness = 0.3;

  const terminalNeutral = applyFinish(
    pbr(scene, 'terminal-neutral', new Color3(0.31, 0.325, 0.34), 0.36, 0.3),
    brushedNormal,
    0.98,
  );

  const bench = applyFinish(
    pbr(scene, 'bench-pro', new Color3(0.225, 0.232, 0.235), 0.32, 0.35),
    brushedNormal,
    0.92,
  );

  const benchMat = pbr(scene, 'bench-mat', new Color3(0.028, 0.036, 0.042), 0.01, 0.82);
  benchMat.environmentIntensity = 0.48;

  const backdrop = pbr(scene, 'lab-backdrop', new Color3(0.016, 0.025, 0.034), 0.02, 0.9);
  backdrop.environmentIntensity = 0.22;

  return {
    graphite,
    graphiteSoft,
    frontPanel,
    meterPanel,
    meterBezel,
    ceramic,
    metal,
    chrome,
    brass,
    copper,
    darkMetal,
    knobPlastic,
    labelMetal,
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
