type Sample = { id: number; t: number; x: number; v: number; a: number };

const G = 9.81;

export class MechanicsWorkbenchController {
  private readonly workspace: HTMLElement;
  private readonly nav: HTMLButtonElement;
  private frame = 0;
  private lastTime = 0;
  private running = false;
  private t = 0;
  private x = 0;
  private v = 0;
  private samples: Sample[] = [];

  constructor(private readonly root: HTMLElement) {
    const navItems = [...root.querySelectorAll<HTMLButtonElement>('.sidebar .nav-item')];
    const nav = navItems.find((item) => item.textContent?.includes('Механика'));
    const shell = root.querySelector<HTMLElement>('.app-shell');
    if (!nav || !shell) throw new Error('Mechanics navigation shell was not found.');
    this.nav = nav;
    nav.disabled = false;
    nav.id = 'nav-mechanics';

    this.workspace = document.createElement('main');
    this.workspace.id = 'mechanics-workspace';
    this.workspace.className = 'mechanics-workspace';
    this.workspace.hidden = true;
    this.workspace.innerHTML = this.template();
    shell.append(this.workspace);

    nav.addEventListener('click', () => this.activate());
    for (const item of navItems.filter((item) => item !== nav)) {
      item.addEventListener('click', () => { this.workspace.hidden = true; this.stop(); }, { capture: true });
    }

    this.bindControls();
    this.reset();
  }

  dispose(): void {
    this.stop();
    this.workspace.remove();
  }

  private activate(): void {
    this.root.querySelectorAll<HTMLElement>('main').forEach((main) => { main.hidden = main !== this.workspace; });
    const modes = this.root.querySelector<HTMLElement>('#ohm-modes');
    if (modes) modes.hidden = true;
    this.root.querySelectorAll('.sidebar .nav-item').forEach((item) => item.classList.toggle('active', item === this.nav));
    const breadcrumb = this.root.querySelector<HTMLElement>('#app-breadcrumb');
    if (breadcrumb) breadcrumb.innerHTML = '<span>Механика</span><b>/</b> II закон Ньютона';
    this.workspace.hidden = false;
    this.draw();
  }

  private template(): string {
    return `
      <section class="mechanics-scene-card">
        <div class="mechanics-head"><div><span class="eyebrow">LIVE MECHANICS LAB</span><h1>II закон Ньютона: тележка на дорожке</h1></div><div id="mechanics-status" class="mechanics-status">ГОТОВО</div></div>
        <div class="mechanics-stage"><canvas id="mechanics-canvas" width="980" height="520" aria-label="Тележка на горизонтальной дорожке"></canvas><div class="mechanics-hint">Изменяйте массу, силу и трение. Векторы показывают действующие силы, а тележка движется по результату численного интегрирования.</div></div>
      </section>
      <aside class="mechanics-controls-card">
        <div class="panel-title">Параметры опыта</div>
        ${this.slider('mass','Масса тележки, m','кг',0.5,5,0.1,1.5)}
        ${this.slider('force','Приложенная сила, F','Н',-15,15,0.5,6)}
        ${this.slider('friction','Коэффициент трения, μ','',0,0.8,0.02,0.12)}
        ${this.slider('velocity','Начальная скорость, v₀','м/с',-4,4,0.1,0)}
        <div class="mechanics-actions"><button id="mechanics-run" class="primary">▶ Запустить</button><button id="mechanics-step" class="secondary">+0.1 с</button><button id="mechanics-reset" class="ghost">Сброс</button></div>
        <button id="mechanics-measure" class="ghost mechanics-measure">Зафиксировать измерение</button>
        <div class="mechanics-readout"><div><span>ΣF</span><b id="mechanics-net">—</b></div><div><span>a</span><b id="mechanics-a">—</b></div><div><span>v</span><b id="mechanics-v">—</b></div><div><span>x</span><b id="mechanics-x">—</b></div><div><span>t</span><b id="mechanics-t">—</b></div></div>
        <div class="mechanics-law">ΣF = ma · F<sub>тр</sub> = μmg</div>
      </aside>
      <section class="mechanics-data-card">
        <div class="panel-title row"><span>График v(t)</span><button id="mechanics-clear-data" class="text-button">Очистить</button></div><div id="mechanics-graph" class="mechanics-graph"></div>
      </section>
      <section class="mechanics-data-card mechanics-table-card"><div class="panel-title">Измерения</div><div class="table-wrap"><table><thead><tr><th>#</th><th>t, c</th><th>x, м</th><th>v, м/с</th><th>a, м/с²</th></tr></thead><tbody id="mechanics-table"></tbody></table></div></section>`;
  }

  private slider(id: string, label: string, unit: string, min: number, max: number, step: number, value: number): string {
    return `<label class="mechanics-control"><div><span>${label}</span><output id="mechanics-${id}-value">${value}${unit ? ` ${unit}` : ''}</output></div><input id="mechanics-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }

  private bindControls(): void {
    for (const id of ['mass','force','friction','velocity']) {
      this.el<HTMLInputElement>(`#mechanics-${id}`).addEventListener('input', () => { this.updateLabels(); if (!this.running && id === 'velocity') this.v = this.num('velocity'); this.render(); });
    }
    this.el<HTMLButtonElement>('#mechanics-run').addEventListener('click', () => this.running ? this.stop() : this.start());
    this.el<HTMLButtonElement>('#mechanics-step').addEventListener('click', () => { this.stop(); this.integrate(0.1); this.render(); });
    this.el<HTMLButtonElement>('#mechanics-reset').addEventListener('click', () => this.reset());
    this.el<HTMLButtonElement>('#mechanics-measure').addEventListener('click', () => this.capture());
    this.el<HTMLButtonElement>('#mechanics-clear-data').addEventListener('click', () => { this.samples = []; this.renderData(); });
  }

  private start(): void {
    if (this.t === 0) this.v = this.num('velocity');
    this.running = true; this.lastTime = performance.now();
    this.el<HTMLButtonElement>('#mechanics-run').textContent = 'Ⅱ Пауза';
    this.el<HTMLElement>('#mechanics-status').textContent = 'ИДЁТ ОПЫТ';
    this.loop(this.lastTime);
  }

  private stop(): void {
    this.running = false; cancelAnimationFrame(this.frame);
    const button = this.workspace.querySelector<HTMLButtonElement>('#mechanics-run'); if (button) button.textContent = '▶ Запустить';
    const status = this.workspace.querySelector<HTMLElement>('#mechanics-status'); if (status) status.textContent = 'ПАУЗА';
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.035, Math.max(0, (now - this.lastTime) / 1000)); this.lastTime = now;
    this.integrate(dt); this.render(); this.frame = requestAnimationFrame(this.loop);
  };

  private dynamics(): { friction: number; net: number; a: number } {
    const mass = this.num('mass'); const force = this.num('force'); const mu = this.num('friction');
    const maxFriction = mu * mass * G;
    let friction = 0;
    if (Math.abs(this.v) > 0.005) friction = -Math.sign(this.v) * maxFriction;
    else if (Math.abs(force) <= maxFriction) friction = -force;
    else friction = -Math.sign(force) * maxFriction;
    const net = force + friction;
    return { friction, net, a: net / mass };
  }

  private integrate(dt: number): void {
    const beforeV = this.v; const { a } = this.dynamics();
    this.v += a * dt;
    if (beforeV !== 0 && Math.sign(beforeV) !== Math.sign(this.v) && Math.abs(this.num('force')) <= this.num('friction') * this.num('mass') * G) this.v = 0;
    this.x += this.v * dt; this.t += dt;
    if (Math.abs(this.x) > 9.5) { this.x = Math.sign(this.x) * 9.5; this.v = 0; this.stop(); }
  }

  private reset(): void {
    this.stop(); this.t = 0; this.x = 0; this.v = this.num('velocity'); this.samples = []; this.updateLabels(); this.render(); this.renderData();
    this.el<HTMLElement>('#mechanics-status').textContent = 'ГОТОВО';
  }

  private capture(): void {
    const { a } = this.dynamics(); this.samples.push({ id: this.samples.length + 1, t: this.t, x: this.x, v: this.v, a }); this.renderData();
  }

  private render(): void {
    const { friction, net, a } = this.dynamics();
    this.text('#mechanics-net', `${net.toFixed(2)} Н`); this.text('#mechanics-a', `${a.toFixed(2)} м/с²`); this.text('#mechanics-v', `${this.v.toFixed(2)} м/с`); this.text('#mechanics-x', `${this.x.toFixed(2)} м`); this.text('#mechanics-t', `${this.t.toFixed(2)} с`);
    this.draw(friction, net);
  }

  private draw(friction = this.dynamics().friction, net = this.dynamics().net): void {
    const canvas = this.el<HTMLCanvasElement>('#mechanics-canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
    const w = canvas.width, h = canvas.height; ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#0b0f13'; ctx.fillRect(0,0,w,h); ctx.strokeStyle='#23303a'; ctx.lineWidth=1;
    for(let x=0;x<w;x+=49){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    const trackY=355; ctx.fillStyle='#27323a';ctx.fillRect(45,trackY,890,12); ctx.fillStyle='#151c22';ctx.fillRect(45,trackY+12,890,38);
    for(let i=0;i<=18;i++){const px=45+i*49.4;ctx.fillStyle='#71808a';ctx.fillRect(px,trackY+15,1,12);ctx.fillStyle='#7c8a93';ctx.font='11px monospace';ctx.fillText(String(i-9),px-5,trackY+42);}
    const px=490+this.x*46; ctx.fillStyle='#42b6d8';ctx.fillRect(px-60,trackY-55,120,45);ctx.fillStyle='#a8c7d1';ctx.fillRect(px-45,trackY-66,90,14);
    ctx.fillStyle='#0a0d10';ctx.beginPath();ctx.arc(px-38,trackY-7,14,0,Math.PI*2);ctx.arc(px+38,trackY-7,14,0,Math.PI*2);ctx.fill();
    this.arrow(ctx,px,trackY-88,this.num('force')*8,'F'); this.arrow(ctx,px,trackY-118,friction*8,'Fтр'); this.arrow(ctx,px,trackY-148,net*8,'ΣF');
    ctx.fillStyle='#d7e0e5';ctx.font='13px system-ui';ctx.fillText(`m = ${this.num('mass').toFixed(1)} кг`,px-46,trackY-30);
  }

  private arrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, label: string): void {
    if (Math.abs(dx)<1) return; const end=x+dx; ctx.strokeStyle='#65d7ff';ctx.fillStyle='#65d7ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(end,y);ctx.stroke();
    const s=Math.sign(dx);ctx.beginPath();ctx.moveTo(end,y);ctx.lineTo(end-s*10,y-6);ctx.lineTo(end-s*10,y+6);ctx.closePath();ctx.fill();ctx.font='12px monospace';ctx.fillText(label,Math.min(x,end)+Math.abs(dx)/2-8,y-8);
  }

  private renderData(): void {
    const body=this.el<HTMLTableSectionElement>('#mechanics-table'); body.innerHTML=this.samples.length?this.samples.map(s=>`<tr><td>${s.id}</td><td>${s.t.toFixed(2)}</td><td>${s.x.toFixed(2)}</td><td>${s.v.toFixed(2)}</td><td>${s.a.toFixed(2)}</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Пока нет измерений.</td></tr>';
    const graph=this.el<HTMLElement>('#mechanics-graph'); const rows=this.samples; if(!rows.length){graph.innerHTML='<div class="mechanics-empty">Зафиксируйте несколько измерений во время опыта.</div>';return;}
    const W=620,H=220,p=36,maxT=Math.max(1,...rows.map(r=>r.t)),maxV=Math.max(1,...rows.map(r=>Math.abs(r.v)));const pts=rows.map(r=>`${p+r.t/maxT*(W-2*p)},${H/2-r.v/maxV*(H/2-p)}`).join(' ');
    graph.innerHTML=`<svg viewBox="0 0 ${W} ${H}"><line x1="${p}" y1="${H/2}" x2="${W-p}" y2="${H/2}" class="axis"/><line x1="${p}" y1="${p}" x2="${p}" y2="${H-p}" class="axis"/><polyline points="${pts}" class="plot-line"/>${rows.map(r=>`<circle cx="${p+r.t/maxT*(W-2*p)}" cy="${H/2-r.v/maxV*(H/2-p)}" r="4" class="plot-point"/>`).join('')}<text x="${W/2}" y="${H-5}" class="axis-title">t, c</text><text x="8" y="18" class="axis-title">v, м/с</text></svg>`;
  }

  private updateLabels(): void { const units: Record<string,string>={mass:'кг',force:'Н',friction:'',velocity:'м/с'}; for(const id of Object.keys(units)) this.text(`#mechanics-${id}-value`,`${this.num(id).toFixed(id==='friction'?2:1)}${units[id]?` ${units[id]}`:''}`); }
  private num(id: string): number { return Number(this.el<HTMLInputElement>(`#mechanics-${id}`).value); }
  private text(selector: string,value:string):void{this.el<HTMLElement>(selector).textContent=value;}
  private el<T extends Element>(selector:string):T{const node=this.workspace.querySelector<T>(selector);if(!node)throw new Error(`Mechanics element ${selector} was not found.`);return node;}
}
