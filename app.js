(() => {
  const $ = (s,root=document) => root.querySelector(s);
  const $$ = (s,root=document) => [...root.querySelectorAll(s)];
  const state = {U:6,R:3,mode:'observe',running:true,prediction:null,checked:false,lastT:performance.now(),phase:0};
  const els = {
    u:$('#uSlider'),r:$('#rSlider'),uVal:$('#uValue'),rVal:$('#rValue'),iVal:$('#iValue'),badge:$('#currentBadge'),digital:$('#digital'),needle:$('#needle'),
    interp:$('#interpretation'),battery:$('#batteryLabel'),resistor:$('#resistorLabel'),graph:$('#graphSvg'),panel:$('#lessonPanel'),charges:$('#charges'),path:$('#motionPath'),
    anim:$('#animToggle'),progress:$('#progressFill'),progressText:$('#progressText'),run:$('#runBtn'),legend:$('#legend'),over:$('#overrange'),sceneStatus:$('#sceneStatus'),toast:$('#toast')
  };
  const current = () => state.R > 0 ? state.U/state.R : 0;
  const clean = (n,d=1) => Number.isInteger(n) ? String(n) : n.toFixed(d).replace('.',',');
  const indexOf = m => ({observe:1,change:2,predict:3,explain:4})[m];
  function needleAngle(i){return -58 + (Math.max(0,Math.min(4,i))/4)*116}
  function toast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>els.toast.classList.remove('show'),1600)}

  function setMode(mode,{preserve=false}={}){
    state.mode=mode;
    if(mode==='predict' && !preserve){state.U=6;state.R=3;state.prediction=null;state.checked=false;els.u.value=6;els.r.value=3;}
    if(mode==='explain' && !preserve){state.U=6;state.R=6;els.u.value=6;els.r.value=6;}
    $$('.mode').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
    const idx=indexOf(mode);els.progressText.textContent=idx+' / 4';els.progress.style.width=((idx-1)/3*75)+'%';
    $$('.progress-step').forEach(s=>{const n=+s.dataset.step;s.classList.toggle('done',n<idx);s.classList.toggle('current',n===idx)});
    const locked=mode==='observe'||mode==='predict'||mode==='explain';els.u.disabled=locked;els.r.disabled=locked;
    update(false);renderLesson();
  }

  function graphPoint(u,r){return u/r}
  function renderGraph(){
    const w=640,h=285,pL=50,pR=22,pT=18,pB=42,gw=w-pL-pR,gh=h-pT-pB,maxY=4.2;
    const x=u=>pL+(u/12)*gw, y=i=>pT+gh-(Math.min(maxY,Math.max(0,i))/maxY)*gh;
    let s='';
    for(let i=0;i<=4;i++) s+=`<line x1="${pL}" y1="${y(i)}" x2="${w-pR}" y2="${y(i)}" stroke="#e5ebf3"/><text x="${pL-10}" y="${y(i)+4}" text-anchor="end" font-size="11" fill="#6b768d">${i}</text>`;
    for(let u=0;u<=12;u+=2) s+=`<line x1="${x(u)}" y1="${pT}" x2="${x(u)}" y2="${h-pB}" stroke="#edf1f6"/><text x="${x(u)}" y="${h-16}" text-anchor="middle" font-size="11" fill="#6b768d">${u}</text>`;
    s+=`<line x1="${pL}" y1="${h-pB}" x2="${w-pR}" y2="${h-pB}" stroke="#7b8798"/><line x1="${pL}" y1="${pT}" x2="${pL}" y2="${h-pB}" stroke="#7b8798"/>`;
    const pts=[];for(let u=0;u<=12;u+=.5)pts.push(`${x(u)},${y(graphPoint(u,state.R))}`);
    s+=`<polyline points="${pts.join(' ')}" fill="none" stroke="#1769ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    for(let u=0;u<=12;u+=2) s+=`<circle cx="${x(u)}" cy="${y(graphPoint(u,state.R))}" r="3.8" fill="#1769ff"/>`;
    const ci=current(), px=x(state.U),py=y(ci);
    s+=`<line x1="${px}" y1="${h-pB}" x2="${px}" y2="${py}" stroke="#8db4ff" stroke-dasharray="5 5"/><line x1="${pL}" y1="${py}" x2="${px}" y2="${py}" stroke="#8db4ff" stroke-dasharray="5 5"/><circle cx="${px}" cy="${py}" r="11" fill="rgba(23,105,255,.09)"/><circle cx="${px}" cy="${py}" r="6" fill="#fff" stroke="#1769ff" stroke-width="3"/>`;
    const boxX=Math.min(w-115,px+14),boxY=Math.max(18,py-48);s+=`<rect x="${boxX}" y="${boxY}" width="96" height="45" rx="9" fill="#fff" stroke="#a9c7ff"/><text x="${boxX+10}" y="${boxY+18}" font-size="11" fill="#1769ff" font-weight="700">U = ${clean(state.U)} В</text><text x="${boxX+10}" y="${boxY+35}" font-size="11" fill="#1769ff" font-weight="700">I = ${clean(ci,2)} А</text>`;
    s+=`<text x="${w/2}" y="${h-2}" text-anchor="middle" font-size="12" fill="#3b4962">Напряжение U, В</text><text transform="translate(15 ${h/2}) rotate(-90)" text-anchor="middle" font-size="12" fill="#3b4962">Сила тока I, А</text>`;
    const compare = state.mode==='explain' || (state.mode==='predict' && state.checked && state.prediction==='half');
    if(compare){
      const before=[];for(let u=0;u<=12;u+=.5)before.push(`${x(u)},${y(graphPoint(u,3))}`);
      const after=[];for(let u=0;u<=12;u+=.5)after.push(`${x(u)},${y(graphPoint(u,6))}`);
      s=s.replace(/<polyline points="[^"]+" fill="none" stroke="#1769ff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"\/>/, `<polyline points="${before.join(' ')}" fill="none" stroke="#1769ff" stroke-width="3"/><polyline points="${after.join(' ')}" fill="none" stroke="#15965a" stroke-width="3" stroke-dasharray="8 6"/>`);
      els.legend.textContent='R = 3 Ом · R = 6 Ом';
    } else {
      els.legend.textContent=`R = ${clean(state.R)} Ом`;
    }
    els.graph.innerHTML=s;
  }

  function predictionResult(){
    if(!state.checked)return'';
    if(state.prediction==='half') return `<div class="success"><strong>✓ Прогноз подтверждён.</strong><br>После удвоения сопротивления: U = 6 В, R = 6 Ом, I = 1 А.</div><button class="primary" id="goExplain">Перейти к выводу →</button>`;
    return `<div class="danger"><strong>Пока не сходится.</strong><br>Посмотри на I = U/R: если числитель не меняется, а знаменатель становится вдвое больше, что происходит с дробью?</div>`;
  }

  function renderLesson(){
    const i=current();
    if(state.mode==='observe') els.panel.innerHTML=`<div class="lesson-content"><div class="lesson-kicker"><span class="step-icon">1</span> Наблюдение</div><h2>Наблюдай за цепью</h2><p>Рассмотри источник, резистор и амперметр. На первом шаге параметры зафиксированы.</p><div class="callout"><strong>Что видно сейчас?</strong><br>Источник создаёт напряжение <b>6 В</b>.<br>Резистор имеет сопротивление <b>3 Ом</b>.<br>Амперметр показывает <b>2,00 А</b>.</div><button class="primary" id="nextChange">Перейти к эксперименту →</button></div>`;
    if(state.mode==='change') els.panel.innerHTML=`<div class="lesson-content"><div class="lesson-kicker"><span class="step-icon" style="background:var(--green-soft);color:var(--green)">2</span> Исследование</div><h2>Измени параметры</h2><p>Теперь ползунки активны. Меняй только одну величину за раз и наблюдай за амперметром и графиком.</p><div class="callout">↑ Увеличь <b>U</b> при неизменном <b>R</b>.</div><div class="callout green">↑ Увеличь <b>R</b> при неизменном <b>U</b>.</div><div class="callout"><strong>Текущее состояние:</strong> U = ${clean(state.U)} В · R = ${clean(state.R)} Ом · I = ${clean(i,2)} А.</div><button class="primary" id="nextPredict">Готов сделать прогноз →</button></div>`;
    if(state.mode==='predict') els.panel.innerHTML=`<div class="lesson-content"><div class="lesson-kicker" style="color:var(--purple)"><span class="step-icon" style="background:var(--purple-soft);color:var(--purple)">3</span> Прогноз</div><h2>Сначала предскажи результат</h2><p>Что произойдёт с силой тока, если сопротивление увеличить в 2 раза, а напряжение оставить неизменным?</p><div class="choices">${[['increase','Ток увеличится в 2 раза'],['half','Ток уменьшится в 2 раза'],['same','Ток не изменится'],['unknown','Недостаточно данных']].map(([v,t])=>`<label class="choice ${state.prediction===v?'selected':''}"><input type="radio" name="pred" value="${v}" ${state.prediction===v?'checked':''}><span>${t}</span></label>`).join('')}</div><button class="primary" id="checkPrediction" ${!state.prediction?'disabled':''}>Проверить экспериментом</button>${predictionResult()}</div>`;
    if(state.mode==='explain') els.panel.innerHTML=`<div class="lesson-content"><div class="lesson-kicker" style="color:var(--purple)"><span class="step-icon" style="background:var(--purple-soft);color:var(--purple)">4</span> Вывод</div><h2>Объясни результат</h2><div class="compare"><div class="compare-row"><strong>До изменения</strong><span>U = 6 В</span><span>R = 3 Ом</span><b style="color:var(--blue)">I = 2 А</b></div><div class="compare-arrow">↓</div><div class="compare-row after"><strong>После изменения</strong><span>U = 6 В</span><span>R = 6 Ом</span><b style="color:var(--green)">I = 1 А</b></div></div><div class="success"><strong>Вывод.</strong> При неизменном напряжении сила тока обратно пропорциональна сопротивлению. Если R увеличить в 2 раза, I уменьшится в 2 раза.</div><button class="primary secondary" id="restart">↻ Пройти эксперимент ещё раз</button></div>`;
    bindLesson();
  }

  function bindLesson(){
    const n1=$('#nextChange');if(n1)n1.onclick=()=>setMode('change');
    const n2=$('#nextPredict');if(n2)n2.onclick=()=>setMode('predict');
    $$('input[name="pred"]').forEach(r=>r.onchange=e=>{state.prediction=e.target.value;renderLesson()});
    const chk=$('#checkPrediction');if(chk)chk.onclick=()=>{state.checked=true;if(state.prediction==='half'){state.U=6;state.R=6;els.u.value=6;els.r.value=6;update(false);toast('Прогноз подтверждён экспериментом');}renderLesson()};
    const go=$('#goExplain');if(go)go.onclick=()=>setMode('explain');
    const restart=$('#restart');if(restart)restart.onclick=()=>{state.U=6;state.R=3;state.prediction=null;state.checked=false;els.u.value=6;els.r.value=3;setMode('observe')};
  }

  function update(renderPanel=true){
    const i=current();
    els.uVal.textContent=clean(state.U)+' В';els.rVal.textContent=clean(state.R)+' Ом';els.iVal.textContent='I = '+clean(i,2)+' А';
    els.badge.querySelector('span').textContent='I = '+clean(i,2)+' А';els.digital.textContent=i.toFixed(2)+' A';els.needle.setAttribute('transform',`rotate(${needleAngle(i)} 712 351)`);
    els.interp.innerHTML=`При <strong>U = ${clean(state.U)} В</strong> и <strong>R = ${clean(state.R)} Ом</strong> сила тока равна <strong>${clean(i,2)} А</strong>.`;
    els.battery.textContent=clean(state.U)+' В';els.resistor.textContent=clean(state.R)+' Ом';
    els.over.classList.toggle('show',i>4);els.badge.classList.toggle('over',i>4);els.sceneStatus.textContent=state.U===0?'Нет напряжения':(state.running?'Цепь замкнута':'Эксперимент на паузе');
    renderGraph();if(renderPanel)renderLesson();
  }

  const chargeNodes=[];
  for(let i=0;i<14;i++){const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('r','5.3');c.setAttribute('class','charge');els.charges.appendChild(c);chargeNodes.push(c)}
  const pathLength=els.path.getTotalLength();
  function animate(t){
    const dt=Math.min(40,t-state.lastT);state.lastT=t;const i=current();
    if(state.running&&els.anim.checked&&i>0)state.phase=(state.phase+dt*(0.000035+Math.min(i,6)*0.000045))%1;
    chargeNodes.forEach((c,k)=>{if(!els.anim.checked||i<=0){c.setAttribute('opacity','0');return}const p=els.path.getPointAtLength(((state.phase+k/chargeNodes.length)%1)*pathLength);c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('opacity',state.running?'.9':'.5')});
    requestAnimationFrame(animate);
  }

  els.u.addEventListener('input',e=>{state.U=+e.target.value;update()});els.r.addEventListener('input',e=>{state.R=+e.target.value;update()});
  $$('.mode').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.mode)));
  els.run.addEventListener('click',()=>{state.running=!state.running;els.run.textContent=state.running?'❚❚ Пауза эксперимента':'▶ Запустить эксперимент';update(false)});
  els.anim.addEventListener('change',()=>toast(els.anim.checked?'Анимация тока включена':'Анимация тока выключена'));
  setMode('observe',{preserve:true});requestAnimationFrame(animate);
})();