from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)


# --- Physical cable: let each end leave a rotated terminal along its own outward normal. ---
path = Path('src/rendering/babylon/PhysicalCable.ts')
text = path.read_text()
text = replace_once(
    text,
    "  readonly frontClearance?: number;\n}\n",
    "  readonly frontClearance?: number;\n  readonly startDirection?: Vector3;\n  readonly endDirection?: Vector3;\n}\n",
    'cable options directions',
)
text = replace_once(
    text,
    "  private readonly cableY: number;\n",
    "  private readonly cableY: number;\n  private startDirection = new Vector3(0, 0, -1);\n  private endDirection = new Vector3(0, 0, -1);\n",
    'cable direction fields',
)
old_constructor_geometry = """    const startLead = start.add(new Vector3(0, 0, -leadOut));
    const endLead = end.add(new Vector3(0, 0, -leadOut));
    const startBend = new Vector3(
      startLead.x,
      Math.max(cableY + 0.08, cableY + (start.y - cableY) * 0.48),
      startLead.z - 0.15,
    );
    const endBend = new Vector3(
      endLead.x,
      Math.max(cableY + 0.08, cableY + (end.y - cableY) * 0.48),
      endLead.z - 0.15,
    );
    const startDrop = new Vector3(
      startLead.x + laneOffset * 0.08,
      cableY,
      startLead.z - 0.3,
    );
    const endDrop = new Vector3(
      endLead.x - laneOffset * 0.08,
      cableY,
      endLead.z - 0.3,
    );
"""
new_constructor_geometry = """    this.startDirection = this.normalizeLeadDirection(options.startDirection);
    this.endDirection = this.normalizeLeadDirection(options.endDirection);
    const startLead = start.add(this.startDirection.scale(leadOut));
    const endLead = end.add(this.endDirection.scale(leadOut));
    const startBendBase = startLead.add(this.startDirection.scale(0.15));
    const endBendBase = endLead.add(this.endDirection.scale(0.15));
    const startBend = new Vector3(
      startBendBase.x,
      Math.max(cableY + 0.08, cableY + (start.y - cableY) * 0.48),
      startBendBase.z,
    );
    const endBend = new Vector3(
      endBendBase.x,
      Math.max(cableY + 0.08, cableY + (end.y - cableY) * 0.48),
      endBendBase.z,
    );
    const startDropBase = startLead.add(this.startDirection.scale(0.3));
    const endDropBase = endLead.add(this.endDirection.scale(0.3));
    const startLateral = new Vector3(this.startDirection.z, 0, -this.startDirection.x).scale(laneOffset * 0.08);
    const endLateral = new Vector3(this.endDirection.z, 0, -this.endDirection.x).scale(-laneOffset * 0.08);
    const startDrop = new Vector3(
      startDropBase.x + startLateral.x,
      cableY,
      startDropBase.z + startLateral.z,
    );
    const endDrop = new Vector3(
      endDropBase.x + endLateral.x,
      cableY,
      endDropBase.z + endLateral.z,
    );
"""
text = replace_once(text, old_constructor_geometry, new_constructor_geometry, 'constructor lead geometry')
old_update = """  updateAnchors(start: Vector3, end: Vector3): void {
    const startLead = start.add(new Vector3(0, 0, -this.leadOut));
    const endLead = end.add(new Vector3(0, 0, -this.leadOut));
    const startBend = new Vector3(
      startLead.x,
      Math.max(this.cableY + 0.08, this.cableY + (start.y - this.cableY) * 0.48),
      startLead.z - 0.15,
    );
    const endBend = new Vector3(
      endLead.x,
      Math.max(this.cableY + 0.08, this.cableY + (end.y - this.cableY) * 0.48),
      endLead.z - 0.15,
    );
    const startDrop = new Vector3(
      startLead.x + this.laneOffset * 0.08,
      this.cableY,
      startLead.z - 0.3,
    );
    const endDrop = new Vector3(
      endLead.x - this.laneOffset * 0.08,
      this.cableY,
      endLead.z - 0.3,
    );

    const startPins = [start, startLead, startBend, startDrop];
    const endPins = [endDrop, endBend, endLead, end];
"""
new_update = """  updateAnchors(
    start: Vector3,
    end: Vector3,
    startDirection?: Vector3,
    endDirection?: Vector3,
  ): void {
    if (startDirection) this.startDirection = this.normalizeLeadDirection(startDirection);
    if (endDirection) this.endDirection = this.normalizeLeadDirection(endDirection);
    const startLead = start.add(this.startDirection.scale(this.leadOut));
    const endLead = end.add(this.endDirection.scale(this.leadOut));
    const startBendBase = startLead.add(this.startDirection.scale(0.15));
    const endBendBase = endLead.add(this.endDirection.scale(0.15));
    const startBend = new Vector3(
      startBendBase.x,
      Math.max(this.cableY + 0.08, this.cableY + (start.y - this.cableY) * 0.48),
      startBendBase.z,
    );
    const endBend = new Vector3(
      endBendBase.x,
      Math.max(this.cableY + 0.08, this.cableY + (end.y - this.cableY) * 0.48),
      endBendBase.z,
    );
    const startDropBase = startLead.add(this.startDirection.scale(0.3));
    const endDropBase = endLead.add(this.endDirection.scale(0.3));
    const startLateral = new Vector3(this.startDirection.z, 0, -this.startDirection.x).scale(this.laneOffset * 0.08);
    const endLateral = new Vector3(this.endDirection.z, 0, -this.endDirection.x).scale(-this.laneOffset * 0.08);
    const startDrop = new Vector3(
      startDropBase.x + startLateral.x,
      this.cableY,
      startDropBase.z + startLateral.z,
    );
    const endDrop = new Vector3(
      endDropBase.x + endLateral.x,
      this.cableY,
      endDropBase.z + endLateral.z,
    );

    const startPins = [start, startLead, startBend, startDrop];
    const endPins = [endDrop, endBend, endLead, end];
"""
text = replace_once(text, old_update, new_update, 'update anchors directions')
text = replace_once(
    text,
    "  private movePin(index: number, target: Vector3): void {\n",
    "  private normalizeLeadDirection(direction?: Vector3): Vector3 {\n    const normalized = (direction ?? new Vector3(0, 0, -1)).clone();\n    normalized.y = 0;\n    if (normalized.lengthSquared() < EPSILON * EPSILON) return new Vector3(0, 0, -1);\n    return normalized.normalize();\n  }\n\n  private movePin(index: number, target: Vector3): void {\n",
    'normalize lead direction helper',
)
path.write_text(text)


# --- Lab scene: derive terminal outward direction from the instrument root. ---
path = Path('src/rendering/babylon/LabScene.ts')
text = path.read_text()
text = replace_once(
    text,
    """      const from = this.terminalMeshes.get(connection.from)?.mesh.getAbsolutePosition();
      const to = this.terminalMeshes.get(connection.to)?.mesh.getAbsolutePosition();
      if (!from || !to) continue;

      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
""",
    """      const from = this.terminalMeshes.get(connection.from)?.mesh.getAbsolutePosition();
      const to = this.terminalMeshes.get(connection.to)?.mesh.getAbsolutePosition();
      if (!from || !to) continue;
      const fromDirection = this.terminalOutwardDirection(connection.from);
      const toDirection = this.terminalOutwardDirection(connection.to);

      const fromTerminal = this.runtime.circuit.getTerminal(connection.from);
""",
    'connection terminal directions',
)
text = replace_once(
    text,
    """          leadOut: 0.34,
          floorY: 0.045,
        },
""",
    """          leadOut: 0.34,
          floorY: 0.045,
          startDirection: fromDirection,
          endDirection: toDirection,
        },
""",
    'physical cable terminal directions',
)
text = replace_once(
    text,
    """        material,
        { connectionId: connection.id },
      );
      const plugTo = this.createBananaPlug(
""",
    """        material,
        { connectionId: connection.id },
        fromDirection,
      );
      const plugTo = this.createBananaPlug(
""",
    'from plug direction',
)
text = replace_once(
    text,
    """        material,
        { connectionId: connection.id },
      );

      cable.mesh.visibility = 0.02;
""",
    """        material,
        { connectionId: connection.id },
        toDirection,
      );

      cable.mesh.visibility = 0.02;
""",
    'to plug direction',
)
text = replace_once(
    text,
    """      visual.cable.updateAnchors(from, to);
      this.positionBananaPlug(visual.plugFrom, from);
      this.positionBananaPlug(visual.plugTo, to);
""",
    """      const fromDirection = this.terminalOutwardDirection(visual.from);
      const toDirection = this.terminalOutwardDirection(visual.to);
      visual.cable.updateAnchors(from, to, fromDirection, toDirection);
      this.positionBananaPlug(visual.plugFrom, from, fromDirection);
      this.positionBananaPlug(visual.plugTo, to, toDirection);
""",
    'moving connection directions',
)
old_position = """  private positionBananaPlug(meshes: readonly Mesh[], terminalPosition: Vector3): void {
    const sleeve = meshes[0];
    const collar = meshes[1];
    const strainRelief = meshes[2];
    if (sleeve) sleeve.position = terminalPosition.add(new Vector3(0, 0, -0.27));
    if (collar) collar.position = terminalPosition.add(new Vector3(0, 0, -0.155));
    if (strainRelief) strainRelief.position = terminalPosition.add(new Vector3(0, 0, -0.455));
  }

  private createBananaPlug(
"""
new_position = """  private terminalOutwardDirection(id: TerminalId): Vector3 {
    const terminal = this.terminalMeshes.get(id)?.mesh;
    const parent = terminal?.parent;
    if (!parent) return new Vector3(0, 0, -1);
    const direction = Vector3.TransformNormal(new Vector3(0, 0, -1), parent.getWorldMatrix());
    direction.y = 0;
    if (direction.lengthSquared() < 1e-6) return new Vector3(0, 0, -1);
    return direction.normalize();
  }

  private positionBananaPlug(
    meshes: readonly Mesh[],
    terminalPosition: Vector3,
    requestedDirection?: Vector3,
  ): void {
    const direction = (requestedDirection ?? new Vector3(0, 0, -1)).clone();
    direction.y = 0;
    if (direction.lengthSquared() < 1e-6) direction.copyFromFloats(0, 0, -1);
    direction.normalize();
    const sleeve = meshes[0];
    const collar = meshes[1];
    const strainRelief = meshes[2];
    if (sleeve) sleeve.position = terminalPosition.add(direction.scale(0.27));
    if (collar) collar.position = terminalPosition.add(direction.scale(0.155));
    if (strainRelief) strainRelief.position = terminalPosition.add(direction.scale(0.455));

    // Cylinders are authored along local Z after the X rotation. Rotate that
    // axis with the terminal so a moved/rotated instrument cannot leave its plug behind.
    const yaw = Math.atan2(-direction.x, -direction.z);
    for (const mesh of meshes) {
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.y = yaw;
      mesh.rotation.z = 0;
    }
  }

  private createBananaPlug(
"""
text = replace_once(text, old_position, new_position, 'banana plug orientation')
text = replace_once(
    text,
    """    material: PBRMaterial,
    metadata: PickMetadata,
  ): Mesh[] {
""",
    """    material: PBRMaterial,
    metadata: PickMetadata,
    direction?: Vector3,
  ): Mesh[] {
""",
    'banana plug direction parameter',
)
text = replace_once(
    text,
    """    strainRelief.metadata = metadata;

    return [sleeve, collar, strainRelief];
""",
    """    strainRelief.metadata = metadata;

    const meshes = [sleeve, collar, strainRelief];
    this.positionBananaPlug(meshes, terminalPosition, direction);
    return meshes;
""",
    'banana plug initial positioning',
)
text = replace_once(
    text,
    """    loose.cable.updateAnchors(loose.start, loose.end);
    this.positionBananaPlug(active.end === 'start' ? loose.plugStart : loose.plugEnd, target);
""",
    """    const startDirection = loose.startTerminal ? this.terminalOutwardDirection(loose.startTerminal) : undefined;
    const endDirection = loose.endTerminal ? this.terminalOutwardDirection(loose.endTerminal) : undefined;
    loose.cable.updateAnchors(loose.start, loose.end, startDirection, endDirection);
    this.positionBananaPlug(
      active.end === 'start' ? loose.plugStart : loose.plugEnd,
      target,
      terminal ? this.terminalOutwardDirection(terminal) : undefined,
    );
""",
    'dragged loose plug direction',
)
text = replace_once(
    text,
    """      loose.cable.updateAnchors(loose.start, loose.end);
      this.positionBananaPlug(loose.plugStart, loose.start);
      this.positionBananaPlug(loose.plugEnd, loose.end);
""",
    """      const startDirection = loose.startTerminal ? this.terminalOutwardDirection(loose.startTerminal) : undefined;
      const endDirection = loose.endTerminal ? this.terminalOutwardDirection(loose.endTerminal) : undefined;
      loose.cable.updateAnchors(loose.start, loose.end, startDirection, endDirection);
      this.positionBananaPlug(loose.plugStart, loose.start, startDirection);
      this.positionBananaPlug(loose.plugEnd, loose.end, endDirection);
""",
    'loose wire sync directions',
)
path.write_text(text)


# --- Resistor visual: remove decorative torus stacks that read as floating rings in close-up. ---
path = Path('src/rendering/babylon/ProfessionalInstruments.ts')
text = path.read_text()
old_bands = """    for (const x of [-0.48, 0, 0.48]) {
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

"""
text = replace_once(text, old_bands, "", 'remove thin resistor bands')
path.write_text(text)

path = Path('src/rendering/babylon/InstrumentVisualPolish.ts')
text = path.read_text()
old_polish_bands = """  for (const offset of [-0.58, 0.58]) {
    const band = MeshBuilder.CreateTorus(`resistor-polish-body-band-${offset}`, { diameter: 0.448, thickness: 0.018, tessellation: 48 }, scene);
    band.position = new Vector3(offset, 0, 0);
    band.rotation.z = Math.PI / 2;
    band.parent = pivot;
    band.material = theme.copper;
    band.isPickable = false;
  }
"""
text = replace_once(text, old_polish_bands, "", 'remove polish resistor rings')
path.write_text(text)

print('rotated terminal lead and resistor visual fixes applied')
