import {
  Color3,
  DynamicTexture,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import type { TerminalId } from '../../core/types';
import type { InstrumentTheme } from './InstrumentTheme';

export type TerminalPolarity = 'positive' | 'negative' | 'neutral';
export type TerminalRegistrar = (
  id: TerminalId,
  position: Vector3,
  polarity: TerminalPolarity,
) => Mesh;

interface DisplaySpec {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly unit: string;
  readonly decimals: number;
  readonly position: Vector3;
  readonly textColor?: string;
  readonly fontSize?: number;
}

class DigitalDisplay {
  private readonly texture: DynamicTexture;
  private readonly spec: DisplaySpec;

  constructor(scene: Scene, theme: InstrumentTheme, spec: DisplaySpec) {
    this.spec = spec;
    const bezel = MeshBuilder.CreateBox(
      `${spec.id}-display-bezel`,
      { width: spec.width * 1.1, height: spec.height * 1.22, depth: 0.055 },
      scene,
    );
    bezel.position = spec.position.add(new Vector3(0, 0, 0.022));
    bezel.material = theme.rubberBlack;
    bezel.isPickable = false;

    const plane = MeshBuilder.CreatePlane(
      `${spec.id}-display-plane`,
      { width: spec.width, height: spec.height },
      scene,
    );
    plane.position = spec.position.add(new Vector3(0, 0, -0.012));
    plane.rotation.y = Math.PI;
    plane.isPickable = false;

    this.texture = new DynamicTexture(
      `${spec.id}-display-texture`,
      { width: 640, height: 220 },
      scene,
      true,
    );
    this.texture.hasAlpha = true;

    const material = new StandardMaterial(`${spec.id}-display-material`, scene);
    material.diffuseTexture = this.texture;
    material.emissiveColor = new Color3(0.055, 0.205, 0.22);
    material.specularColor = new Color3(0.2, 0.35, 0.38);
    material.disableLighting = true;
    material.backFaceCulling = false;
    plane.material = material;

    const glass = MeshBuilder.CreatePlane(
      `${spec.id}-display-glass`,
      { width: spec.width * 1.035, height: spec.height * 1.08 },
      scene,
    );
    glass.position = spec.position.add(new Vector3(0, 0, -0.022));
    glass.rotation.y = Math.PI;
    glass.material = theme.glass;
    glass.isPickable = false;

    this.setValue(0);
  }

  setValue(value: number): void {
    const finite = Number.isFinite(value);
    const text = finite
      ? `${value.toFixed(this.spec.decimals)} ${this.spec.unit}`
      : `OVER ${this.spec.unit}`;
    const context = this.texture.getContext();
    context.clearRect(0, 0, 640, 220);
    context.fillStyle = '#03090b';
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
  }
}

function createBox(
  scene: Scene,
  name: string,
  position: Vector3,
  size: Vector3,
  material: PBRMaterial | StandardMaterial,
): Mesh {
  const mesh = MeshBuilder.CreateBox(
    name,
    { width: size.x, height: size.y, depth: size.z },
    scene,
  );
  mesh.position = position;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function createTextPlate(
  scene: Scene,
  id: string,
  position: Vector3,
  width: number,
  height: number,
  lines: readonly string[],
  color = '#d9e0e4',
  background = 'transparent',
  firstFontSize = 48,
  secondFontSize = 35,
): Mesh {
  const plane = MeshBuilder.CreatePlane(id, { width, height }, scene);
  plane.position = position;
  plane.rotation.y = Math.PI;
  plane.isPickable = false;

  const texture = new DynamicTexture(`${id}-texture`, { width: 900, height: 260 }, scene, true);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 900, 260);
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 900, 260);
  }
  const lineHeight = 82;
  const startY = 78 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    texture.drawText(
      line,
      null,
      startY + index * lineHeight,
      index === 0
        ? `600 ${firstFontSize}px Inter, Arial, sans-serif`
        : `500 ${secondFontSize}px Inter, Arial, sans-serif`,
      color,
      null,
      true,
    );
  });

  const material = new StandardMaterial(`${id}-material`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = new Color3(0.11, 0.115, 0.12);
  material.disableLighting = true;
  material.backFaceCulling = false;
  plane.material = material;
  return plane;
}

function createFeet(
  scene: Scene,
  theme: InstrumentTheme,
  prefix: string,
  center: Vector3,
  width: number,
  depth: number,
): void {
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const foot = MeshBuilder.CreateCylinder(
        `${prefix}-foot-${x}-${z}`,
        { height: 0.105, diameter: 0.24, tessellation: 24 },
        scene,
      );
      foot.position = new Vector3(
        center.x + x * width * 0.38,
        0.055,
        center.z + z * depth * 0.33,
      );
      foot.material = theme.rubberBlack;
      foot.isPickable = false;
    }
  }
}

function createScrew(
  scene: Scene,
  theme: InstrumentTheme,
  name: string,
  position: Vector3,
): void {
  const screw = MeshBuilder.CreateCylinder(
    name,
    { height: 0.032, diameter: 0.085, tessellation: 24 },
    scene,
  );
  screw.position = position;
  screw.rotation.x = Math.PI / 2;
  screw.material = theme.metal;
  screw.isPickable = false;
}

function createPanelFrame(
  scene: Scene,
  theme: InstrumentTheme,
  prefix: string,
  center: Vector3,
  width: number,
  height: number,
  frontZ: number,
): void {
  const strip = 0.07;
  const depth = 0.055;
  createBox(scene, `${prefix}-frame-top`, new Vector3(center.x, center.y + height / 2, frontZ), new Vector3(width, strip, depth), theme.meterBezel);
  createBox(scene, `${prefix}-frame-bottom`, new Vector3(center.x, center.y - height / 2, frontZ), new Vector3(width, strip, depth), theme.meterBezel);
  createBox(scene, `${prefix}-frame-left`, new Vector3(center.x - width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
  createBox(scene, `${prefix}-frame-right`, new Vector3(center.x + width / 2, center.y, frontZ), new Vector3(strip, height, depth), theme.meterBezel);
}

export class PowerSupplyVisual {
  private readonly display: DigitalDisplay;
  private readonly statusLed: Mesh;
  private readonly knob: Mesh;
  private readonly knobPointer: Mesh;
  private targetKnob = 0;
  private currentKnob = 0;

  constructor(
    scene: Scene,
    theme: InstrumentTheme,
    position: Vector3,
    sourcePlus: TerminalId,
    sourceMinus: TerminalId,
    registerTerminal: TerminalRegistrar,
  ) {
    const width = 2.62;
    const height = 1.64;
    const depth = 1.46;
    const bodyCenter = new Vector3(position.x, 0.94, position.z);
    const frontZ = position.z - depth / 2 - 0.055;

    createFeet(scene, theme, 'source', position, width, depth);
    createBox(scene, 'source-shell', bodyCenter, new Vector3(width, height, depth), theme.graphiteSoft);
    createBox(
      scene,
      'source-front-panel',
      new Vector3(position.x, 0.94, frontZ),
      new Vector3(width * 0.94, height * 0.9, 0.085),
      theme.frontPanel,
    );
    createPanelFrame(
      scene,
      theme,
      'source',
      new Vector3(position.x, 0.94, 0),
      width * 0.94,
      height * 0.9,
      frontZ - 0.047,
    );

    createTextPlate(
      scene,
      'source-title',
      new Vector3(position.x - 0.42, 1.53, frontZ - 0.07),
      1.56,
      0.28,
      ['DC POWER SUPPLY', '0–12 V  •  LAB OUTPUT'],
      '#edf2f4',
      'transparent',
      46,
      31,
    );

    this.display = new DigitalDisplay(scene, theme, {
      id: 'source',
      width: 1.16,
      height: 0.42,
      unit: 'V',
      decimals: 2,
      position: new Vector3(position.x - 0.46, 1.12, frontZ - 0.074),
      textColor: '#7beaff',
      fontSize: 94,
    });

    const knobRing = MeshBuilder.CreateTorus(
      'source-knob-ring',
      { diameter: 0.69, thickness: 0.055, tessellation: 48 },
      scene,
    );
    knobRing.position = new Vector3(position.x + 0.77, 1.1, frontZ - 0.105);
    knobRing.rotation.x = Math.PI / 2;
    knobRing.material = theme.meterBezel;
    knobRing.isPickable = false;

    this.knob = MeshBuilder.CreateCylinder(
      'source-voltage-knob',
      { height: 0.29, diameter: 0.56, tessellation: 48 },
      scene,
    );
    this.knob.position = new Vector3(position.x + 0.77, 1.1, frontZ - 0.17);
    this.knob.rotation.x = Math.PI / 2;
    this.knob.material = theme.darkMetal;
    this.knob.isPickable = false;

    const knobCap = MeshBuilder.CreateCylinder(
      'source-knob-cap',
      { height: 0.305, diameter: 0.34, tessellation: 48 },
      scene,
    );
    knobCap.position = this.knob.position.add(new Vector3(0, 0, -0.018));
    knobCap.rotation.x = Math.PI / 2;
    knobCap.material = theme.rubberBlack;
    knobCap.isPickable = false;

    this.knobPointer = createBox(
      scene,
      'source-knob-index',
      new Vector3(position.x + 0.77, 1.34, frontZ - 0.335),
      new Vector3(0.035, 0.14, 0.022),
      theme.metal,
    );

    createTextPlate(
      scene,
      'source-voltage-label',
      new Vector3(position.x + 0.77, 0.72, frontZ - 0.08),
      0.88,
      0.18,
      ['VOLTAGE'],
      '#e0e6e8',
      'transparent',
      38,
      30,
    );

    const powerSwitch = createBox(
      scene,
      'source-power-switch',
      new Vector3(position.x + 1.08, 0.5, frontZ - 0.08),
      new Vector3(0.32, 0.23, 0.085),
      theme.rubberBlack,
    );
    powerSwitch.rotation.z = -0.06;

    this.statusLed = MeshBuilder.CreateSphere(
      'source-status-led',
      { diameter: 0.125, segments: 22 },
      scene,
    );
    this.statusLed.position = new Vector3(position.x + 0.62, 0.5, frontZ - 0.14);
    this.statusLed.material = theme.ledGreen;
    this.statusLed.isPickable = false;

    createTextPlate(
      scene,
      'source-output-label',
      new Vector3(position.x - 0.52, 0.65, frontZ - 0.075),
      0.9,
      0.16,
      ['OUTPUT'],
      '#e2e7e9',
      'transparent',
      34,
      28,
    );

    registerTerminal(
      sourcePlus,
      new Vector3(position.x - 0.72, 0.39, frontZ - 0.08),
      'positive',
    );
    registerTerminal(
      sourceMinus,
      new Vector3(position.x - 0.22, 0.39, frontZ - 0.08),
      'negative',
    );

    createTextPlate(
      scene,
      'source-plus-label',
      new Vector3(position.x - 0.72, 0.18, frontZ - 0.075),
      0.22,
      0.14,
      ['+'],
      '#ffe5e5',
      'transparent',
      48,
      30,
    );
    createTextPlate(
      scene,
      'source-minus-label',
      new Vector3(position.x - 0.22, 0.18, frontZ - 0.075),
      0.22,
      0.14,
      ['−'],
      '#e8ecee',
      'transparent',
      48,
      30,
    );

    for (let index = 0; index < 7; index += 1) {
      createBox(
        scene,
        `source-vent-${index}`,
        new Vector3(position.x - 0.84 + index * 0.28, 1.805, position.z + 0.14),
        new Vector3(0.14, 0.026, 0.7),
        theme.darkMetal,
      );
    }

    createScrew(scene, theme, 'source-screw-lt', new Vector3(position.x - 1.16, 1.55, frontZ - 0.08));
    createScrew(scene, theme, 'source-screw-rt', new Vector3(position.x + 1.16, 1.55, frontZ - 0.08));
    createScrew(scene, theme, 'source-screw-lb', new Vector3(position.x - 1.16, 0.27, frontZ - 0.08));
    createScrew(scene, theme, 'source-screw-rb', new Vector3(position.x + 1.16, 0.27, frontZ - 0.08));
  }

  setVoltage(value: number): void {
    this.display.setValue(value);
    const ratio = Math.min(1, Math.max(0, value / 12));
    this.targetKnob = -0.82 + ratio * 1.64;
  }

  setActive(active: boolean, warning = false): void {
    const material = this.statusLed.material as StandardMaterial | null;
    if (!material) return;
    material.diffuseColor = warning
      ? new Color3(0.76, 0.3, 0.025)
      : active
        ? new Color3(0.05, 0.5, 0.18)
        : new Color3(0.09, 0.11, 0.095);
    material.emissiveColor = warning
      ? new Color3(0.52, 0.15, 0.005)
      : active
        ? new Color3(0.04, 0.36, 0.13)
        : Color3.Black();
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 8);
    this.currentKnob += (this.targetKnob - this.currentKnob) * factor;
    this.knob.rotation.z = this.currentKnob;
    this.knobPointer.rotation.z = this.currentKnob;
  }
}

interface AnalogMeterSpec {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly max: number;
  readonly decimals: number;
  readonly position: Vector3;
  readonly plus: TerminalId;
  readonly minus: TerminalId;
  readonly width?: number;
  readonly height?: number;
}

export class AnalogMeterVisual {
  private readonly display: DigitalDisplay;
  private readonly needlePivot: TransformNode;
  private readonly warningLed: Mesh;
  private targetAngle = 0;
  private currentAngle = 0;
  private readonly max: number;

  constructor(
    scene: Scene,
    theme: InstrumentTheme,
    spec: AnalogMeterSpec,
    registerTerminal: TerminalRegistrar,
  ) {
    this.max = spec.max;
    const width = spec.width ?? 2.08;
    const height = spec.height ?? 1.78;
    const depth = 0.84;
    const p = spec.position;
    const frontZ = p.z - depth / 2 - 0.055;

    createFeet(scene, theme, spec.id, p, width, depth);
    createBox(
      scene,
      `${spec.id}-shell`,
      new Vector3(p.x, 0.96, p.z),
      new Vector3(width, height, depth),
      theme.graphite,
    );
    createBox(
      scene,
      `${spec.id}-front`,
      new Vector3(p.x, 0.96, frontZ),
      new Vector3(width * 0.95, height * 0.92, 0.085),
      theme.meterPanel,
    );
    createPanelFrame(
      scene,
      theme,
      spec.id,
      new Vector3(p.x, 0.96, 0),
      width * 0.95,
      height * 0.92,
      frontZ - 0.048,
    );

    const bezel = createBox(
      scene,
      `${spec.id}-dial-bezel`,
      new Vector3(p.x, 1.17, frontZ - 0.085),
      new Vector3(width * 0.84, 1.08, 0.06),
      theme.meterBezel,
    );
    bezel.isPickable = false;

    const faceWidth = width * 0.78;
    const faceHeight = 0.96;
    const face = MeshBuilder.CreatePlane(
      `${spec.id}-dial-face`,
      { width: faceWidth, height: faceHeight },
      scene,
    );
    face.position = new Vector3(p.x, 1.17, frontZ - 0.123);
    face.rotation.y = Math.PI;
    face.isPickable = false;
    const faceTexture = this.createDialTexture(scene, spec);
    const faceMaterial = new StandardMaterial(`${spec.id}-dial-material`, scene);
    faceMaterial.diffuseTexture = faceTexture;
    faceMaterial.emissiveColor = new Color3(0.16, 0.16, 0.145);
    faceMaterial.backFaceCulling = false;
    face.material = faceMaterial;

    this.needlePivot = new TransformNode(`${spec.id}-needle-pivot`, scene);
    this.needlePivot.position = new Vector3(p.x, 0.895, frontZ - 0.155);
    const needle = createBox(
      scene,
      `${spec.id}-needle`,
      new Vector3(0, 0, 0),
      new Vector3(0.038, 0.62, 0.026),
      theme.terminalRed,
    );
    needle.setParent(this.needlePivot);
    needle.position = new Vector3(0, 0.31, 0);

    const hub = MeshBuilder.CreateCylinder(
      `${spec.id}-needle-hub`,
      { height: 0.075, diameter: 0.16, tessellation: 32 },
      scene,
    );
    hub.position = this.needlePivot.position.add(new Vector3(0, 0, -0.014));
    hub.rotation.x = Math.PI / 2;
    hub.material = theme.darkMetal;
    hub.isPickable = false;

    const glass = MeshBuilder.CreatePlane(
      `${spec.id}-dial-glass`,
      { width: faceWidth * 1.02, height: faceHeight * 1.02 },
      scene,
    );
    glass.position = new Vector3(p.x, 1.17, frontZ - 0.168);
    glass.rotation.y = Math.PI;
    glass.material = theme.glass;
    glass.isPickable = false;

    createTextPlate(
      scene,
      `${spec.id}-brand`,
      new Vector3(p.x, 1.71, frontZ - 0.13),
      1.45,
      0.18,
      [`LAB ${spec.label.toUpperCase()}`],
      '#20282c',
      'transparent',
      34,
      28,
    );

    this.display = new DigitalDisplay(scene, theme, {
      id: `${spec.id}-digital`,
      width: 0.9,
      height: 0.24,
      unit: spec.unit,
      decimals: spec.decimals,
      position: new Vector3(p.x, 0.44, frontZ - 0.13),
      textColor: '#72e5f7',
      fontSize: 72,
    });

    this.warningLed = MeshBuilder.CreateSphere(
      `${spec.id}-warning-led`,
      { diameter: 0.1, segments: 20 },
      scene,
    );
    this.warningLed.position = new Vector3(p.x + 0.7, 0.44, frontZ - 0.18);
    this.warningLed.material = theme.ledGreen.clone(`${spec.id}-led-material`);
    this.warningLed.isPickable = false;

    registerTerminal(
      spec.plus,
      new Vector3(p.x - 0.58, 0.21, frontZ - 0.11),
      'positive',
    );
    registerTerminal(
      spec.minus,
      new Vector3(p.x + 0.58, 0.21, frontZ - 0.11),
      'negative',
    );

    createTextPlate(scene, `${spec.id}-plus-label`, new Vector3(p.x - 0.58, 0.055, frontZ - 0.12), 0.22, 0.12, ['+'], '#a3131f', 'transparent', 42, 30);
    createTextPlate(scene, `${spec.id}-minus-label`, new Vector3(p.x + 0.58, 0.055, frontZ - 0.12), 0.3, 0.12, ['COM'], '#20282c', 'transparent', 27, 24);

    createScrew(scene, theme, `${spec.id}-screw-lt`, new Vector3(p.x - width * 0.41, 1.71, frontZ - 0.11));
    createScrew(scene, theme, `${spec.id}-screw-rt`, new Vector3(p.x + width * 0.41, 1.71, frontZ - 0.11));
    createScrew(scene, theme, `${spec.id}-screw-lb`, new Vector3(p.x - width * 0.41, 0.2, frontZ - 0.11));
    createScrew(scene, theme, `${spec.id}-screw-rb`, new Vector3(p.x + width * 0.41, 0.2, frontZ - 0.11));

    this.setValue(0, false);
  }

  setValue(value: number, overload: boolean): void {
    const safe = Number.isFinite(value) ? Math.max(0, value) : this.max;
    const ratio = Math.min(1, safe / this.max);
    this.targetAngle = 1.03 - ratio * 2.06;
    this.display.setValue(overload ? Number.POSITIVE_INFINITY : value);

    const material = this.warningLed.material as StandardMaterial | null;
    if (material) {
      material.diffuseColor = overload
        ? new Color3(0.76, 0.18, 0.03)
        : new Color3(0.05, 0.46, 0.18);
      material.emissiveColor = overload
        ? new Color3(0.56, 0.08, 0.01)
        : new Color3(0.035, 0.27, 0.1);
    }
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 9);
    this.currentAngle += (this.targetAngle - this.currentAngle) * factor;
    this.needlePivot.rotation.z = this.currentAngle;
  }

  private createDialTexture(scene: Scene, spec: AnalogMeterSpec): DynamicTexture {
    const texture = new DynamicTexture(
      `${spec.id}-dial-texture`,
      { width: 1200, height: 660 },
      scene,
      true,
    );
    texture.hasAlpha = false;
    const ctx = texture.getContext();
    ctx.fillStyle = '#f4f1e8';
    ctx.fillRect(0, 0, 1200, 660);

    ctx.strokeStyle = '#c9c7bf';
    ctx.lineWidth = 4;
    ctx.strokeRect(18, 18, 1164, 624);

    const centerX = 600;
    const centerY = 535;
    const outerRadius = 395;
    const start = Math.PI * 1.17;
    const end = Math.PI * 1.83;

    ctx.strokeStyle = '#20272a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, start, end, false);
    ctx.stroke();

    const tickCount = 40;
    for (let index = 0; index <= tickCount; index += 1) {
      const ratio = index / tickCount;
      const angle = start + (end - start) * ratio;
      const labelled = index % 10 === 0;
      const major = index % 5 === 0;
      const inner = labelled ? 328 : major ? 342 : 356;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
      ctx.lineTo(centerX + Math.cos(angle) * outerRadius, centerY + Math.sin(angle) * outerRadius);
      ctx.lineWidth = labelled ? 7 : major ? 5 : 2.5;
      ctx.strokeStyle = labelled ? '#1e2528' : major ? '#3b4245' : '#71777a';
      ctx.stroke();
    }

    for (let label = 0; label <= 4; label += 1) {
      const ratio = label / 4;
      const angle = start + (end - start) * ratio;
      const value = spec.max * ratio;
      ctx.font = '700 52px Arial, sans-serif';
      ctx.fillStyle = '#202629';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        Number.isInteger(value) ? String(value) : value.toFixed(1),
        centerX + Math.cos(angle) * 282,
        centerY + Math.sin(angle) * 282,
      );
    }

    ctx.font = '700 92px Arial, sans-serif';
    ctx.fillStyle = '#1c2326';
    ctx.textAlign = 'center';
    ctx.fillText(spec.unit, centerX, 284);

    ctx.font = '600 33px Arial, sans-serif';
    ctx.fillStyle = '#51595d';
    ctx.fillText('DC', centerX - 96, 374);
    ctx.fillText('CLASS 1.5', centerX + 74, 374);

    ctx.strokeStyle = '#9e151e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(1040, 104);
    ctx.lineTo(1110, 104);
    ctx.stroke();

    texture.update();
    return texture;
  }
}

export class ResistorModuleVisual {
  private readonly display: DigitalDisplay;
  private readonly ceramicMaterial: PBRMaterial;

  constructor(
    scene: Scene,
    theme: InstrumentTheme,
    position: Vector3,
    terminalA: TerminalId,
    terminalB: TerminalId,
    registerTerminal: TerminalRegistrar,
  ) {
    createBox(
      scene,
      'resistor-module-base',
      new Vector3(position.x, 0.24, position.z),
      new Vector3(2.72, 0.34, 1.18),
      theme.graphite,
    );
    createBox(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.42, 0.13, 0.9),
      theme.meterPanel,
    );

    for (const x of [-0.9, 0.9]) {
      const insulator = MeshBuilder.CreateCylinder(
        `resistor-insulator-${x}`,
        { height: 0.28, diameter: 0.22, tessellation: 28 },
        scene,
      );
      insulator.position = new Vector3(position.x + x, 0.62, position.z + 0.04);
      insulator.material = theme.ceramic;
      insulator.isPickable = false;
    }

    this.ceramicMaterial = theme.ceramic.clone('power-resistor-ceramic');
    const ceramic = MeshBuilder.CreateCylinder(
      'power-resistor-body',
      { height: 1.42, diameter: 0.44, tessellation: 44 },
      scene,
    );
    ceramic.position = new Vector3(position.x, 0.84, position.z + 0.04);
    ceramic.rotation.z = Math.PI / 2;
    ceramic.material = this.ceramicMaterial;
    ceramic.isPickable = false;

    for (const offset of [-0.82, 0.82]) {
      const cap = MeshBuilder.CreateCylinder(
        `power-resistor-cap-${offset}`,
        { height: 0.2, diameter: 0.5, tessellation: 38 },
        scene,
      );
      cap.position = new Vector3(position.x + offset, 0.84, position.z + 0.04);
      cap.rotation.z = Math.PI / 2;
      cap.material = theme.metal;
      cap.isPickable = false;

      const clip = createBox(
        scene,
        `resistor-clip-${offset}`,
        new Vector3(position.x + offset, 0.66, position.z + 0.04),
        new Vector3(0.14, 0.42, 0.28),
        theme.darkMetal,
      );
      clip.isPickable = false;
    }

    createTextPlate(
      scene,
      'resistor-body-label',
      new Vector3(position.x, 0.84, position.z - 0.205),
      1.08,
      0.19,
      ['POWER RESISTOR'],
      '#34383a',
      'transparent',
      31,
      24,
    );

    this.display = new DigitalDisplay(scene, theme, {
      id: 'resistor-module',
      width: 0.92,
      height: 0.25,
      unit: 'Ω',
      decimals: 2,
      position: new Vector3(position.x, 0.27, position.z - 0.625),
      textColor: '#f0ce86',
      fontSize: 74,
    });

    createTextPlate(
      scene,
      'resistor-title',
      new Vector3(position.x, 0.5, position.z - 0.625),
      1.34,
      0.16,
      ['RESISTANCE'],
      '#242b2f',
      'transparent',
      31,
      24,
    );

    registerTerminal(
      terminalA,
      new Vector3(position.x - 1.12, 0.25, position.z - 0.585),
      'neutral',
    );
    registerTerminal(
      terminalB,
      new Vector3(position.x + 1.12, 0.25, position.z - 0.585),
      'neutral',
    );

    createTextPlate(scene, 'resistor-a-label', new Vector3(position.x - 1.12, 0.06, position.z - 0.59), 0.25, 0.12, ['A'], '#242b2f', 'transparent', 30, 24);
    createTextPlate(scene, 'resistor-b-label', new Vector3(position.x + 1.12, 0.06, position.z - 0.59), 0.25, 0.12, ['B'], '#242b2f', 'transparent', 30, 24);

    createScrew(scene, theme, 'resistor-screw-l', new Vector3(position.x - 1.16, 0.46, position.z + 0.39));
    createScrew(scene, theme, 'resistor-screw-r', new Vector3(position.x + 1.16, 0.46, position.z + 0.39));
  }

  setResistance(value: number): void {
    this.display.setValue(value);
  }

  setPower(power: number): void {
    const load = Math.min(1, Math.max(0, power / 20));
    this.ceramicMaterial.emissiveColor = new Color3(
      0.11 * load,
      0.025 * load,
      0.004 * load,
    );
  }
}
