export class LabViewControlsController {
  private readonly cleanups: Array<() => void> = [];
  private readonly appShell: HTMLElement | null;
  private readonly workspace: HTMLElement | null;
  private readonly labCard: HTMLElement | null;
  private readonly sceneWrap: HTMLElement | null;
  private panel: HTMLElement | null = null;

  constructor(private readonly root: HTMLElement) {
    this.appShell = root.querySelector<HTMLElement>('#app-shell, .app-shell');
    this.workspace = root.querySelector<HTMLElement>('#ohm-workspace');
    this.labCard = root.querySelector<HTMLElement>('.lab-card');
    this.sceneWrap = root.querySelector<HTMLElement>('.scene-wrap');

    if (!this.sceneWrap || !this.labCard || !this.workspace || !this.appShell) return;
    this.install();
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
    this.panel?.remove();
    this.panel = null;
  }

  private install(): void {
    const panel = document.createElement('div');
    panel.className = 'lab-view-controls';
    panel.innerHTML = `
      <button class="lab-view-trigger" type="button" data-view="panel" aria-expanded="false" title="Управление интерфейсом">UI</button>
      <div class="lab-view-menu" hidden>
        <div class="lab-view-menu-head">
          <span>ВИД ЛАБОРАТОРИИ</span>
          <button type="button" data-view="panel-close" aria-label="Свернуть">×</button>
        </div>
        <button type="button" data-view="all">Скрыть всё</button>
        <button type="button" data-view="topbar">Верхняя панель</button>
        <button type="button" data-view="sidebar">Левое меню</button>
        <button type="button" data-view="controls">Параметры</button>
        <button type="button" data-view="data">График / таблица / терминал</button>
        <button type="button" data-view="equipment">Оборудование</button>
        <button type="button" data-view="hint">Подсказка</button>
        <button type="button" data-view="fullscreen">Полный экран</button>
        <button type="button" data-view="restore">Показать всё</button>
      </div>`;
    this.sceneWrap!.append(panel);
    this.panel = panel;

    const trigger = panel.querySelector<HTMLButtonElement>('[data-view="panel"]')!;
    const menu = panel.querySelector<HTMLElement>('.lab-view-menu')!;

    const setMenuOpen = (open: boolean): void => {
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      panel.classList.toggle('open', open);
    };

    const onClick = (event: MouseEvent): void => {
      const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('[data-view]');
      if (!button) return;
      const action = button.dataset.view;
      if (action === 'panel') { setMenuOpen(menu.hidden); return; }
      if (action === 'panel-close') { setMenuOpen(false); return; }
      if (action === 'all') this.hideAll();
      if (action === 'restore') this.showAll();
      if (action === 'topbar') this.toggle('view-hide-topbar');
      if (action === 'sidebar') this.toggle('view-hide-sidebar');
      if (action === 'controls') this.toggle('view-hide-controls');
      if (action === 'data') this.toggle('view-hide-data');
      if (action === 'equipment') this.toggle('view-hide-equipment');
      if (action === 'hint') this.toggle('view-hide-hint');
      if (action === 'fullscreen') void this.toggleFullscreen();
      this.syncButtons();
    };
    panel.addEventListener('click', onClick);
    this.cleanups.push(() => panel.removeEventListener('click', onClick));

    const onFullscreenChange = (): void => this.syncButtons();
    document.addEventListener('fullscreenchange', onFullscreenChange);
    this.cleanups.push(() => document.removeEventListener('fullscreenchange', onFullscreenChange));

    const onKeyDown = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        setMenuOpen(menu.hidden);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    this.cleanups.push(() => document.removeEventListener('keydown', onKeyDown));

    this.syncButtons();
  }

  private toggle(className: string): void {
    this.appShell?.classList.toggle(className);
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
  }

  private hideAll(): void {
    this.appShell?.classList.add(
      'view-hide-topbar',
      'view-hide-sidebar',
      'view-hide-controls',
      'view-hide-data',
      'view-hide-equipment',
      'view-hide-hint',
    );
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
  }

  private showAll(): void {
    this.appShell?.classList.remove(
      'view-hide-topbar',
      'view-hide-sidebar',
      'view-hide-controls',
      'view-hide-data',
      'view-hide-equipment',
      'view-hide-hint',
    );
    window.setTimeout(() => window.dispatchEvent(new Event('resize')), 40);
  }

  private async toggleFullscreen(): Promise<void> {
    try {
      if (document.fullscreenElement === this.labCard) await document.exitFullscreen();
      else if (!document.fullscreenElement) await this.labCard?.requestFullscreen();
    } catch (error) {
      console.warn('Fullscreen is unavailable.', error);
    }
  }

  private syncButtons(): void {
    if (!this.panel || !this.appShell) return;
    const state = (name: string, active: boolean): void => {
      const button = this.panel!.querySelector<HTMLButtonElement>(`[data-view="${name}"]`);
      button?.classList.toggle('active', active);
      button?.setAttribute('aria-pressed', String(active));
    };
    state('topbar', this.appShell.classList.contains('view-hide-topbar'));
    state('sidebar', this.appShell.classList.contains('view-hide-sidebar'));
    state('controls', this.appShell.classList.contains('view-hide-controls'));
    state('data', this.appShell.classList.contains('view-hide-data'));
    state('equipment', this.appShell.classList.contains('view-hide-equipment'));
    state('hint', this.appShell.classList.contains('view-hide-hint'));
    state('fullscreen', document.fullscreenElement === this.labCard);
  }
}
