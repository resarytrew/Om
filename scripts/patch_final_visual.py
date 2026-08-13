from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)

lab_path = Path('src/rendering/babylon/LabScene.ts')
pro_path = Path('src/rendering/babylon/ProfessionalInstruments.ts')
lab = lab_path.read_text()
pro = pro_path.read_text()

lab = replace_once(
    lab,
    "import { createInstrumentTheme, type InstrumentTheme } from './InstrumentTheme';\n",
    "import { createInstrumentTheme, type InstrumentTheme } from './InstrumentTheme';\nimport { installOhmVisualPolish } from './InstrumentVisualPolish';\n",
    'visual polish import',
)

lab = replace_once(
    lab,
    "  readonly material: StandardMaterial;\n",
    "  readonly material: PBRMaterial;\n",
    'terminal material type',
)

lab = replace_once(
    lab,
    "    pipeline.bloomKernel = 48;\n    pipeline.bloomScale = 0.5;\n",
    "    pipeline.bloomKernel = 48;\n    pipeline.bloomScale = 0.5;\n    pipeline.sharpenEnabled = true;\n    pipeline.sharpen.edgeAmount = 0.16;\n    pipeline.sharpen.colorAmount = 0.88;\n",
    'render sharpening',
)

lab = replace_once(
    lab,
    "    this.voltmeter = new AnalogMeterVisual(\n      this.scene,\n      this.theme,\n      {\n        id: 'voltmeter',\n        label: 'voltmeter',\n        unit: 'V',\n        max: 12,\n        decimals: 2,\n        position: new Vector3(1.48, 0, 1.72),\n        plus: ids.voltmeterPlus,\n        minus: ids.voltmeterMinus,\n        width: 1.96,\n        height: 1.67,\n      },\n      registerTerminal,\n    );\n\n    this.setupInstrumentRoots();\n",
    "    this.voltmeter = new AnalogMeterVisual(\n      this.scene,\n      this.theme,\n      {\n        id: 'voltmeter',\n        label: 'voltmeter',\n        unit: 'V',\n        max: 12,\n        decimals: 2,\n        position: new Vector3(1.48, 0, 1.72),\n        plus: ids.voltmeterPlus,\n        minus: ids.voltmeterMinus,\n        width: 1.96,\n        height: 1.67,\n      },\n      registerTerminal,\n    );\n\n    installOhmVisualPolish(this.scene, this.theme);\n    this.setupInstrumentRoots();\n",
    'install polish before roots',
)

old_terminal = """    const baseColor = polarity === 'positive'
      ? new Color3(0.76, 0.028, 0.04)
      : polarity === 'negative'
        ? new Color3(0.028, 0.032, 0.036)
        : new Color3(0.31, 0.34, 0.36);
    const material = new StandardMaterial(`terminal-material:${id}`, this.scene);
    material.diffuseColor = baseColor;
    material.specularColor = new Color3(0.55, 0.55, 0.55);
    cap.material = material;
    cap.isPickable = true;
    cap.metadata = { terminalId: id } satisfies PickMetadata;

    const contact = MeshBuilder.CreateCylinder(
"""
new_terminal = """    const material = (polarity === 'positive'
      ? this.theme.terminalRed
      : polarity === 'negative'
        ? this.theme.terminalBlack
        : this.theme.terminalNeutral).clone(`terminal-material:${id}`) as PBRMaterial;
    material.environmentIntensity = 1.0;
    cap.material = material;
    cap.isPickable = true;
    cap.metadata = { terminalId: id } satisfies PickMetadata;

    for (const offset of [-0.075, -0.145]) {
      const grip = MeshBuilder.CreateTorus(
        `terminal-grip:${id}:${offset}`,
        { diameter: 0.268, thickness: 0.018, tessellation: 40 },
        this.scene,
      );
      grip.position = position.add(new Vector3(0, 0, offset));
      grip.rotation.x = Math.PI / 2;
      grip.material = material;
      grip.isPickable = false;
    }

    const contact = MeshBuilder.CreateCylinder(
"""
lab = replace_once(lab, old_terminal, new_terminal, 'PBR terminal cap')

pro = replace_once(
    pro,
    "    glass.material = theme.glass;\n    glass.isPickable = false;\n\n    const reflection = createBox(\n",
    "    glass.material = theme.displayGlass;\n    glass.isPickable = false;\n\n    const reflection = createBox(\n",
    'dark display glass',
)

old_display = """    context.fillStyle = '#03090b';
    context.fillRect(0, 0, 640, 220);
    this.texture.drawText(
      text,
      null,
      146,
      `600 ${this.spec.fontSize ?? 92}px ui-monospace, SFMono-Regular, Menlo, monospace`,
      this.spec.textColor ?? '#73e7ff',
      '#03090b',
      true,
    );
"""
new_display = """    context.fillStyle = '#02080b';
    context.fillRect(0, 0, 640, 220);
    context.fillStyle = '#0b2229';
    context.fillRect(18, 52, 604, 2);
    context.fillRect(18, 184, 604, 1);
    this.texture.drawText('CV', 26, 37, '600 27px ui-monospace, monospace', '#42c9df', null, true);
    this.texture.drawText('OUTPUT', 470, 37, '600 24px ui-monospace, monospace', '#337f8d', null, true);
    this.texture.drawText(
      text,
      null,
      151,
      `600 ${this.spec.fontSize ?? 92}px ui-monospace, SFMono-Regular, Menlo, monospace`,
      this.spec.textColor ?? '#73e7ff',
      '#02080b',
      true,
    );
    this.texture.drawText('REMOTE  OFF', 28, 207, '500 20px ui-monospace, monospace', '#285a63', null, true);
"""
pro = replace_once(pro, old_display, new_display, 'display instrumentation')

pro = replace_once(
    pro,
    "    needle.setParent(this.needlePivot);\n    needle.position = new Vector3(0, 0.31, 0);\n\n    const hub = MeshBuilder.CreateCylinder(\n",
    "    needle.setParent(this.needlePivot);\n    needle.position = new Vector3(0, 0.31, 0);\n\n    const counterweight = createBox(\n      scene,\n      `${spec.id}-needle-counterweight`,\n      new Vector3(0, -0.105, 0.002),\n      new Vector3(0.075, 0.21, 0.032),\n      theme.darkMetal,\n    );\n    counterweight.setParent(this.needlePivot);\n\n    const needleTip = createBox(\n      scene,\n      `${spec.id}-needle-tip`,\n      new Vector3(0, 0.645, -0.002),\n      new Vector3(0.024, 0.085, 0.021),\n      theme.terminalRed,\n    );\n    needleTip.setParent(this.needlePivot);\n\n    const hub = MeshBuilder.CreateCylinder(\n",
    'needle detail',
)

pro = replace_once(
    pro,
    "    ctx.strokeStyle = '#20272a';\n    ctx.lineWidth = 6;\n    ctx.beginPath();\n    ctx.arc(centerX, centerY, outerRadius, start, end, false);\n    ctx.stroke();\n\n    const tickCount = 40;\n",
    "    ctx.strokeStyle = '#20272a';\n    ctx.lineWidth = 6;\n    ctx.beginPath();\n    ctx.arc(centerX, centerY, outerRadius, start, end, false);\n    ctx.stroke();\n\n    ctx.strokeStyle = '#aeb1aa';\n    ctx.lineWidth = 2;\n    ctx.beginPath();\n    ctx.arc(centerX, centerY, outerRadius - 34, start, end, false);\n    ctx.stroke();\n\n    ctx.strokeStyle = '#a51d24';\n    ctx.lineWidth = 9;\n    ctx.beginPath();\n    ctx.arc(centerX, centerY, outerRadius - 3, start + (end - start) * 0.88, end, false);\n    ctx.stroke();\n\n    const tickCount = 40;\n",
    'dial arcs',
)

pro = replace_once(
    pro,
    "    ctx.fillText('DC', centerX - 96, 374);\n    ctx.fillText('CLASS 1.5', centerX + 74, 374);\n\n    ctx.strokeStyle = '#9e151e';\n",
    "    ctx.fillText('DC', centerX - 96, 374);\n    ctx.fillText('CLASS 1.5', centerX + 74, 374);\n    ctx.font = '600 24px Arial, sans-serif';\n    ctx.fillStyle = '#737975';\n    ctx.fillText('MOVING COIL • LAB', centerX, 430);\n\n    ctx.strokeStyle = '#9e151e';\n",
    'dial microprint',
)

lab_path.write_text(lab)
pro_path.write_text(pro)
print('final visual polish patch applied')
