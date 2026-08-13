from pathlib import Path
p = Path('src/rendering/babylon/LabScene.ts')
text = p.read_text().replace('  StandardMaterial,\n', '', 1)
p.write_text(text)
