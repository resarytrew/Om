const EQUIPMENT_TYPE = 'application/x-physics-instrument';
const RESISTOR_INSTRUMENTS = ['resistor', 'resistor-02', 'resistor-03', 'resistor-04'] as const;

export class OhmEquipmentExpansionController {
  private readonly placed = new Set<string>();
  private readonly cleanups: Array<() => void> = [];
  private resistorButton: HTMLButtonElement | null = null;

  constructor(
    root: HTMLElement,
    private readonly canvas: HTMLCanvasElement,
  ) {
    const grid = root.querySelector<HTMLElement>('.equipment-grid');
    const originalResistor = root.querySelector<HTMLButtonElement>('[data-equipment="resistor"]');
    if (!grid || !originalResistor) return;

    const resistor = originalResistor.cloneNode(true) as HTMLButtonElement;
    originalResistor.replaceWith(resistor);
    resistor.title = 'Добавить следующий резистор (до 4 шт.)';
    resistor.querySelector<HTMLElement>('.equipment-copy small')!.textContent = '0.5–20 Ω · до 4 шт.';
    this.resistorButton = resistor;
    this.bindButton(resistor, () => RESISTOR_INSTRUMENTS.find((id) => !this.placed.has(id)) ?? null);

    const keyButton = this.createButton(
      'switch',
      'Ключ',
      'размыкание / замыкание',
      '<svg viewBox="0 0 44 30" aria-hidden="true"><circle cx="8" cy="22" r="3"/><circle cx="36" cy="22" r="3"/><path d="M10 20 L31 8"/><path d="M32 20 H38"/></svg>',
    );
    const lampButton = this.createButton(
      'lamp',
      'Лампочка',
      '6 В · нагрузка',
      '<svg viewBox="0 0 44 44" aria-hidden="true"><path d="M14 20a8 8 0 1 1 16 0c0 4-3 5-4 8h-8c-1-3-4-4-4-8Z"/><path d="M18 32h8M19 36h6"/></svg>',
    );
    grid.append(keyButton, lampButton);
    this.bindButton(keyButton, () => (this.placed.has('switch') ? null : 'switch'));
    this.bindButton(lampButton, () => (this.placed.has('lamp') ? null : 'lamp'));

    const presence = (rawEvent: Event): void => {
      const event = rawEvent as CustomEvent<{ placed?: string[] }>;
      this.placed.clear();
      for (const id of event.detail?.placed ?? []) this.placed.add(id);
      this.updateResistorState();
    };
    canvas.addEventListener('lab:instrument-presence', presence as EventListener);
    this.cleanups.push(() => canvas.removeEventListener('lab:instrument-presence', presence as EventListener));
    this.updateResistorState();
  }

  dispose(): void {
    for (const cleanup of this.cleanups.splice(0)) cleanup();
  }

  private createButton(equipment: string, title: string, subtitle: string, icon: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'equipment-item equipment-item-expanded';
    button.type = 'button';
    button.draggable = true;
    button.dataset.equipment = equipment;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      <span class="equipment-icon expanded-equipment-icon">${icon}</span>
      <span class="equipment-copy"><strong>${title}</strong><small>${subtitle}</small></span>
      <span class="equipment-state">READY</span>
    `;
    return button;
  }

  private bindButton(button: HTMLButtonElement, resolveInstrument: () => string | null): void {
    const click = (): void => {
      if (button.disabled) return;
      const instrument = resolveInstrument();
      if (!instrument) return;
      this.canvas.dispatchEvent(new CustomEvent('lab:place-instrument', { detail: { instrument } }));
    };
    const dragStart = (event: DragEvent): void => {
      if (!event.dataTransfer || button.disabled) return;
      const instrument = resolveInstrument();
      if (!instrument) {
        event.preventDefault();
        return;
      }
      event.dataTransfer.setData(EQUIPMENT_TYPE, instrument);
      event.dataTransfer.effectAllowed = 'move';
      button.classList.add('dragging');
    };
    const dragEnd = (): void => button.classList.remove('dragging');
    button.addEventListener('click', click);
    button.addEventListener('dragstart', dragStart);
    button.addEventListener('dragend', dragEnd);
    this.cleanups.push(() => button.removeEventListener('click', click));
    this.cleanups.push(() => button.removeEventListener('dragstart', dragStart));
    this.cleanups.push(() => button.removeEventListener('dragend', dragEnd));
  }

  private updateResistorState(): void {
    const button = this.resistorButton;
    if (!button) return;
    const count = RESISTOR_INSTRUMENTS.filter((id) => this.placed.has(id)).length;
    const state = button.querySelector<HTMLElement>('.equipment-state');
    button.classList.toggle('placed', count > 0);
    button.setAttribute('aria-pressed', String(count > 0));
    button.setAttribute('aria-disabled', String(count >= RESISTOR_INSTRUMENTS.length));
    if (state) state.textContent = count >= RESISTOR_INSTRUMENTS.length ? '4/4 FULL' : `${count}/4 READY`;
  }
}
