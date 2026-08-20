const EQUIPMENT_TYPE = 'application/x-physics-instrument';
const RESISTOR_INSTRUMENTS = ['resistor', 'resistor-02', 'resistor-03', 'resistor-04'] as const;

function previewId(instrument: string): string {
  return instrument.startsWith('resistor') ? 'resistor' : instrument;
}

function equipmentPreviewMarkup(instrument: string): string {
  switch (previewId(instrument)) {
    case 'source':
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <defs>
            <linearGradient id="src-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#6f7880"/><stop offset="1" stop-color="#242a2f"/></linearGradient>
            <radialGradient id="src-knob"><stop stop-color="#545b61"/><stop offset=".48" stop-color="#15191c"/><stop offset="1" stop-color="#030405"/></radialGradient>
          </defs>
          <ellipse cx="66" cy="82" rx="49" ry="5" fill="#000" opacity=".55"/>
          <rect x="18" y="18" width="96" height="58" rx="6" fill="url(#src-body)" stroke="#8f9aa2" stroke-width="1.4"/>
          <path d="M25 18h82l-8-8H33z" fill="#4d565d" stroke="#7f8990"/>
          <g fill="#151a1e"><rect x="37" y="11" width="6" height="10" rx="1"/><rect x="49" y="11" width="6" height="10" rx="1"/><rect x="61" y="11" width="6" height="10" rx="1"/><rect x="73" y="11" width="6" height="10" rx="1"/><rect x="85" y="11" width="6" height="10" rx="1"/></g>
          <rect x="28" y="31" width="39" height="19" rx="2" fill="#061014" stroke="#151d22"/>
          <text x="47.5" y="44" text-anchor="middle" fill="#6fe8ff" font-size="8" font-family="monospace">6.00 V</text>
          <circle cx="91" cy="41" r="15" fill="#0b0e10" stroke="#90979c" stroke-width="2"/><circle cx="91" cy="41" r="11" fill="url(#src-knob)"/><path d="M91 41l-7-8" stroke="#f1f3f4" stroke-width="1.8" stroke-linecap="round"/>
          <circle cx="36" cy="65" r="6.2" fill="#d51e2a" stroke="#eceff1"/><circle cx="54" cy="65" r="6.2" fill="#11171b" stroke="#c7cdd1"/>
          <circle cx="89" cy="63" r="3.3" fill="#52e0ff"/><rect x="100" y="58" width="8" height="10" rx="1.5" fill="#111517" stroke="#7d858b"/>
        </svg>
      </span>`;
    case 'resistor':
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <defs><linearGradient id="res-cer" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f4edda"/><stop offset=".55" stop-color="#d7cab0"/><stop offset="1" stop-color="#aaa087"/></linearGradient><linearGradient id="res-cu"><stop stop-color="#f0a45f"/><stop offset=".45" stop-color="#a95322"/><stop offset="1" stop-color="#5e2611"/></linearGradient></defs>
          <ellipse cx="66" cy="81" rx="47" ry="5" fill="#000" opacity=".5"/>
          <rect x="18" y="58" width="96" height="18" rx="4" fill="#30373d" stroke="#828b91"/>
          <rect x="26" y="53" width="80" height="11" rx="2" fill="#d9d3c6" stroke="#a8a49c"/>
          <rect x="37" y="43" width="8" height="15" rx="2" fill="#ddd6c4" stroke="#b5ad9a"/><rect x="87" y="43" width="8" height="15" rx="2" fill="#ddd6c4" stroke="#b5ad9a"/>
          <rect x="34" y="31" width="64" height="20" rx="10" fill="url(#res-cer)" stroke="#c8bda5"/>
          <rect x="30" y="29" width="9" height="24" rx="2" fill="url(#res-cu)"/><rect x="94" y="29" width="9" height="24" rx="2" fill="url(#res-cu)"/>
          <path d="M44 35h42" stroke="#736955" stroke-width="1.2" opacity=".65"/>
          <circle cx="31" cy="70" r="7" fill="#ced3d6" stroke="#f8fafb"/><circle cx="101" cy="70" r="7" fill="#ced3d6" stroke="#f8fafb"/>
          <text x="66" y="70" text-anchor="middle" fill="#22282c" font-size="6.5" font-family="monospace">R = 3.00 Ω</text>
        </svg>
      </span>`;
    case 'ammeter':
    case 'voltmeter': {
      const unit = previewId(instrument) === 'ammeter' ? 'A' : 'V';
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <defs><linearGradient id="meter-body-${unit}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#727b82"/><stop offset="1" stop-color="#252b30"/></linearGradient></defs>
          <ellipse cx="66" cy="83" rx="43" ry="4.5" fill="#000" opacity=".55"/>
          <rect x="27" y="12" width="78" height="67" rx="5" fill="url(#meter-body-${unit})" stroke="#99a1a6" stroke-width="1.3"/>
          <rect x="34" y="19" width="64" height="39" rx="2" fill="#e8e7df" stroke="#161a1d" stroke-width="2"/>
          <path d="M43 48a25 25 0 0 1 46 0" fill="none" stroke="#2c3337" stroke-width="1.2"/>
          <g stroke="#434b50" stroke-width=".8"><path d="M45 47l-3-4"/><path d="M52 38l-2-5"/><path d="M65 34v-6"/><path d="M78 38l2-5"/><path d="M86 47l4-4"/></g>
          <text x="66" y="43" text-anchor="middle" fill="#1e2529" font-size="10" font-weight="700" font-family="Arial">${unit}</text>
          <path d="M66 51l-17-11" stroke="#df3945" stroke-width="2" stroke-linecap="round"/><circle cx="66" cy="51" r="3.4" fill="#1d2327" stroke="#bbc1c5"/>
          <circle cx="43" cy="69" r="6" fill="#d51e2a" stroke="#e7ecef"/><circle cx="89" cy="69" r="6" fill="#13202a" stroke="#d4dadd"/>
          <circle cx="31" cy="17" r="2.2" fill="#eef1f2"/><circle cx="101" cy="17" r="2.2" fill="#eef1f2"/>
        </svg>
      </span>`;
    }
    case 'wire':
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <ellipse cx="66" cy="80" rx="49" ry="4.5" fill="#000" opacity=".45"/>
          <path d="M25 64C20 28 55 20 69 44s39 20 38-8" fill="none" stroke="#d62b37" stroke-width="5" stroke-linecap="round"/>
          <path d="M24 68C44 85 57 62 48 48S54 20 76 25s25 22 36 12" fill="none" stroke="#171c20" stroke-width="5" stroke-linecap="round"/>
          <g transform="translate(14 60) rotate(-8)"><rect width="17" height="8" rx="3" fill="#e12d39"/><rect x="15" y="2" width="10" height="4" rx="1" fill="#b8c0c4"/></g>
          <g transform="translate(104 25) rotate(18)"><rect width="17" height="8" rx="3" fill="#e12d39"/><rect x="15" y="2" width="10" height="4" rx="1" fill="#b8c0c4"/></g>
          <g transform="translate(13 70) rotate(8)"><rect width="17" height="8" rx="3" fill="#151a1e" stroke="#66717a"/><rect x="15" y="2" width="10" height="4" rx="1" fill="#b8c0c4"/></g>
          <g transform="translate(107 35) rotate(14)"><rect width="17" height="8" rx="3" fill="#151a1e" stroke="#66717a"/><rect x="15" y="2" width="10" height="4" rx="1" fill="#b8c0c4"/></g>
        </svg>
      </span>`;
    case 'switch':
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <ellipse cx="66" cy="80" rx="38" ry="4" fill="#000" opacity=".5"/>
          <rect x="30" y="56" width="72" height="20" rx="4" fill="#31383d" stroke="#858e94"/>
          <circle cx="43" cy="59" r="6" fill="#cfd4d7" stroke="#f3f5f6"/><circle cx="90" cy="59" r="6" fill="#cfd4d7" stroke="#f3f5f6"/>
          <circle cx="44" cy="42" r="5" fill="#bdc4c8"/><circle cx="89" cy="42" r="5" fill="#bdc4c8"/>
          <path d="M44 42L82 23" stroke="#d5dadd" stroke-width="5" stroke-linecap="round"/><circle cx="82" cy="23" r="4" fill="#eef1f2"/>
          <rect x="39" y="62" width="55" height="5" rx="2.5" fill="#161b1f"/>
        </svg>
      </span>`;
    case 'lamp':
      return `<span class="equipment-preview" aria-hidden="true">
        <svg viewBox="0 0 132 92" role="presentation">
          <defs><radialGradient id="lamp-glow"><stop stop-color="#fff9d1"/><stop offset=".42" stop-color="#ffd85d"/><stop offset="1" stop-color="#b85b16" stop-opacity=".08"/></radialGradient></defs>
          <circle cx="66" cy="37" r="27" fill="url(#lamp-glow)" opacity=".52"/>
          <path d="M50 35a16 16 0 1 1 32 0c0 8-6 10-8 16H58c-2-6-8-8-8-16Z" fill="#fff0aa" fill-opacity=".72" stroke="#e7e0c2" stroke-width="1.5"/>
          <path d="M58 52h16M58 57h16M61 62h10" stroke="#aeb5b8" stroke-width="4" stroke-linecap="round"/>
          <path d="M57 37c5-6 13-6 18 0" fill="none" stroke="#d18a24" stroke-width="1.4"/>
          <rect x="36" y="67" width="60" height="10" rx="4" fill="#30373c" stroke="#7d878d"/>
          <circle cx="44" cy="72" r="5" fill="#c8cfd2"/><circle cx="88" cy="72" r="5" fill="#c8cfd2"/>
        </svg>
      </span>`;
    default:
      return `<span class="equipment-preview" aria-hidden="true"><span class="equipment-preview-fallback">${instrument.slice(0, 1).toUpperCase()}</span></span>`;
  }
}

function decoratePreview(button: HTMLButtonElement, instrument: string): void {
  const current = button.querySelector<HTMLElement>('.equipment-preview');
  if (!current) {
    const icon = button.querySelector<HTMLElement>('.equipment-icon');
    if (icon) icon.outerHTML = equipmentPreviewMarkup(instrument);
    else button.insertAdjacentHTML('afterbegin', equipmentPreviewMarkup(instrument));
  }
  button.classList.add('equipment-preview-card');
}

function installDragImage(button: HTMLButtonElement, event: DragEvent): void {
  if (!event.dataTransfer) return;
  const preview = button.querySelector<HTMLElement>('.equipment-preview');
  if (!preview) return;

  const ghost = document.createElement('div');
  ghost.className = 'equipment-drag-ghost';
  const title = button.querySelector<HTMLElement>('.equipment-copy b, .equipment-copy strong')?.textContent ?? 'Оборудование';
  ghost.innerHTML = `${preview.outerHTML}<span>${title}</span>`;
  document.body.append(ghost);
  event.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
  window.requestAnimationFrame(() => ghost.remove());
}

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
    );
    const lampButton = this.createButton(
      'lamp',
      'Лампочка',
      '6 В · нагрузка',
    );
    grid.append(keyButton, lampButton);
    this.bindButton(keyButton, () => (this.placed.has('switch') ? null : 'switch'));
    this.bindButton(lampButton, () => (this.placed.has('lamp') ? null : 'lamp'));

    for (const button of root.querySelectorAll<HTMLButtonElement>('.equipment-item[data-equipment]')) {
      const instrument = button.dataset.equipment ?? '';
      decoratePreview(button, instrument);
      if (button !== resistor && button !== keyButton && button !== lampButton) {
        const dragPreview = (event: DragEvent): void => installDragImage(button, event);
        button.addEventListener('dragstart', dragPreview);
        this.cleanups.push(() => button.removeEventListener('dragstart', dragPreview));
      }
    }

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

  private createButton(equipment: string, title: string, subtitle: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'equipment-item equipment-item-expanded equipment-preview-card';
    button.type = 'button';
    button.draggable = true;
    button.dataset.equipment = equipment;
    button.setAttribute('aria-pressed', 'false');
    button.innerHTML = `
      ${equipmentPreviewMarkup(equipment)}
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
      decoratePreview(button, instrument);
      event.dataTransfer.setData(EQUIPMENT_TYPE, instrument);
      event.dataTransfer.setData('text/plain', instrument);
      event.dataTransfer.effectAllowed = 'move';
      installDragImage(button, event);
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
