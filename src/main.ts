import './styles.css';
import './blocks.css';
import './python.css';
import './field.css';
import './field-enhancements.css';
import './mechanics.css';
import './ohm-polish.css';
import './ohm-expansion.css';
import './lab-view-controls.css';
import { MechanicsWorkbenchController } from './experiments/mechanics/MechanicsWorkbenchController';
import { createOhmsLawRuntime } from './experiments/ohms-law/createOhmsLaw';
import { PythonRuntimeClient } from './programming/python/PythonRuntimeClient';
import { LabScene } from './rendering/babylon/LabScene';
import { LabViewControlsController } from './ui/LabViewControlsController';
import { OhmEquipmentExpansionController } from './ui/OhmEquipmentExpansionController';
import { renderApp } from './ui/renderApp';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Root element #app was not found.');

const runtime = createOhmsLawRuntime();
const pythonClient = new PythonRuntimeClient();
const app = renderApp(root, runtime, pythonClient);
const ohmEquipmentExpansion = new OhmEquipmentExpansionController(root, app.canvas);
const labViewControls = new LabViewControlsController(root);
const mechanicsWorkbench = new MechanicsWorkbenchController(root);
const scene = new LabScene(app.canvas, runtime);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose();
    mechanicsWorkbench.dispose();
    labViewControls.dispose();
    ohmEquipmentExpansion.dispose();
    app.dispose();
    pythonClient.dispose();
  });
}
