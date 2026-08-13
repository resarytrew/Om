from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)


professional_path = Path('src/rendering/babylon/ProfessionalInstruments.ts')
lab_path = Path('src/rendering/babylon/LabScene.ts')
professional = professional_path.read_text()
lab = lab_path.read_text()

# Display: deeper layered bezel + subtle glass, not a flat emissive plane.
professional = replace_once(professional, '''    bezel.position = spec.position.add(new Vector3(0, 0, 0.022));
    bezel.material = theme.rubberBlack;
    bezel.isPickable = false;

    const plane = MeshBuilder.CreatePlane(
''', '''    bezel.position = spec.position.add(new Vector3(0, 0, 0.022));
    bezel.material = theme.rubberBlack;
    bezel.isPickable = false;

    const trim = MeshBuilder.CreateBox(
      `${spec.id}-display-trim`,
      { width: spec.width * 1.045, height: spec.height * 1.13, depth: 0.026 },
      scene,
    );
    trim.position = spec.position.add(new Vector3(0, 0, -0.002));
    trim.material = theme.darkMetal;
    trim.isPickable = false;

    const plane = MeshBuilder.CreatePlane(
''', 'display trim')

professional = replace_once(professional, '''    glass.position = spec.position.add(new Vector3(0, 0, -0.022));
    glass.rotation.y = 0;
    glass.material = theme.glass;
    glass.isPickable = false;

    this.setValue(0);
''', '''    glass.position = spec.position.add(new Vector3(0, 0, -0.025));
    glass.rotation.y = 0;
    glass.material = theme.glass;
    glass.isPickable = false;

    const reflection = createBox(
      scene,
      `${spec.id}-display-reflection`,
      spec.position.add(new Vector3(-spec.width * 0.19, spec.height * 0.34, -0.031)),
      new Vector3(spec.width * 0.42, 0.008, 0.006),
      theme.chrome,
    );
    reflection.scaling.x = 0.82;
    reflection.isPickable = false;

    this.setValue(0);
''', 'display reflection')

# Screws now read as fasteners, not silver dots.
professional = replace_once(professional, '''  screw.material = theme.metal;
  screw.isPickable = false;
}

function createPanelFrame(
''', '''  screw.material = theme.chrome;
  screw.isPickable = false;

  const slot = createBox(
    scene,
    `${name}-slot`,
    position.add(new Vector3(0, 0, -0.021)),
    new Vector3(0.055, 0.012, 0.012),
    theme.rubberBlack,
  );
  slot.rotation.z = name.length % 2 === 0 ? 0.18 : -0.22;
  slot.isPickable = false;
}

function createPanelFrame(
''', 'screw slot')

# Reusable premium edge and grip detail helpers.
professional = replace_once(professional, '''  createBox(scene, `${prefix}-frame-right`, new Vector3(center.x + width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
}

export class PowerSupplyVisual {
''', '''  createBox(scene, `${prefix}-frame-right`, new Vector3(center.x + width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
}

function createFaceTrim(
  scene: Scene,
  theme: InstrumentTheme,
  prefix: string,
  center: Vector3,
  width: number,
  height: number,
  frontZ: number,
): void {
  const strip = 0.018;
  const depth = 0.018;
  createBox(scene, `${prefix}-trim-top`, new Vector3(center.x, center.y + height / 2, frontZ), new Vector3(width, strip, depth), theme.chrome);
  createBox(scene, `${prefix}-trim-bottom`, new Vector3(center.x, center.y - height / 2, frontZ), new Vector3(width, strip, depth), theme.chrome);
  createBox(scene, `${prefix}-trim-left`, new Vector3(center.x - width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.chrome);
  createBox(scene, `${prefix}-trim-right`, new Vector3(center.x + width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.chrome);
}

function createKnobGrip(
  scene: Scene,
  theme: InstrumentTheme,
  pivot: TransformNode,
  radius: number,
  z: number,
): void {
  for (let index = 0; index < 20; index += 1) {
    const angle = (index / 20) * Math.PI * 2;
    const rib = createBox(
      scene,
      `source-knob-grip-${index}`,
      new Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, z),
      new Vector3(0.022, 0.075, 0.026),
      theme.darkMetal,
    );
    rib.rotation.z = angle;
    rib.parent = pivot;
    rib.isPickable = false;
  }
}

export class PowerSupplyVisual {
''', 'premium helpers')

# Source panel has a machined inner trim.
professional = replace_once(professional, '''    createPanelFrame(
      scene,
      theme,
      'source',
      new Vector3(position.x, 0.94, 0),
      width * 0.94,
      height * 0.9,
      frontZ - 0.047,
    );

    createTextPlate(
''', '''    createPanelFrame(
      scene,
      theme,
      'source',
      new Vector3(position.x, 0.94, 0),
      width * 0.94,
      height * 0.9,
      frontZ - 0.047,
    );
    createFaceTrim(
      scene,
      theme,
      'source-face',
      new Vector3(position.x, 0.94, 0),
      width * 0.905,
      height * 0.855,
      frontZ - 0.094,
    );

    createTextPlate(
''', 'source face trim')

professional = replace_once(professional, '''    knobRing.rotation.x = Math.PI / 2;
    knobRing.material = theme.meterBezel;
    knobRing.isPickable = false;

    const knobCenter = new Vector3(position.x + 0.77, 1.1, frontZ - 0.17);
''', '''    knobRing.rotation.x = Math.PI / 2;
    knobRing.material = theme.chrome;
    knobRing.isPickable = false;

    const knobInnerRing = MeshBuilder.CreateTorus(
      'source-knob-inner-ring',
      { diameter: 0.61, thickness: 0.025, tessellation: 56 },
      scene,
    );
    knobInnerRing.position = new Vector3(position.x + 0.77, 1.1, frontZ - 0.126);
    knobInnerRing.rotation.x = Math.PI / 2;
    knobInnerRing.material = theme.darkMetal;
    knobInnerRing.isPickable = false;

    const knobCenter = new Vector3(position.x + 0.77, 1.1, frontZ - 0.17);
''', 'source knob rings')

professional = replace_once(professional, '''    this.knob.material = theme.darkMetal;
    this.knob.isPickable = true;
''', '''    this.knob.material = theme.knobPlastic;
    this.knob.isPickable = true;
''', 'source knob material')

professional = replace_once(professional, '''    this.knobCap.material = theme.rubberBlack;
    this.knobCap.isPickable = true;
    this.knobCap.metadata = { instrumentControl: 'source-voltage' };

    this.knobPointer = createBox(
''', '''    this.knobCap.material = theme.knobPlastic;
    this.knobCap.isPickable = true;
    this.knobCap.metadata = { instrumentControl: 'source-voltage' };

    createKnobGrip(scene, theme, this.knobPivot, 0.255, -0.16);

    const knobBoss = MeshBuilder.CreateTorus(
      'source-knob-boss',
      { diameter: 0.34, thickness: 0.018, tessellation: 48 },
      scene,
    );
    knobBoss.rotation.x = Math.PI / 2;
    knobBoss.position = new Vector3(0, 0, -0.176);
    knobBoss.parent = this.knobPivot;
    knobBoss.material = theme.chrome;
    knobBoss.isPickable = false;

    this.knobPointer = createBox(
''', 'source knob grip')

professional = replace_once(professional, '''      theme.metal,
    );
    this.knobPointer.parent = this.knobPivot;
''', '''      theme.chrome,
    );
    this.knobPointer.parent = this.knobPivot;
''', 'source knob pointer chrome')

professional = replace_once(professional, '''      theme.rubberBlack,
    );
    this.powerSwitch.rotation.z = -0.08;
''', '''      theme.knobPlastic,
    );
    this.powerSwitch.rotation.z = -0.08;
''', 'power switch material')

# LED gets a metal bezel like a real panel indicator.
professional = replace_once(professional, '''    this.statusLed.position = new Vector3(position.x + 0.62, 0.5, frontZ - 0.14);
    this.statusLed.material = theme.ledGreen;
    this.statusLed.isPickable = false;

    createTextPlate(
''', '''    this.statusLed.position = new Vector3(position.x + 0.62, 0.5, frontZ - 0.14);
    this.statusLed.material = theme.ledGreen;
    this.statusLed.isPickable = false;

    const ledBezel = MeshBuilder.CreateTorus(
      'source-status-led-bezel',
      { diameter: 0.16, thickness: 0.018, tessellation: 36 },
      scene,
    );
    ledBezel.position = new Vector3(position.x + 0.62, 0.5, frontZ - 0.118);
    ledBezel.rotation.x = Math.PI / 2;
    ledBezel.material = theme.chrome;
    ledBezel.isPickable = false;

    createTextPlate(
''', 'led bezel')

# Meter: secondary metal trim around the black bezel and a glass retaining lip.
professional = replace_once(professional, '''    createPanelFrame(
      scene,
      theme,
      spec.id,
      new Vector3(p.x, 0.96, 0),
      width * 0.95,
      height * 0.92,
      frontZ - 0.048,
    );

    const bezel = createBox(
''', '''    createPanelFrame(
      scene,
      theme,
      spec.id,
      new Vector3(p.x, 0.96, 0),
      width * 0.95,
      height * 0.92,
      frontZ - 0.048,
    );
    createFaceTrim(
      scene,
      theme,
      `${spec.id}-face`,
      new Vector3(p.x, 0.96, 0),
      width * 0.915,
      height * 0.875,
      frontZ - 0.092,
    );

    const bezel = createBox(
''', 'meter face trim')

professional = replace_once(professional, '''    bezel.isPickable = false;

    const faceWidth = width * 0.78;
''', '''    bezel.isPickable = false;

    createFaceTrim(
      scene,
      theme,
      `${spec.id}-dial`,
      new Vector3(p.x, 1.17, 0),
      width * 0.79,
      1.0,
      frontZ - 0.122,
    );

    const faceWidth = width * 0.78;
''', 'dial trim')

professional = replace_once(professional, '''    hub.material = theme.darkMetal;
    hub.isPickable = false;

    const glass = MeshBuilder.CreatePlane(
''', '''    hub.material = theme.chrome;
    hub.isPickable = false;

    const hubCap = MeshBuilder.CreateSphere(
      `${spec.id}-needle-hub-cap`,
      { diameter: 0.11, segments: 20 },
      scene,
    );
    hubCap.position = this.needlePivot.position.add(new Vector3(0, 0, -0.06));
    hubCap.scaling.z = 0.38;
    hubCap.material = theme.darkMetal;
    hubCap.isPickable = false;

    const glass = MeshBuilder.CreatePlane(
''', 'needle hub')

# Add a proper zero-adjust fastener to the meter lower face.
professional = replace_once(professional, '''    this.warningLed.isPickable = false;

    registerTerminal(
''', '''    this.warningLed.isPickable = false;

    const zeroAdjust = MeshBuilder.CreateCylinder(
      `${spec.id}-zero-adjust`,
      { height: 0.055, diameter: 0.19, tessellation: 32 },
      scene,
    );
    zeroAdjust.position = new Vector3(p.x, 0.35, frontZ - 0.16);
    zeroAdjust.rotation.x = Math.PI / 2;
    zeroAdjust.material = theme.darkMetal;
    zeroAdjust.isPickable = false;
    const zeroSlot = createBox(
      scene,
      `${spec.id}-zero-adjust-slot`,
      new Vector3(p.x, 0.35, frontZ - 0.193),
      new Vector3(0.105, 0.014, 0.014),
      theme.chrome,
    );
    zeroSlot.rotation.z = -0.08;

    registerTerminal(
''', 'meter zero adjust')

# Resistor base gets a metallic perimeter and proper copper/brass end hardware.
professional = replace_once(professional, '''    createBox(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.42, 0.13, 0.9),
      theme.meterPanel,
    );

    for (const x of [-0.9, 0.9]) {
''', '''    createBox(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.42, 0.13, 0.9),
      theme.meterPanel,
    );
    createBox(scene, 'resistor-edge-front', new Vector3(position.x, 0.43, position.z - 0.44), new Vector3(2.5, 0.045, 0.04), theme.chrome);
    createBox(scene, 'resistor-edge-back', new Vector3(position.x, 0.43, position.z + 0.5), new Vector3(2.5, 0.045, 0.04), theme.chrome);
    createBox(scene, 'resistor-edge-left', new Vector3(position.x - 1.23, 0.43, position.z + 0.03), new Vector3(0.04, 0.045, 0.9), theme.chrome);
    createBox(scene, 'resistor-edge-right', new Vector3(position.x + 1.23, 0.43, position.z + 0.03), new Vector3(0.04, 0.045, 0.9), theme.chrome);

    for (const x of [-0.9, 0.9]) {
''', 'resistor edge trim')

professional = replace_once(professional, '''      cap.parent = this.resistorPivot;
      cap.material = theme.metal;
      cap.isPickable = true;
''', '''      cap.parent = this.resistorPivot;
      cap.material = theme.copper;
      cap.isPickable = true;
''', 'resistor copper caps')

professional = replace_once(professional, '''      clip.isPickable = false;
    }

    const valuePlate = MeshBuilder.CreatePlane(
''', '''      clip.material = theme.darkMetal;
      clip.isPickable = false;

      const collar = MeshBuilder.CreateTorus(
        `resistor-brass-collar-${offset}`,
        { diameter: 0.5, thickness: 0.04, tessellation: 44 },
        scene,
      );
      collar.position = new Vector3(offset * 0.82, 0, 0);
      collar.rotation.z = Math.PI / 2;
      collar.parent = this.resistorPivot;
      collar.material = theme.brass;
      collar.isPickable = false;
    }

    for (const x of [-0.48, 0, 0.48]) {
      const ceramicBand = MeshBuilder.CreateTorus(
        `resistor-ceramic-band-${x}`,
        { diameter: 0.447, thickness: 0.012, tessellation: 44 },
        scene,
      );
      ceramicBand.position = new Vector3(x, 0, 0);
      ceramicBand.rotation.z = Math.PI / 2;
      ceramicBand.parent = this.resistorPivot;
      ceramicBand.material = theme.labelMetal;
      ceramicBand.isPickable = false;
    }

    const valueBacking = createBox(
      scene,
      'resistor-value-backing',
      new Vector3(position.x, 0.27, position.z - 0.605),
      new Vector3(1.08, 0.34, 0.045),
      theme.labelMetal,
    );
    valueBacking.isPickable = false;

    const valuePlate = MeshBuilder.CreatePlane(
''', 'resistor collars bands plate')

# Lab: improve tone and platform edging.
lab = replace_once(lab, '''    this.scene.imageProcessingConfiguration.contrast = 1.1;
    this.scene.imageProcessingConfiguration.exposure = 1.08;
''', '''    this.scene.imageProcessingConfiguration.contrast = 1.16;
    this.scene.imageProcessingConfiguration.exposure = 1.03;
    this.scene.imageProcessingConfiguration.toneMappingEnabled = true;
''', 'image processing')

lab = replace_once(lab, '''    pipeline.bloomThreshold = 0.96;
    pipeline.bloomWeight = 0.055;
''', '''    pipeline.bloomThreshold = 0.9;
    pipeline.bloomWeight = 0.07;
''', 'bloom')

lab = replace_once(lab, '''    key.intensity = 1.48;
    key.diffuse = new Color3(1.0, 0.91, 0.8);
''', '''    key.intensity = 1.62;
    key.diffuse = new Color3(1.0, 0.9, 0.79);
    key.specular = new Color3(1.0, 0.93, 0.84);
''', 'key light')

lab = replace_once(lab, '''    fill.intensity = 7.8;
    fill.diffuse = new Color3(0.67, 0.82, 0.95);
''', '''    fill.intensity = 6.4;
    fill.diffuse = new Color3(0.58, 0.79, 0.98);
    fill.specular = new Color3(0.64, 0.84, 1.0);
''', 'fill light')

lab = replace_once(lab, '''    rim.intensity = 6.6;
    rim.diffuse = new Color3(0.5, 0.7, 0.86);
''', '''    rim.intensity = 7.2;
    rim.diffuse = new Color3(0.38, 0.68, 0.96);
    rim.specular = new Color3(0.48, 0.76, 1.0);
''', 'rim light')

lab = replace_once(lab, '''    mat.material = this.theme.benchMat;
    mat.receiveShadows = true;
    mat.isPickable = false;

    const frontLip = MeshBuilder.CreateBox(
''', '''    mat.material = this.theme.benchMat;
    mat.receiveShadows = true;
    mat.isPickable = false;

    const matFrontTrim = MeshBuilder.CreateBox(
      'bench-mat-front-trim',
      { width: 9.94, height: 0.035, depth: 0.035 },
      this.scene,
    );
    matFrontTrim.position = new Vector3(0, 0.052, -1.835);
    matFrontTrim.material = this.theme.chrome;
    matFrontTrim.isPickable = false;

    for (const x of [-4.97, 4.97]) {
      const sideTrim = MeshBuilder.CreateBox(
        `bench-mat-side-trim-${x}`,
        { width: 0.035, height: 0.035, depth: 4.63 },
        this.scene,
      );
      sideTrim.position = new Vector3(x, 0.052, 0.48);
      sideTrim.material = this.theme.chrome;
      sideTrim.isPickable = false;
    }

    const frontLip = MeshBuilder.CreateBox(
''', 'bench mat trim')

# Terminals: insulating collar + machined washer/nut/contact.
lab = replace_once(lab, '''    metalBase.rotation.x = Math.PI / 2;
    metalBase.material = this.theme.metal;
    metalBase.isPickable = false;

    const ring = MeshBuilder.CreateTorus(
''', '''    metalBase.rotation.x = Math.PI / 2;
    metalBase.material = this.theme.darkMetal;
    metalBase.isPickable = false;

    const insulator = MeshBuilder.CreateCylinder(
      `terminal-insulator:${id}`,
      { height: 0.115, diameter: 0.39, tessellation: 40 },
      this.scene,
    );
    insulator.position = position.add(new Vector3(0, 0, 0.005));
    insulator.rotation.x = Math.PI / 2;
    insulator.material = polarity === 'positive'
      ? this.theme.terminalRed
      : polarity === 'negative'
        ? this.theme.terminalBlack
        : this.theme.terminalNeutral;
    insulator.isPickable = false;

    const ring = MeshBuilder.CreateTorus(
''', 'terminal insulator')

lab = replace_once(lab, '''    ring.rotation.x = Math.PI / 2;
    ring.material = this.theme.metal;
    ring.isPickable = false;

    const cap = MeshBuilder.CreateCylinder(
''', '''    ring.rotation.x = Math.PI / 2;
    ring.material = this.theme.chrome;
    ring.isPickable = false;

    const nut = MeshBuilder.CreateCylinder(
      `terminal-nut:${id}`,
      { height: 0.052, diameter: 0.285, tessellation: 6 },
      this.scene,
    );
    nut.position = position.add(new Vector3(0, 0, -0.145));
    nut.rotation.x = Math.PI / 2;
    nut.rotation.y = Math.PI / 6;
    nut.material = this.theme.chrome;
    nut.isPickable = false;

    const cap = MeshBuilder.CreateCylinder(
''', 'terminal nut')

lab = replace_once(lab, '''    contact.rotation.x = Math.PI / 2;
    contact.material = this.theme.metal;
    contact.isPickable = false;
''', '''    contact.rotation.x = Math.PI / 2;
    contact.material = this.theme.chrome;
    contact.isPickable = false;
''', 'terminal contact chrome')

professional_path.write_text(professional)
lab_path.write_text(lab)
print('reference detail pass applied')
