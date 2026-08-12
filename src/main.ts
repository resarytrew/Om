import './styles.css';
import './blocks.css';
import './python.css';
import './field.css';
import { createOhmsLawRuntime } from './experiments/ohms-law/createOhmsLaw';
import { PythonRuntimeClient } from './programming/python/PythonRuntimeClient';
import { LabScene } from './rendering/babylon/LabScene';
import { renderApp } from './ui/renderApp';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Root element #app was not found.');

const runtime = createOhmsLawRuntime();
const pythonClient = new PythonRuntimeClient();
const app = renderApp(root, runtime, pythonClient);
const scene = new LabScene(app.canvas, runtime);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    scene.dispose();
    app.dispose();
    pythonClient.dispose();
  });
}
