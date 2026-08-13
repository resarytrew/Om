import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/rendering/babylon/LabScene.ts';
let text = readFileSync(path, 'utf8');

const importAnchor = "import { createInstrumentTheme, type InstrumentTheme } from './InstrumentTheme';";
const importLine = `${importAnchor}\nimport { installOhmGlbShells } from './GlbInstrumentShells';`;
if (!text.includes("./GlbInstrumentShells")) {
  if (!text.includes(importAnchor)) throw new Error('InstrumentTheme import anchor not found');
  text = text.replace(importAnchor, importLine);
}

const shadowAnchor = `      shadow.addShadowCaster(mesh, true);\n    }\n  }\n\n  private createTerminal(`;
const shadowReplacement = `      shadow.addShadowCaster(mesh, true);\n    }\n\n    installOhmGlbShells(this.scene, shadow);\n  }\n\n  private createTerminal(`;
if (!text.includes('installOhmGlbShells(this.scene, shadow)')) {
  if (!text.includes(shadowAnchor)) throw new Error('buildScene shadow anchor not found');
  text = text.replace(shadowAnchor, shadowReplacement);
}

writeFileSync(path, text);
