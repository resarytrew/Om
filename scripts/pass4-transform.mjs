import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, replacements) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of replacements) {
    if (!text.includes(from)) {
      throw new Error(`Pass 4 transform: fragment not found in ${path}: ${from.slice(0, 120)}`);
    }
    text = text.replace(from, to);
  }
  writeFileSync(path, text);
}

patch('src/rendering/babylon/LabScene.ts', [
  [
    "  Curve3,\n  DirectionalLight,",
    "  Curve3,\n  DefaultRenderingPipeline,\n  DirectionalLight,",
  ],
  [
    "    this.scene.clearColor = new Color4(0.055, 0.073, 0.088, 1);\n    this.scene.ambientColor = new Color3(0.07, 0.08, 0.09);\n    this.scene.imageProcessingConfiguration.contrast = 1.08;\n    this.scene.imageProcessingConfiguration.exposure = 1.16;",
    "    this.scene.clearColor = new Color4(0.018, 0.025, 0.03, 1);\n    this.scene.ambientColor = new Color3(0.035, 0.04, 0.045);\n    this.scene.imageProcessingConfiguration.contrast = 1.1;\n    this.scene.imageProcessingConfiguration.exposure = 1.08;",
  ],
  [
    "      1.27,\n      10.15,\n      new Vector3(-0.05, 0.76, 0.52),",
    "      1.315,\n      9.6,\n      new Vector3(-0.02, 0.83, 0.58),",
  ],
  [
    "    camera.fov = 0.66;\n    camera.lowerRadiusLimit = 9.3;\n    camera.upperRadiusLimit = 11.2;\n    camera.lowerBetaLimit = 1.18;\n    camera.upperBetaLimit = 1.35;\n    camera.lowerAlphaLimit = -1.72;\n    camera.upperAlphaLimit = -1.43;\n    camera.wheelPrecision = 150;",
    "    camera.fov = 0.6;\n    camera.lowerRadiusLimit = 9.1;\n    camera.upperRadiusLimit = 10.4;\n    camera.lowerBetaLimit = 1.25;\n    camera.upperBetaLimit = 1.36;\n    camera.lowerAlphaLimit = -1.67;\n    camera.upperAlphaLimit = -1.47;\n    camera.wheelPrecision = 180;",
  ],
  [
    "    camera.attachControl(this.canvas, true);\n\n    const hemi = new HemisphericLight(",
    "    camera.attachControl(this.canvas, true);\n\n    const pipeline = new DefaultRenderingPipeline('ohm-render-pipeline', true, this.scene, [camera]);\n    pipeline.fxaaEnabled = true;\n    pipeline.samples = 2;\n    pipeline.bloomEnabled = true;\n    pipeline.bloomThreshold = 0.96;\n    pipeline.bloomWeight = 0.055;\n    pipeline.bloomKernel = 48;\n    pipeline.bloomScale = 0.5;\n\n    const hemi = new HemisphericLight(",
  ],
  [
    "    hemi.intensity = 0.82;\n    hemi.diffuse = new Color3(0.93, 0.96, 1);\n    hemi.groundColor = new Color3(0.22, 0.24, 0.26);",
    "    hemi.intensity = 0.48;\n    hemi.diffuse = new Color3(0.88, 0.92, 0.95);\n    hemi.groundColor = new Color3(0.11, 0.12, 0.13);",
  ],
  [
    "    key.position = new Vector3(-5.2, 7.5, -5.6);\n    key.intensity = 2.0;\n    key.diffuse = new Color3(1.0, 0.94, 0.86);",
    "    key.position = new Vector3(-4.8, 7.2, -5.4);\n    key.intensity = 1.72;\n    key.diffuse = new Color3(1.0, 0.91, 0.8);",
  ],
  [
    "    fill.intensity = 24;\n    fill.diffuse = new Color3(0.72, 0.86, 1.0);",
    "    fill.intensity = 11.5;\n    fill.diffuse = new Color3(0.67, 0.82, 0.95);\n\n    const frontFill = new PointLight(\n      'front-soft-fill',\n      new Vector3(-0.4, 2.2, -5.1),\n      this.scene,\n    );\n    frontFill.intensity = 7.5;\n    frontFill.diffuse = new Color3(0.94, 0.95, 0.94);",
  ],
  [
    "    rim.intensity = 15;\n    rim.diffuse = new Color3(0.56, 0.72, 0.86);",
    "    rim.intensity = 8.5;\n    rim.diffuse = new Color3(0.5, 0.7, 0.86);",
  ],
  [
    "    shadow.blurKernel = 28;\n    shadow.bias = 0.0007;\n    shadow.normalBias = 0.025;",
    "    shadow.blurKernel = 34;\n    shadow.bias = 0.00065;\n    shadow.normalBias = 0.024;\n    shadow.darkness = 0.28;",
  ],
  [
    "    const studioFloor = MeshBuilder.CreateGround(\n      'studio-floor',\n      { width: 15.5, height: 11.5 },\n      this.scene,\n    );\n    studioFloor.position = new Vector3(0, -0.25, 1.4);\n    studioFloor.material = this.theme.backdrop;\n    studioFloor.receiveShadows = true;\n    studioFloor.isPickable = false;\n\n    const backdrop = MeshBuilder.CreateBox(\n      'studio-backdrop',\n      { width: 13.5, height: 5.4, depth: 0.16 },\n      this.scene,\n    );\n    backdrop.position = new Vector3(0, 2.45, 3.62);",
    "    const backdrop = MeshBuilder.CreateBox(\n      'studio-backdrop',\n      { width: 30, height: 12, depth: 0.2 },\n      this.scene,\n    );\n    backdrop.position = new Vector3(0, 4.8, 6.3);",
  ],
  [
    "    wallRail.position = new Vector3(0, 1.02, 3.52);",
    "    wallRail.position = new Vector3(0, 1.22, 3.55);",
  ],
  [
    "      { width: 11.65, height: 6.15 },",
    "      { width: 11.55, height: 5.85 },",
  ],
  [
    "      { width: 11.85, height: 0.19, depth: 6.35 },",
    "      { width: 11.72, height: 0.2, depth: 6.02 },",
  ],
  [
    "      { width: 10.1, height: 0.035, depth: 4.95 },",
    "      { width: 9.9, height: 0.028, depth: 4.6 },",
  ],
  [
    "    mat.position = new Vector3(0, 0.033, 0.4);",
    "    mat.position = new Vector3(0, 0.027, 0.48);",
  ],
  [
    "    frontLip.position = new Vector3(0, -0.08, -3.11);",
    "    frontLip.position = new Vector3(0, -0.08, -2.94);",
  ],
  [
    "      new Vector3(-3.28, 0, 0.34),",
    "      new Vector3(-3.12, 0, 0.4),",
  ],
  [
    "        decimals: 3,\n        position: new Vector3(2.72, 0, 0.28),",
    "        decimals: 2,\n        position: new Vector3(2.62, 0, 0.34),",
  ],
  [
    "        position: new Vector3(0.82, 0, 2.0),\n        plus: ids.voltmeterPlus,\n        minus: ids.voltmeterMinus,\n        width: 2.04,\n        height: 1.72,",
    "        position: new Vector3(0.86, 0, 1.93),\n        plus: ids.voltmeterPlus,\n        minus: ids.voltmeterMinus,\n        width: 1.96,\n        height: 1.67,",
  ],
  [
    "        || mesh === studioFloor\n",
    "",
  ],
  [
    "      { height: 0.17, diameter: 0.4, tessellation: 40 },",
    "      { height: 0.15, diameter: 0.35, tessellation: 40 },",
  ],
  [
    "      { diameter: 0.39, thickness: 0.052, tessellation: 44 },",
    "      { diameter: 0.34, thickness: 0.045, tessellation: 44 },",
  ],
  [
    "      { height: 0.2, diameter: 0.3, tessellation: 40 },",
    "      { height: 0.18, diameter: 0.265, tessellation: 40 },",
  ],
  [
    "    if (!snapped) pointerPoint.y = Math.max(pointerPoint.y + 0.09, 0.09);",
    "    if (!snapped) pointerPoint.y = Math.max(pointerPoint.y + 0.075, 0.075);",
  ],
  [
    "    const points = this.createWirePath(from, to);",
    "    const points = this.createWirePath(from, to, 0);",
  ],
  [
    "  private createWirePath(from: Vector3, to: Vector3): Vector3[] {\n    const distance = Vector3.Distance(from, to);\n    const tableY = 0.12;\n    const forwardOffset = Math.min(0.72, 0.28 + distance * 0.08);\n    const frontZ = Math.min(from.z, to.z) - forwardOffset;\n    const first = from.add(new Vector3(0, -0.04, -0.16));\n    const last = to.add(new Vector3(0, -0.04, -0.16));\n    const middleA = Vector3.Lerp(from, to, 0.34);\n    middleA.y = Math.max(tableY, Math.min(from.y, to.y) * 0.48);\n    middleA.z = Math.min(middleA.z, frontZ);\n    const middleB = Vector3.Lerp(from, to, 0.66);\n    middleB.y = Math.max(tableY, Math.min(from.y, to.y) * 0.45);\n    middleB.z = Math.min(middleB.z, frontZ + 0.04);\n    return Curve3.CreateCatmullRomSpline(\n      [from.clone(), first, middleA, middleB, last, to.clone()],\n      10,\n      false,\n    ).getPoints();\n  }",
    "  private wireLane(id: string): number {\n    let hash = 0;\n    for (let index = 0; index < id.length; index += 1) {\n      hash = (hash * 31 + id.charCodeAt(index)) | 0;\n    }\n    return ((Math.abs(hash) % 5) - 2) * 0.22;\n  }\n\n  private createWirePath(from: Vector3, to: Vector3, lane: number): Vector3[] {\n    const distance = Vector3.Distance(from, to);\n    const tableY = 0.082;\n    const frontOffset = 0.28 + Math.min(0.55, distance * 0.065);\n    const routeZ = Math.min(from.z, to.z) - frontOffset - Math.abs(lane) * 0.2;\n    const first = from.add(new Vector3(0, -0.08, -0.16));\n    const last = to.add(new Vector3(0, -0.08, -0.16));\n    const middleA = Vector3.Lerp(from, to, 0.3);\n    middleA.x += lane;\n    middleA.y = tableY;\n    middleA.z = Math.min(middleA.z, routeZ);\n    const middleB = Vector3.Lerp(from, to, 0.7);\n    middleB.x -= lane * 0.45;\n    middleB.y = tableY;\n    middleB.z = Math.min(middleB.z, routeZ + 0.06);\n    return Curve3.CreateCatmullRomSpline(\n      [from.clone(), first, middleA, middleB, last, to.clone()],\n      12,\n      false,\n    ).getPoints();\n  }",
  ],
  [
    "      const path = this.createWirePath(from, to);",
    "      const path = this.createWirePath(from, to, this.wireLane(connection.id));",
  ],
  [
    "        ? new Color3(0.58, 0.018, 0.028)\n        : new Color3(0.022, 0.026, 0.03);",
    "        ? new Color3(0.5, 0.012, 0.022)\n        : new Color3(0.012, 0.015, 0.018);",
  ],
  [
    "      material.roughness = 0.86;",
    "      material.roughness = 0.94;\n      material.environmentIntensity = 0.32;",
  ],
  [
    "        { path, radius: 0.062, tessellation: 22, cap: Mesh.CAP_ALL },",
    "        { path, radius: 0.046, tessellation: 20, cap: Mesh.CAP_ALL },",
  ],
  [
    "      { height: 0.28, diameterTop: 0.16, diameterBottom: 0.23, tessellation: 32 },",
    "      { height: 0.24, diameterTop: 0.135, diameterBottom: 0.19, tessellation: 32 },",
  ],
  [
    "      { height: 0.07, diameter: 0.19, tessellation: 30 },",
    "      { height: 0.055, diameter: 0.165, tessellation: 30 },",
  ],
  [
    "      { height: 0.14, diameterTop: 0.13, diameterBottom: 0.18, tessellation: 30 },",
    "      { height: 0.12, diameterTop: 0.105, diameterBottom: 0.155, tessellation: 30 },",
  ],
]);

patch('src/rendering/babylon/ProfessionalInstruments.ts', [
  [
    "    material.emissiveColor = new Color3(0.035, 0.13, 0.145);",
    "    material.emissiveColor = new Color3(0.055, 0.205, 0.22);",
  ],
  [
    "    context.fillStyle = '#071013';",
    "    context.fillStyle = '#03090b';",
  ],
  [
    "      '#071013',",
    "      '#03090b',",
  ],
  [
    "    const width = 2.82;\n    const height = 1.7;\n    const depth = 1.58;",
    "    const width = 2.62;\n    const height = 1.64;\n    const depth = 1.46;",
  ],
  [
    "    const width = spec.width ?? 2.18;\n    const height = spec.height ?? 1.82;\n    const depth = 0.92;",
    "    const width = spec.width ?? 2.08;\n    const height = spec.height ?? 1.78;\n    const depth = 0.84;",
  ],
  [
    "    glass.position = new Vector3(p.x, 1.17, frontZ - 0.172);",
    "    glass.position = new Vector3(p.x, 1.17, frontZ - 0.168);",
  ],
  [
    "      width: 0.83,\n      height: 0.23,",
    "      width: 0.9,\n      height: 0.24,",
  ],
  [
    "    ctx.fillStyle = '#f1efe7';",
    "    ctx.fillStyle = '#f4f1e8';",
  ],
  [
    "    const ceramic = MeshBuilder.CreateCylinder(\n      'power-resistor-body',\n      { height: 1.46, diameter: 0.46, tessellation: 44 },",
    "    const ceramic = MeshBuilder.CreateCylinder(\n      'power-resistor-body',\n      { height: 1.42, diameter: 0.44, tessellation: 44 },",
  ],
]);

patch('src/ohm-polish.css', [
  [
    "    radial-gradient(circle at 50% 18%, rgba(129, 176, 207, .08), transparent 48%),\n    linear-gradient(180deg, #101a22 0%, #0d141a 100%);",
    "    radial-gradient(circle at 48% 12%, rgba(170, 196, 211, .055), transparent 42%),\n    linear-gradient(180deg, #0a1116 0%, #080d11 100%);",
  ],
  [
    "  filter: saturate(.98) contrast(1.015);",
    "  filter: saturate(.94) contrast(1.025);",
  ],
  [
    "  background: rgba(13, 19, 24, .74);",
    "  background: rgba(10, 15, 19, .68);",
  ],
]);

console.log('Ohm visual Pass 4 transform completed.');
