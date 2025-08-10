/* NeuroTouch app logic */
(function(){
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>document.querySelectorAll(s);
  const nowISO = ()=>new Date().toISOString();

  // Session store
  const store = {
    patient: '',
    tasksDone: 0,
    events: 0,
    start: Date.now(),
    settings: { size:2, contrast:true, vol:0.8 },
    logs: [] // {ts, task, type, data}
  };

  // Load settings
  try{
    const saved = JSON.parse(localStorage.getItem('neurotouch.settings')||'{}');
    if(saved.patient) store.patient = saved.patient;
    if(saved.settings) store.settings = {...store.settings, ...saved.settings};
  }catch(e){}

  // UI bindings
  const panels = $$('.panel'); const tabs = $$('.tab');
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    t.classList.add('active'); $('#'+t.dataset.tab).classList.add('active');
  }));

  // Home summary
  const updateSummary = ()=>{
    $('#pName').textContent = store.patient||'—';
    $('#sessTasks').textContent = store.tasksDone;
    $('#sessEvents').textContent = store.events;
    const durMin = ((Date.now()-store.start)/60000).toFixed(1);
    $('#sessDur').textContent = durMin + ' min';
  };
  setInterval(updateSummary, 1000); updateSummary();

  // Export CSV
  $('#btnExport').addEventListener('click', ()=>{
    const head = ['timestamp','paciente','task','type','data'];
    const rows = store.logs.map(l=>[l.ts, store.patient, l.task, l.type, JSON.stringify(l.data)]);
    const csv = [head.join(','), ...rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='neurotouch_sesion.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 2000);
  });
  $('#btnClear').addEventListener('click', ()=>{
    if(confirm('¿Borrar datos locales (ajustes y sesión)?')){
      localStorage.removeItem('neurotouch.settings');
      location.reload();
    }
  });

  // Settings
  const inName = $('#inName'); const size = $('#size'); const contrast = $('#contrast'); const vol = $('#vol');
  inName.value = store.patient; size.value = store.settings.size; contrast.checked = store.settings.contrast; vol.value = store.settings.vol;
  const saveSettings = ()=>{
    store.patient = inName.value.trim();
    store.settings.size = parseInt(size.value,10);
    store.settings.contrast = contrast.checked;
    store.settings.vol = parseFloat(vol.value);
    localStorage.setItem('neurotouch.settings', JSON.stringify({patient:store.patient, settings:store.settings}));
    applySettings();
    updateSummary();
  };
  [inName,size,contrast,vol].forEach(el=>el.addEventListener('input', saveSettings));
  const applySettings = ()=>{
    document.documentElement.style.setProperty('--target-scale', store.settings.size);
    document.body.classList.toggle('high-contrast', !!store.settings.contrast);
  };
  applySettings();

  // Audio
  const makeBeep = (hz=880, ms=80)=>{
    try{
      const ac = new (window.AudioContext||window.webkitAudioContext)();
      const o = ac.createOscillator(); const g = ac.createGain();
      o.frequency.value = hz; o.connect(g); g.connect(ac.destination);
      g.gain.value = store.settings.vol;
      o.start();
      setTimeout(()=>{o.stop(); ac.close()}, ms);
    }catch(e){ /* ignore */ }
  };

  // Simple big button
  const bigBtn = $('#bigBtn');
  let holdTimer=null, holding=false;
  bigBtn.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    bigBtn.classList.add('active');
    holding=true;
    holdTimer=setTimeout(()=>{
      if(holding){ store.events++; store.logs.push({ts:nowISO(), task:'simple', type:'hold', data:{ms:500}}); }
    }, 500);
    store.events++; store.logs.push({ts:nowISO(), task:'simple', type:'tap-down', data:{}});
    makeBeep(660,80);
  }, {passive:false});
  const endSimple=(ev)=>{
    ev.preventDefault();
    if(holdTimer){ clearTimeout(holdTimer); holdTimer=null; }
    if(holding){ $('#simpleTaps').textContent = String(parseInt($('#simpleTaps').textContent||'0')+1); }
    holding=false; bigBtn.classList.remove('active');
    store.logs.push({ts:nowISO(), task:'simple', type:'tap-up', data:{}});
  };
  bigBtn.addEventListener('touchend', endSimple, {passive:false});
  bigBtn.addEventListener('touchcancel', endSimple, {passive:false});
  bigBtn.addEventListener('click', (e)=>{ e.preventDefault(); makeBeep(660,80); });

  // Tapping 30s alterno
  const left = $('.target.left'), right = $('.target.right');
  const tapStart = $('#tapStart'), tapStop = $('#tapStop'), tapReset = $('#tapReset');
  const tapHits = $('#tapHits'), tapErr = $('#tapErr'), tapExpected = $('#tapExpected'), tapTime = $('#tapTime');
  let tapTimer=null, tapDeadline=0, expected='L', running=false;
  const setExpected=(e)=>{ expected=e; tapExpected.textContent = e; };
  const stopTapping=()=>{ running=false; clearInterval(tapTimer); tapTimer=null; tapStop.disabled=true; tapStart.disabled=false; store.tasksDone++; };
  const startTapping=()=>{
    tapHits.textContent='0'; tapErr.textContent='0'; setExpected('L'); tapTime.textContent='30.0';
    running=true; tapStart.disabled=true; tapStop.disabled=false;
    tapDeadline = Date.now()+30000;
    tapTimer=setInterval(()=>{
      const remain = Math.max(0, tapDeadline-Date.now());
      tapTime.textContent = (remain/1000).toFixed(1);
      if(remain<=0){ stopTapping(); }
    }, 100);
  };
  const doTap=(side)=>{
    if(!running) return;
    store.events++; store.logs.push({ts:nowISO(), task:'tapping', type:'tap', data:{side}});
    if(side===expected){ tapHits.textContent = String(parseInt(tapHits.textContent)+1); setExpected(expected==='L'?'R':'L'); makeBeep(800,50); }
    else { tapErr.textContent = String(parseInt(tapErr.textContent)+1); makeBeep(200,60); }
  };
  left.addEventListener('touchstart', e=>{e.preventDefault(); left.classList.add('active'); doTap('L'); }, {passive:false});
  left.addEventListener('touchend', e=>{e.preventDefault(); left.classList.remove('active'); }, {passive:false});
  right.addEventListener('touchstart', e=>{e.preventDefault(); right.classList.add('active'); doTap('R'); }, {passive:false});
  right.addEventListener('touchend', e=>{e.preventDefault(); right.classList.remove('active'); }, {passive:false});
  tapStart.addEventListener('click', startTapping);
  tapStop.addEventListener('click', stopTapping);
  tapReset.addEventListener('click', ()=>{ tapHits.textContent='0'; tapErr.textContent='0'; setExpected('L'); tapTime.textContent='30.0'; });

  // Reaction Time
  const rtArena = $('#rtArena'), rtCue = $('#rtCue');
  const rtGo = $('#rtGo'), rtReset = $('#rtReset');
  const rtLast = $('#rtLast'), rtAvg = $('#rtAvg'), rtN = $('#rtN');
  let rtState='idle', rtStart=0, rtTimes=[]; let rtTO=null;
  const scheduleCue=()=>{
    rtCue.textContent='ESPERE…'; rtArena.style.background='transparent'; rtState='waiting';
    const delay = 800 + Math.random()*1800;
    rtTO=setTimeout(()=>{
      rtCue.textContent='¡TOQUE!'; rtArena.style.background='#2b7a0b33'; rtState='go'; rtStart = performance.now();
      makeBeep(880,80);
    }, delay);
  };
  rtArena.addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(rtState==='waiting'){ // too soon
      clearTimeout(rtTO); rtState='idle'; rtCue.textContent='Muy pronto. Reinicie.'; makeBeep(220,120);
      store.logs.push({ts:nowISO(), task:'rt', type:'false-start', data:{}});
    } else if(rtState==='go'){
      const rt = Math.round(performance.now()-rtStart);
      rtTimes.push(rt);
      rtLast.textContent=rt;
      rtN.textContent=rtTimes.length;
      const avg = Math.round(rtTimes.reduce((a,b)=>a+b,0)/rtTimes.length);
      rtAvg.textContent = avg;
      store.events++; store.logs.push({ts:nowISO(), task:'rt', type:'hit', data:{rt}});
      rtState='idle'; rtCue.textContent='PREPÁRESE…'; rtArena.style.background='transparent';
    }
  }, {passive:false});
  rtGo.addEventListener('click', ()=>{ if(rtTO) clearTimeout(rtTO); scheduleCue(); });
  rtReset.addEventListener('click', ()=>{ rtTimes=[]; rtLast.textContent='—'; rtAvg.textContent='—'; rtN.textContent='0'; rtCue.textContent='PREPÁRESE…'; rtState='idle'; });

  // Metronome
  const bpm = $('#bpm'), bpmVal = $('#bpmVal'); const mStart = $('#mStart'), mStop = $('#mStop'); const flash = $('#flash');
  let mTimer=null;
  bpm.addEventListener('input', ()=>bpmVal.textContent=bpm.value);
  mStart.addEventListener('click', ()=>{
    const period = 60000/parseInt(bpm.value,10);
    mStart.disabled=true; mStop.disabled=false;
    mTimer=setInterval(()=>{
      flash.style.background = '#2a5bd7'; setTimeout(()=>flash.style.background='transparent', 80);
      makeBeep(880,60);
      store.logs.push({ts:nowISO(), task:'metronome', type:'tick', data:{bpm:parseInt(bpm.value,10)}});
    }, period);
  });
  mStop.addEventListener('click', ()=>{ clearInterval(mTimer); mTimer=null; mStart.disabled=false; mStop.disabled=true; store.tasksDone++; });

  // Dual task (Stroop-like)
  const COLORS = [
    {name:'ROJO', css:'#e74c3c'},{name:'VERDE', css:'#2ecc71'},{name:'AZUL', css:'#3498db'},{name:'AMARILLO', css:'#f1c40f'}
  ];
  const duoStim = $('#duoStim'); const ruleSel = $('#ruleSel'); const stimInterval = $('#stimInterval'); const dualDur = $('#dualDur');
  const duoStart = $('#duoStart'); const duoStop = $('#duoStop'); const duoReset = $('#duoReset');
  const duoHits = $('#duoHits'); const duoFP = $('#duoFP'); const duoMiss = $('#duoMiss'); const duoTime = $('#duoTime');
  let duoTimer=null, duoDeadline=0, curStim=null, awaitingResponse=false, duoTouch=false;

  const newStim = ()=>{
    const color = COLORS[Math.floor(Math.random()*COLORS.length)];
    const text = COLORS[Math.floor(Math.random()*COLORS.length)].name;
    curStim = {color, text, ts:performance.now()};
    duoStim.textContent = text;
    duoStim.style.color = color.css;
    awaitingResponse=true; duoTouch=false;
  };
  const ruleOK = ()=>{
    const rule = ruleSel.value;
    if(rule==='congruente') return curStim.color.name===curStim.text;
    if(rule==='incongruente') return curStim.color.name!==curStim.text;
    if(rule==='rojo') return curStim.color.name==='ROJO';
    return false;
  };
  const startDual = ()=>{
    duoHits.textContent='0'; duoFP.textContent='0'; duoMiss.textContent='0'; duoTime.textContent=dualDur.value;
    duoStart.disabled=true; duoStop.disabled=false;
    const iv = Math.max(400, parseInt(stimInterval.value,10));
    duoDeadline = Date.now()+parseInt(dualDur.value,10)*1000;
    const loop = ()=>{
      const remain = Math.max(0, duoDeadline-Date.now());
      duoTime.textContent = Math.ceil(remain/1000);
      if(remain<=0){ stopDual(); return; }
      newStim();
    };
    duoTimer = setInterval(loop, iv);
    loop();
  };
  const stopDual = ()=>{
    clearInterval(duoTimer); duoTimer=null; duoStart.disabled=false; duoStop.disabled=true; store.tasksDone++;
  };
  $('#duoArena').addEventListener('touchstart', (e)=>{
    e.preventDefault();
    if(!curStim) return;
    if(awaitingResponse){
      if(ruleOK()){ duoHits.textContent = String(parseInt(duoHits.textContent)+1); makeBeep(880,60); }
      else { duoFP.textContent = String(parseInt(duoFP.textContent)+1); makeBeep(220,100); }
      store.events++; store.logs.push({ts:nowISO(), task:'dual', type:'tap', data:{ok:ruleOK(), stim:curStim}});
      awaitingResponse=false; duoTouch=true;
    }
  }, {passive:false});
  // Count omissions when interval passes without touch
  setInterval(()=>{
    if(awaitingResponse && duoTimer){ duoMiss.textContent = String(parseInt(duoMiss.textContent)+1); awaitingResponse=false; }
  }, 1000);

  duoStart.addEventListener('click', startDual);
  duoStop.addEventListener('click', stopDual);
  duoReset.addEventListener('click', ()=>{ duoHits.textContent='0'; duoFP.textContent='0'; duoMiss.textContent='0'; duoTime.textContent=dualDur.value; });

  // PWA install
  let deferredPrompt=null; const installBtn=$('#installBtn'); installBtn.style.display='none';
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); deferredPrompt=e; installBtn.style.display='inline-flex'; });
  installBtn.addEventListener('click', async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt(); const {outcome} = await deferredPrompt.userChoice;
    if(outcome==='accepted'){ installBtn.textContent='Instalada'; installBtn.disabled=true; }
    deferredPrompt=null;
  });

  // Service worker
  if('serviceWorker' in navigator){ window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(console.warn); }); }
})();