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
    const plane = MeshBuilder.CreatePlane(
      `${spec.id}-display-plane`,
      { width: spec.width, height: spec.height },
      scene,
    );
    plane.position = spec.position;
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
    material.emissiveColor = new Color3(0.04, 0.16, 0.18);
    material.specularColor = new Color3(0.2, 0.35, 0.38);
    material.disableLighting = true;
    material.backFaceCulling = false;
    plane.material = material;

    const glass = MeshBuilder.CreatePlane(
      `${spec.id}-display-glass`,
      { width: spec.width * 1.04, height: spec.height * 1.12 },
      scene,
    );
    glass.position = spec.position.add(new Vector3(0, 0, -0.009));
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
    context.fillStyle = '#071013';
    context.fillRect(0, 0, 640, 220);
    this.texture.drawText(
      text,
      null,
      145,
      `600 ${this.spec.fontSize ?? 92}px ui-monospace, SFMono-Regular, Menlo, monospace`,
      this.spec.textColor ?? '#73e7ff',
      '#071013',
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
): Mesh {
  const plane = MeshBuilder.CreatePlane(id, { width, height }, scene);
  plane.position = position;
  plane.rotation.y = Math.PI;
  plane.isPickable = false;

  const texture = new DynamicTexture(`${id}-texture`, { width: 800, height: 240 }, scene, true);
  texture.hasAlpha = true;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 800, 240);
  if (background !== 'transparent') {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 800, 240);
  }
  const lineHeight = 78;
  const startY = 72 - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    texture.drawText(
      line,
      null,
      startY + index * lineHeight,
      index === 0
        ? '600 48px Inter, Arial, sans-serif'
        : '500 37px Inter, Arial, sans-serif',
      color,
      null,
      true,
    );
  });

  const material = new StandardMaterial(`${id}-material`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = new Color3(0.16, 0.17, 0.18);
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
        { height: 0.12, diameter: 0.23, tessellation: 24 },
        scene,
      );
      foot.position = new Vector3(
        center.x + x * width * 0.38,
        0.07,
        center.z + z * depth * 0.34,
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
    { height: 0.035, diameter: 0.09, tessellation: 24 },
    scene,
  );
  screw.position = position;
  screw.rotation.x = Math.PI / 2;
  screw.material = theme.metal;
  screw.isPickable = false;
}

export class PowerSupplyVisual {
  private readonly display: DigitalDisplay;
  private readonly statusLed: Mesh;
  private readonly knob: Mesh;
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
    const width = 2.55;
    const height = 1.55;
    const depth = 1.55;
    const bodyCenter = new Vector3(position.x, 0.86, position.z);

    createFeet(scene, theme, 'source', position, width, depth);
    createBox(scene, 'source-shell', bodyCenter, new Vector3(width, height, depth), theme.graphiteSoft);
    createBox(
      scene,
      'source-front-panel',
      new Vector3(position.x, 0.86, position.z - depth / 2 - 0.025),
      new Vector3(width * 0.94, height * 0.88, 0.07),
      theme.frontPanel,
    );

    createTextPlate(
      scene,
      'source-title',
      new Vector3(position.x - 0.45, 1.47, position.z - 0.817),
      1.28,
      0.26,
      ['DC POWER SUPPLY', '0–12 V  /  LAB SERIES'],
      '#e7ecef',
    );

    this.display = new DigitalDisplay(scene, theme, {
      id: 'source',
      width: 1.04,
      height: 0.38,
      unit: 'V',
      decimals: 2,
      position: new Vector3(position.x - 0.45, 1.08, position.z - 0.823),
      textColor: '#77e8ff',
      fontSize: 88,
    });

    const bezel = createBox(
      scene,
      'source-display-bezel',
      new Vector3(position.x - 0.45, 1.08, position.z - 0.79),
      new Vector3(1.18, 0.5, 0.07),
      theme.rubberBlack,
    );
    bezel.isPickable = false;

    this.knob = MeshBuilder.CreateCylinder(
      'source-voltage-knob',
      { height: 0.27, diameter: 0.56, tessellation: 40 },
      scene,
    );
    this.knob.position = new Vector3(position.x + 0.7, 1.07, position.z - 0.88);
    this.knob.rotation.x = Math.PI / 2;
    this.knob.material = theme.darkMetal;
    this.knob.isPickable = false;

    const knobCap = MeshBuilder.CreateCylinder(
      'source-knob-cap',
      { height: 0.285, diameter: 0.33, tessellation: 40 },
      scene,
    );
    knobCap.position = this.knob.position.add(new Vector3(0, 0, -0.018));
    knobCap.rotation.x = Math.PI / 2;
    knobCap.material = theme.rubberBlack;
    knobCap.isPickable = false;

    const pointer = createBox(
      scene,
      'source-knob-index',
      new Vector3(position.x + 0.7, 1.3, position.z - 1.026),
      new Vector3(0.035, 0.14, 0.025),
      theme.metal,
    );
    pointer.isPickable = false;

    createTextPlate(
      scene,
      'source-voltage-label',
      new Vector3(position.x + 0.7, 0.72, position.z - 0.823),
      0.72,
      0.18,
      ['VOLTAGE'],
      '#aeb9bf',
    );

    const powerSwitch = createBox(
      scene,
      'source-power-switch',
      new Vector3(position.x + 0.98, 0.52, position.z - 0.833),
      new Vector3(0.31, 0.22, 0.08),
      theme.rubberBlack,
    );
    powerSwitch.rotation.z = -0.05;

    this.statusLed = MeshBuilder.CreateSphere(
      'source-status-led',
      { diameter: 0.115, segments: 20 },
      scene,
    );
    this.statusLed.position = new Vector3(position.x + 0.56, 0.52, position.z - 0.88);
    this.statusLed.material = theme.ledGreen;
    this.statusLed.isPickable = false;

    registerTerminal(
      sourcePlus,
      new Vector3(position.x - 0.46, 0.42, position.z - 0.91),
      'positive',
    );
    registerTerminal(
      sourceMinus,
      new Vector3(position.x + 0.02, 0.42, position.z - 0.91),
      'negative',
    );

    for (let index = 0; index < 6; index += 1) {
      createBox(
        scene,
        `source-vent-${index}`,
        new Vector3(position.x - 0.72 + index * 0.28, 1.66, position.z + 0.1),
        new Vector3(0.15, 0.025, 0.68),
        theme.darkMetal,
      );
    }

    createScrew(scene, theme, 'source-screw-lt', new Vector3(position.x - 1.06, 1.43, position.z - 0.84));
    createScrew(scene, theme, 'source-screw-rt', new Vector3(position.x + 1.06, 1.43, position.z - 0.84));
    createScrew(scene, theme, 'source-screw-lb', new Vector3(position.x - 1.06, 0.34, position.z - 0.84));
    createScrew(scene, theme, 'source-screw-rb', new Vector3(position.x + 1.06, 0.34, position.z - 0.84));
  }

  setVoltage(value: number): void {
    this.display.setValue(value);
    const ratio = Math.min(1, Math.max(0, value / 12));
    this.targetKnob = -0.8 + ratio * 1.6;
  }

  setActive(active: boolean, warning = false): void {
    const material = this.statusLed.material as StandardMaterial | null;
    if (!material) return;
    material.diffuseColor = warning
      ? new Color3(0.7, 0.28, 0.02)
      : active
        ? new Color3(0.05, 0.45, 0.17)
        : new Color3(0.08, 0.1, 0.08);
    material.emissiveColor = warning
      ? new Color3(0.48, 0.15, 0.005)
      : active
        ? new Color3(0.04, 0.35, 0.13)
        : Color3.Black();
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 8);
    this.currentKnob += (this.targetKnob - this.currentKnob) * factor;
    this.knob.rotation.z = this.currentKnob;
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
    const width = spec.width ?? 1.9;
    const height = spec.height ?? 1.58;
    const depth = 1.08;
    const p = spec.position;

    createFeet(scene, theme, spec.id, p, width, depth);
    createBox(
      scene,
      `${spec.id}-shell`,
      new Vector3(p.x, 0.84, p.z),
      new Vector3(width, height, depth),
      theme.graphite,
    );
    createBox(
      scene,
      `${spec.id}-front`,
      new Vector3(p.x, 0.86, p.z - depth / 2 - 0.025),
      new Vector3(width * 0.93, height * 0.9, 0.065),
      theme.frontPanel,
    );

    const face = MeshBuilder.CreatePlane(
      `${spec.id}-dial-face`,
      { width: width * 0.76, height: 0.82 },
      scene,
    );
    face.position = new Vector3(p.x, 1.12, p.z - 0.59);
    face.rotation.y = Math.PI;
    face.isPickable = false;
    const faceTexture = this.createDialTexture(scene, spec);
    const faceMaterial = new StandardMaterial(`${spec.id}-dial-material`, scene);
    faceMaterial.diffuseTexture = faceTexture;
    faceMaterial.emissiveColor = new Color3(0.04, 0.04, 0.038);
    faceMaterial.backFaceCulling = false;
    face.material = faceMaterial;

    this.needlePivot = new TransformNode(`${spec.id}-needle-pivot`, scene);
    this.needlePivot.position = new Vector3(p.x, 0.94, p.z - 0.625);
    const needle = createBox(
      scene,
      `${spec.id}-needle`,
      new Vector3(p.x, 1.18, p.z - 0.632),
      new Vector3(0.035, 0.49, 0.025),
      theme.terminalRed,
    );
    needle.setParent(this.needlePivot);
    needle.position = new Vector3(0, 0.245, 0);

    const hub = MeshBuilder.CreateCylinder(
      `${spec.id}-needle-hub`,
      { height: 0.06, diameter: 0.14, tessellation: 28 },
      scene,
    );
    hub.position = this.needlePivot.position.add(new Vector3(0, 0, -0.012));
    hub.rotation.x = Math.PI / 2;
    hub.material = theme.darkMetal;
    hub.isPickable = false;

    const glass = MeshBuilder.CreatePlane(
      `${spec.id}-dial-glass`,
      { width: width * 0.8, height: 0.86 },
      scene,
    );
    glass.position = new Vector3(p.x, 1.12, p.z - 0.648);
    glass.rotation.y = Math.PI;
    glass.material = theme.glass;
    glass.isPickable = false;

    createTextPlate(
      scene,
      `${spec.id}-brand`,
      new Vector3(p.x, 1.55, p.z - 0.60),
      1.28,
      0.2,
      [`LAB ${spec.label.toUpperCase()}`],
      '#d9e0e4',
    );

    this.display = new DigitalDisplay(scene, theme, {
      id: `${spec.id}-digital`,
      width: 0.72,
      height: 0.22,
      unit: spec.unit,
      decimals: spec.decimals,
      position: new Vector3(p.x, 0.56, p.z - 0.595),
      textColor: '#68dff5',
      fontSize: 72,
    });

    this.warningLed = MeshBuilder.CreateSphere(
      `${spec.id}-warning-led`,
      { diameter: 0.09, segments: 18 },
      scene,
    );
    this.warningLed.position = new Vector3(p.x + 0.63, 0.58, p.z - 0.62);
    this.warningLed.material = theme.ledGreen.clone(`${spec.id}-led-material`);
    this.warningLed.isPickable = false;

    registerTerminal(
      spec.plus,
      new Vector3(p.x - 0.53, 0.28, p.z - 0.67),
      'positive',
    );
    registerTerminal(
      spec.minus,
      new Vector3(p.x + 0.53, 0.28, p.z - 0.67),
      'negative',
    );

    createScrew(scene, theme, `${spec.id}-screw-lt`, new Vector3(p.x - width * 0.4, 1.48, p.z - 0.59));
    createScrew(scene, theme, `${spec.id}-screw-rt`, new Vector3(p.x + width * 0.4, 1.48, p.z - 0.59));
    createScrew(scene, theme, `${spec.id}-screw-lb`, new Vector3(p.x - width * 0.4, 0.28, p.z - 0.59));
    createScrew(scene, theme, `${spec.id}-screw-rb`, new Vector3(p.x + width * 0.4, 0.28, p.z - 0.59));

    this.setValue(0, false);
  }

  setValue(value: number, overload: boolean): void {
    const safe = Number.isFinite(value) ? Math.max(0, value) : this.max;
    const ratio = Math.min(1, safe / this.max);
    this.targetAngle = 1.02 - ratio * 2.04;
    this.display.setValue(overload ? Number.POSITIVE_INFINITY : value);

    const material = this.warningLed.material as StandardMaterial | null;
    if (material) {
      material.diffuseColor = overload
        ? new Color3(0.72, 0.18, 0.03)
        : new Color3(0.05, 0.42, 0.18);
      material.emissiveColor = overload
        ? new Color3(0.55, 0.08, 0.01)
        : new Color3(0.035, 0.26, 0.1);
    }
  }

  tick(dt: number): void {
    const factor = 1 - Math.exp(-dt * 10);
    this.currentAngle += (this.targetAngle - this.currentAngle) * factor;
    this.needlePivot.rotation.z = this.currentAngle;
  }

  private createDialTexture(scene: Scene, spec: AnalogMeterSpec): DynamicTexture {
    const texture = new DynamicTexture(
      `${spec.id}-dial-texture`,
      { width: 1000, height: 560 },
      scene,
      true,
    );
    texture.hasAlpha = false;
    const ctx = texture.getContext();
    ctx.fillStyle = '#e6e3d8';
    ctx.fillRect(0, 0, 1000, 560);

    ctx.strokeStyle = '#2f3437';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(500, 440, 330, Math.PI * 1.17, Math.PI * 1.83, false);
    ctx.stroke();

    const tickCount = 20;
    for (let index = 0; index <= tickCount; index += 1) {
      const t = index / tickCount;
      const angle = Math.PI * (1.17 + 0.66 * t);
      const major = index % 5 === 0;
      const inner = major ? 282 : 300;
      const outer = 330;
      ctx.beginPath();
      ctx.moveTo(500 + Math.cos(angle) * inner, 440 + Math.sin(angle) * inner);
      ctx.lineTo(500 + Math.cos(angle) * outer, 440 + Math.sin(angle) * outer);
      ctx.lineWidth = major ? 6 : 3;
      ctx.strokeStyle = '#303638';
      ctx.stroke();
    }

    for (let major = 0; major <= 4; major += 1) {
      const ratio = major / 4;
      const angle = Math.PI * (1.17 + 0.66 * ratio);
      const value = (spec.max * ratio).toFixed(spec.max <= 4 ? 0 : 0);
      ctx.font = '600 44px Arial, sans-serif';
      ctx.fillStyle = '#262b2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        value,
        500 + Math.cos(angle) * 235,
        440 + Math.sin(angle) * 235,
      );
    }

    ctx.font = '700 68px Arial, sans-serif';
    ctx.fillStyle = '#202527';
    ctx.textAlign = 'center';
    ctx.fillText(spec.unit, 500, 270);
    ctx.font = '500 30px Arial, sans-serif';
    ctx.fillStyle = '#565d61';
    ctx.fillText('CLASS 1.5', 500, 330);
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
      new Vector3(position.x, 0.25, position.z),
      new Vector3(2.55, 0.34, 1.15),
      theme.graphite,
    );
    createBox(
      scene,
      'resistor-module-deck',
      new Vector3(position.x, 0.44, position.z + 0.03),
      new Vector3(2.2, 0.12, 0.86),
      theme.frontPanel,
    );

    this.ceramicMaterial = theme.ceramic.clone('power-resistor-ceramic');
    const ceramic = MeshBuilder.CreateCylinder(
      'power-resistor-body',
      { height: 1.34, diameter: 0.42, tessellation: 40 },
      scene,
    );
    ceramic.position = new Vector3(position.x, 0.78, position.z + 0.04);
    ceramic.rotation.z = Math.PI / 2;
    ceramic.material = this.ceramicMaterial;
    ceramic.isPickable = false;

    for (const offset of [-0.76, 0.76]) {
      const cap = MeshBuilder.CreateCylinder(
        `power-resistor-cap-${offset}`,
        { height: 0.17, diameter: 0.46, tessellation: 36 },
        scene,
      );
      cap.position = new Vector3(position.x + offset, 0.78, position.z + 0.04);
      cap.rotation.z = Math.PI / 2;
      cap.material = theme.metal;
      cap.isPickable = false;
    }

    const supportLeft = createBox(
      scene,
      'resistor-support-left',
      new Vector3(position.x - 0.83, 0.6, position.z + 0.04),
      new Vector3(0.14, 0.42, 0.3),
      theme.darkMetal,
    );
    const supportRight = createBox(
      scene,
      'resistor-support-right',
      new Vector3(position.x + 0.83, 0.6, position.z + 0.04),
      new Vector3(0.14, 0.42, 0.3),
      theme.darkMetal,
    );
    supportLeft.isPickable = false;
    supportRight.isPickable = false;

    this.display = new DigitalDisplay(scene, theme, {
      id: 'resistor-module',
      width: 0.78,
      height: 0.23,
      unit: 'Ω',
      decimals: 2,
      position: new Vector3(position.x, 0.28, position.z - 0.61),
      textColor: '#f3d18a',
      fontSize: 72,
    });

    createTextPlate(
      scene,
      'resistor-title',
      new Vector3(position.x, 0.5, position.z - 0.6),
      1.2,
      0.16,
      ['POWER RESISTOR'],
      '#c7d0d5',
    );

    registerTerminal(
      terminalA,
      new Vector3(position.x - 1.02, 0.28, position.z - 0.55),
      'neutral',
    );
    registerTerminal(
      terminalB,
      new Vector3(position.x + 1.02, 0.28, position.z - 0.55),
      'neutral',
    );

    createScrew(scene, theme, 'resistor-screw-l', new Vector3(position.x - 1.08, 0.45, position.z + 0.38));
    createScrew(scene, theme, 'resistor-screw-r', new Vector3(position.x + 1.08, 0.45, position.z + 0.38));
  }

  setResistance(value: number): void {
    this.display.setValue(value);
  }

  setPower(power: number): void {
    const load = Math.min(1, Math.max(0, power / 20));
    this.ceramicMaterial.emissiveColor = new Color3(
      0.18 * load,
      0.045 * load,
      0.008 * load,
    );
  }
}
