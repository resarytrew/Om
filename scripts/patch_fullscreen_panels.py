from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f'anchor not found: {label}')
    return text.replace(old, new, 1)

render_path = Path('src/ui/renderApp.ts')
styles_path = Path('src/styles.css')
render = render_path.read_text()
styles = styles_path.read_text()

render = replace_once(render, '<div class="app-shell">', '<div class="app-shell" id="app-shell">', 'app shell id')

render = replace_once(
    render,
    '''        <div class="modes" id="ohm-modes" aria-label="Режим работы">\n          <button class="mode active" data-mode="manual">Manual</button>\n          <button class="mode" data-mode="blocks">Blocks</button>\n          <button class="mode" data-mode="python">Python</button>\n        </div>''',
    '''        <div class="topbar-actions">\n          <div class="modes" id="ohm-modes" aria-label="Режим работы">\n            <button class="mode active" data-mode="manual">Manual</button>\n            <button class="mode" data-mode="blocks">Blocks</button>\n            <button class="mode" data-mode="python">Python</button>\n          </div>\n          <div class="layout-controls" aria-label="Панели интерфейса">\n            <button id="toggle-sidebar" class="layout-control" type="button" aria-pressed="false" title="Скрыть левую панель"><span>☰</span><small>Меню</small></button>\n            <button id="toggle-controls" class="layout-control" type="button" aria-pressed="false" title="Скрыть панель параметров"><span>◧</span><small>Параметры</small></button>\n          </div>\n        </div>''',
    'topbar layout controls',
)

render = replace_once(
    render,
    '''          <div class="scene-head">\n            <div><span class="eyebrow">LIVE LAB</span><h1>Закон Ома для участка цепи</h1></div>\n            <div id="circuit-status" class="circuit-status">Цепь разомкнута</div>\n          </div>''',
    '''          <div class="scene-head">\n            <div><span class="eyebrow">LIVE LAB</span><h1>Закон Ома для участка цепи</h1></div>\n            <div class="scene-head-actions">\n              <div id="circuit-status" class="circuit-status">Цепь разомкнута</div>\n              <button id="lab-fullscreen" class="scene-fullscreen" type="button" aria-pressed="false" title="Полный экран (F)" aria-label="Открыть лабораторию на весь экран">⛶</button>\n            </div>\n          </div>''',
    'scene fullscreen button',
)

render = replace_once(
    render,
    "  const canvas = root.querySelector<HTMLCanvasElement>('#lab-canvas');\n  const voltage = root.querySelector<HTMLInputElement>('#voltage');",
    "  const appShell = root.querySelector<HTMLElement>('#app-shell');\n  const canvas = root.querySelector<HTMLCanvasElement>('#lab-canvas');\n  const labCard = root.querySelector<HTMLElement>('.lab-card');\n  const sidebarToggle = root.querySelector<HTMLButtonElement>('#toggle-sidebar');\n  const controlsToggle = root.querySelector<HTMLButtonElement>('#toggle-controls');\n  const fullscreenToggle = root.querySelector<HTMLButtonElement>('#lab-fullscreen');\n  const voltage = root.querySelector<HTMLInputElement>('#voltage');",
    'view control selectors',
)

render = replace_once(
    render,
    "  if (!canvas || !voltage || !resistance || !preset || !measure || !clearWires || !clearBench || !equipmentDock || !equipmentDockToggle || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {\n    throw new Error('Application shell failed to initialize.');\n  }",
    "  if (!appShell || !canvas || !labCard || !sidebarToggle || !controlsToggle || !fullscreenToggle || !voltage || !resistance || !preset || !measure || !clearWires || !clearBench || !equipmentDock || !equipmentDockToggle || !clearData || !workspace || !fieldWorkspace || !modes || !breadcrumb || !navOhm || !navFields || !manualControls || !manualTerminal || !blocksCard || !pythonCard) {\n    throw new Error('Application shell failed to initialize.');\n  }",
    'view control initialization guard',
)

render = replace_once(
    render,
    "  let mode: AppMode = 'manual';\n  let section: AppSection = 'ohm';\n  let standardBuildSequence = 0;",
    """  let mode: AppMode = 'manual';
  let section: AppSection = 'ohm';
  let standardBuildSequence = 0;
  let sidebarCollapsed = false;
  let controlsCollapsed = false;

  const syncLayoutControls = (): void => {
    appShell.classList.toggle('sidebar-collapsed', sidebarCollapsed);
    const controlsCanShow = section === 'ohm' && mode === 'manual';
    workspace.classList.toggle('controls-collapsed', controlsCanShow && controlsCollapsed);

    sidebarToggle.classList.toggle('active', sidebarCollapsed);
    sidebarToggle.setAttribute('aria-pressed', String(sidebarCollapsed));
    sidebarToggle.title = sidebarCollapsed ? 'Показать левую панель' : 'Скрыть левую панель';
    const sidebarLabel = sidebarToggle.querySelector<HTMLElement>('small');
    if (sidebarLabel) sidebarLabel.textContent = sidebarCollapsed ? 'Показать меню' : 'Меню';

    controlsToggle.hidden = !controlsCanShow;
    controlsToggle.classList.toggle('active', controlsCollapsed);
    controlsToggle.setAttribute('aria-pressed', String(controlsCollapsed));
    controlsToggle.title = controlsCollapsed ? 'Показать панель параметров' : 'Скрыть панель параметров';
    const controlsLabel = controlsToggle.querySelector<HTMLElement>('small');
    if (controlsLabel) controlsLabel.textContent = controlsCollapsed ? 'Показать' : 'Параметры';
  };

  const syncFullscreenControl = (): void => {
    const active = document.fullscreenElement === labCard;
    labCard.classList.toggle('fullscreen-active', active);
    fullscreenToggle.classList.toggle('active', active);
    fullscreenToggle.setAttribute('aria-pressed', String(active));
    fullscreenToggle.textContent = active ? '↙' : '⛶';
    fullscreenToggle.title = active ? 'Выйти из полного экрана (Esc)' : 'Полный экран (F)';
    fullscreenToggle.setAttribute('aria-label', active ? 'Выйти из полноэкранного режима' : 'Открыть лабораторию на весь экран');
  };

  const toggleLabFullscreen = async (): Promise<void> => {
    try {
      if (document.fullscreenElement === labCard) {
        await document.exitFullscreen();
      } else if (!document.fullscreenElement) {
        await labCard.requestFullscreen();
      }
    } catch (error) {
      console.warn('Fullscreen mode is not available in this browser context.', error);
    }
  };

  const handleFullscreenChange = (): void => syncFullscreenControl();
  const handleViewKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    const isTyping = target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || Boolean(target?.isContentEditable)
      || Boolean(target?.closest('.monaco-editor, .blocklyWorkspace'));
    if (isTyping || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key.toLowerCase() !== 'f' || section !== 'ohm') return;
    event.preventDefault();
    void toggleLabFullscreen();
  };""",
    'layout state and fullscreen helpers',
)

render = replace_once(
    render,
    "    if (mode === 'blocks') void blocksPanel.activate();\n    if (mode === 'python') void pythonPanel.activate();\n    if (mode !== 'python') pythonPanel.deactivate();\n  };",
    "    if (mode === 'blocks') void blocksPanel.activate();\n    if (mode === 'python') void pythonPanel.activate();\n    if (mode !== 'python') pythonPanel.deactivate();\n    syncLayoutControls();\n  };",
    'sync layout on mode change',
)

render = replace_once(
    render,
    "    if (section === 'fields') void fieldWorkbench.activate();\n  };",
    "    if (section === 'fields') void fieldWorkbench.activate();\n    syncLayoutControls();\n  };",
    'sync layout on section change',
)

render = replace_once(
    render,
    "  navOhm.addEventListener('click', () => setSection('ohm'));\n  navFields.addEventListener('click', () => setSection('fields'));",
    """  sidebarToggle.addEventListener('click', () => {
    sidebarCollapsed = !sidebarCollapsed;
    syncLayoutControls();
  });
  controlsToggle.addEventListener('click', () => {
    controlsCollapsed = !controlsCollapsed;
    syncLayoutControls();
  });
  fullscreenToggle.addEventListener('click', () => { void toggleLabFullscreen(); });
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('keydown', handleViewKeyDown);

  navOhm.addEventListener('click', () => setSection('ohm'));
  navFields.addEventListener('click', () => setSection('fields'));""",
    'bind layout controls',
)

render = replace_once(
    render,
    "  setMode(mode);\n  setSection(section);\n\n  return {",
    "  setMode(mode);\n  setSection(section);\n  syncLayoutControls();\n  syncFullscreenControl();\n\n  return {",
    'initialize layout controls',
)

render = replace_once(
    render,
    "      unsubscribe();\n      blocksPanel.dispose();",
    "      document.removeEventListener('fullscreenchange', handleFullscreenChange);\n      document.removeEventListener('keydown', handleViewKeyDown);\n      unsubscribe();\n      blocksPanel.dispose();",
    'cleanup layout listeners',
)

styles += """

/* --- Focus / fullscreen laboratory layout --- */
.topbar-actions {
  justify-self: end;
  height: 100%;
  display: flex;
  align-items: stretch;
  gap: 10px;
}

.topbar-actions .modes { justify-self: auto; }

.layout-controls {
  display: flex;
  align-items: center;
  gap: 5px;
  padding-left: 8px;
  border-left: 1px solid var(--line-soft);
}

.layout-control,
.scene-fullscreen {
  border: 1px solid #2d3b45;
  background: #111920;
  color: #8d9ca7;
  cursor: pointer;
  transition: border-color .18s ease, background .18s ease, color .18s ease, transform .18s ease;
}

.layout-control {
  min-width: 62px;
  height: 38px;
  padding: 4px 8px;
  border-radius: 7px;
  display: grid;
  grid-template-columns: 15px auto;
  align-items: center;
  gap: 5px;
}

.layout-control span { font-size: 14px; line-height: 1; }
.layout-control small { font: 700 8px/1 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: nowrap; letter-spacing: .02em; }

.layout-control:hover,
.scene-fullscreen:hover { border-color: #4a8396; color: #c9f3ff; background: #14242b; }
.layout-control.active,
.scene-fullscreen.active { border-color: #4dbbd9; color: #91eaff; background: #102831; box-shadow: inset 0 0 0 1px rgba(76, 214, 247, .08); }

.scene-head-actions { display: flex; align-items: center; gap: 8px; }
.scene-fullscreen { width: 38px; height: 38px; flex: 0 0 auto; border-radius: 8px; font: 700 18px/1 ui-monospace, monospace; }

.app-shell { transition: grid-template-columns .24s cubic-bezier(.2,.7,.2,1); }
.sidebar { min-width: 0; overflow: hidden; transition: opacity .18s ease, transform .24s cubic-bezier(.2,.7,.2,1), padding .24s ease; }
.app-shell.sidebar-collapsed { grid-template-columns: 0 minmax(990px, 1fr); }
.app-shell.sidebar-collapsed .sidebar { padding-left: 0; padding-right: 0; border-right-color: transparent; opacity: 0; transform: translateX(-100%); pointer-events: none; }

.workspace { transition: grid-template-columns .24s cubic-bezier(.2,.7,.2,1); }
.workspace.controls-collapsed[data-mode='manual'] {
  grid-template-areas:
    'lab lab'
    'graph table'
    'terminal terminal';
}
.workspace.controls-collapsed[data-mode='manual'] .controls-card { display: none !important; }

.lab-card:fullscreen {
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  border: 0;
  border-radius: 0;
  grid-template-rows: 68px minmax(0, 1fr);
  background: #090d11;
}
.lab-card:fullscreen .scene-head { padding: 12px 18px; background: rgba(12, 17, 21, .98); }
.lab-card:fullscreen .scene-wrap { min-height: 0; height: 100%; }
.lab-card:fullscreen #lab-canvas { width: 100%; height: 100%; }
.lab-card:fullscreen .equipment-dock { top: 18px; left: 18px; max-height: calc(100% - 36px); }
.lab-card:fullscreen .scene-hint { bottom: 18px; }

@media (max-width: 1320px) {
  .layout-control { min-width: 38px; grid-template-columns: 1fr; justify-items: center; }
  .layout-control small { display: none; }
}
"""

render_path.write_text(render)
styles_path.write_text(styles)
print('fullscreen and panel controls patch applied')
