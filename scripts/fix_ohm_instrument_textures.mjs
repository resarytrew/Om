import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/rendering/babylon/ProfessionalInstruments.ts';
let text = readFileSync(path, 'utf8');

const replacements = [
  [
`    material.diffuseTexture = this.texture;
    material.emissiveColor = new Color3(0.055, 0.205, 0.22);
    material.specularColor = new Color3(0.2, 0.35, 0.38);
    material.disableLighting = true;`,
`    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;`,
  ],
  [
`  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = new Color3(0.11, 0.115, 0.12);
  material.disableLighting = true;`,
`  material.diffuseTexture = texture;
  material.emissiveTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = Color3.White();
  material.disableLighting = true;`,
  ],
  [
`    faceMaterial.diffuseTexture = faceTexture;
    faceMaterial.emissiveColor = new Color3(0.105, 0.103, 0.095);
    faceMaterial.specularColor = Color3.Black();
    faceMaterial.disableLighting = true;`,
`    faceMaterial.diffuseTexture = faceTexture;
    faceMaterial.emissiveTexture = faceTexture;
    faceMaterial.emissiveColor = Color3.White();
    faceMaterial.specularColor = Color3.Black();
    faceMaterial.disableLighting = true;`,
  ],
  [
`    valueMaterial.diffuseTexture = this.valueTexture;
    valueMaterial.emissiveColor = new Color3(0.08, 0.075, 0.06);
    valueMaterial.disableLighting = true;`,
`    valueMaterial.diffuseTexture = this.valueTexture;
    valueMaterial.emissiveTexture = this.valueTexture;
    valueMaterial.emissiveColor = Color3.White();
    valueMaterial.specularColor = Color3.Black();
    valueMaterial.disableLighting = true;`,
  ],
];

for (const [from, to] of replacements) {
  if (!text.includes(from)) throw new Error(`Missing texture fragment: ${from.slice(0, 140)}`);
  text = text.replace(from, to);
}

writeFileSync(path, text);
