import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

interface MonacoHost {
  MonacoEnvironment?: {
    getWorker(): Worker;
  };
}

const host = globalThis as typeof globalThis & MonacoHost;
host.MonacoEnvironment = {
  getWorker: () => new EditorWorker(),
};

monaco.editor.defineTheme('physics-lab', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '6F7D87' },
    { token: 'keyword', foreground: '7DD8F7' },
    { token: 'number', foreground: 'C9E68A' },
    { token: 'string', foreground: 'D7C68B' },
  ],
  colors: {
    'editor.background': '#101419',
    'editor.foreground': '#DCE5EA',
    'editorLineNumber.foreground': '#4E5A64',
    'editorLineNumber.activeForeground': '#8E9AA5',
    'editor.lineHighlightBackground': '#151C22',
    'editorCursor.foreground': '#58D7FF',
    'editor.selectionBackground': '#24485A88',
    'editorIndentGuide.background1': '#202932',
  },
});

export interface PythonEditorHandle {
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  layout(): void;
  dispose(): void;
}

export function createPythonEditor(container: HTMLElement, initialValue: string): PythonEditorHandle {
  const instance = monaco.editor.create(container, {
    value: initialValue,
    language: 'python',
    theme: 'physics-lab',
    automaticLayout: false,
    minimap: { enabled: false },
    fontFamily: 'JetBrains Mono, IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 13,
    lineHeight: 21,
    lineNumbersMinChars: 3,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    padding: { top: 14, bottom: 14 },
    renderLineHighlight: 'all',
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    wordWrap: 'off',
    tabSize: 4,
  });

  const observer = new ResizeObserver(() => instance.layout());
  observer.observe(container);

  return {
    getValue: () => instance.getValue(),
    setValue: (value) => instance.setValue(value),
    focus: () => instance.focus(),
    layout: () => instance.layout(),
    dispose: () => {
      observer.disconnect();
      instance.dispose();
    },
  };
}
