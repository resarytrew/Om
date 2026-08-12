import './styles.css';
import { createOhmsLawRuntime } from './experiments/ohms-law/createOhmsLaw';
import { LabScene } from './rendering/babylon/LabScene';
import { renderApp } from './ui/renderApp';

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Root element #app was not found.');

const runtime = createOhmsLawRuntime();
const { canvas } = renderApp(root, runtime);
const scene = new LabScene(canvas, runtime);

if (import.meta.hot) {
  import.meta.hot.dispose(() => scene.dispose());
}
