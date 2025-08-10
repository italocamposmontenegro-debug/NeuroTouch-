(function(){
  'use strict';
  const $ = (s)=>document.querySelector(s);
  const $$ = (s)=>document.querySelectorAll(s);
  const nowISO = ()=>new Date().toISOString();

  // ---------- Tabs ----------
  const panels = $$('.panel'); const tabs = $$('.tab');
  tabs.forEach(t=>t.addEventListener('click',()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    t.classList.add('active'); $('#'+t.dataset.tab).classList.add('active');
  }));

  // ---------- Storage ----------
  const store = {patient:'', tasksDone:0, events:0, start:Date.now(), settings:{size:2,contrast:true,vol:0.8}, logs:[]};
  try{ const s=JSON.parse(localStorage.getItem('neurotouch.settings')||'{}'); if(s.patient) store.patient=s.patient; if(s.settings) store.settings={...store.settings,...s.settings}; }catch(e){}

  // ---------- Summary ----------
  const updateSummary=()=>{
    $('#pName').textContent = store.patient||'—';
    $('#sessTasks').textContent = store.tasksDone;
    $('#sessEvents').textContent = store.events;
    $('#sessDur').textContent = ((Date.now()-store.start)/60000).toFixed(1)+' min';
  };
  setInterval(updateSummary, 1000); updateSummary();

  // ---------- Export Session ----------
  $('#btnExport').addEventListener('click', ()=>{
    const head=['timestamp','paciente','task','type','data'];
    const rows=store.logs.map(l=>[l.ts, store.patient, l.task, l.type, JSON.stringify(l.data)]);
    const csv=[head.join(','),...rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='neurotouch_sesion.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  });
  $('#btnClear').addEventListener('click', ()=>{ if(confirm('¿Borrar datos locales (ajustes y sesión)?')){ localStorage.removeItem('neurotouch.settings'); location.reload(); } });

  // ---------- Settings ----------
  const inName=$('#inName'), size=$('#size'), contrast=$('#contrast'), vol=$('#vol');
  inName.value=store.patient; size.value=store.settings.size; contrast.checked=store.settings.contrast; vol.value=store.settings.vol;
  const save=()=>{ store.patient=inName.value.trim(); store.settings.size=parseInt(size.value,10); store.settings.contrast=contrast.checked; store.settings.vol=parseFloat(vol.value); localStorage.setItem('neurotouch.settings', JSON.stringify({patient:store.patient,settings:store.settings})); };
  [inName,size,contrast,vol].forEach(el=>el.addEventListener('input', save));

  // ---------- Audio (user gesture) ----------
  const beep=(hz=880,ms=80)=>{ try{ const ac=new (window.AudioContext||window.webkitAudioContext)(); const o=ac.createOscillator(); const g=ac.createGain(); o.frequency.value=hz; o.connect(g); g.connect(ac.destination); g.gain.value=store.settings.vol; o.start(); setTimeout(()=>{o.stop(); ac.close()}, ms);}catch(e){} };

  // ---------- Pointer helper ----------
  const startEv = 'onpointerdown' in window ? 'pointerdown' : ('ontouchstart' in window ? 'touchstart' : 'mousedown');
  const endEv   = 'onpointerup' in window   ? 'pointerup'   : ('ontouchend'   in window ? 'touchend'   : 'mouseup');
  const bindTap = (el, onDown, onUp)=>{
    if(!el) return;
    el.addEventListener(startEv, (e)=>{ e.preventDefault(); onDown && onDown(e); }, {passive:false});
    if(onUp){
      el.addEventListener(endEv, (e)=>{ e.preventDefault(); onUp(e); }, {passive:false});
    }
    // Fallback click (por si algún navegador bloquea pointer/touch)
    el.addEventListener('click', (e)=>{ e.preventDefault(); if(onUp && onDown){ onDown(e); setTimeout(()=>onUp(e), 0); } else if(onDown){ onDown(e); } }, false);
  };

  // ---------- Simple ----------
  const bigBtn=$('#bigBtn'); let holdTimer=null, holding=false;
  bindTap(bigBtn, ()=>{
    holding=true; bigBtn.classList.add('active'); holdTimer=setTimeout(()=>{
      if(holding){ store.events++; store.logs.push({ts:nowISO(), task:'simple', type:'hold', data:{ms:500}}); $('#simpleHolds').textContent = String(parseInt($('#simpleHolds').textContent||'0')+1); }
    }, 500);
    beep(660,80);
  }, ()=>{
    if(holdTimer){clearTimeout(holdTimer); holdTimer=null;}
    if(holding){ $('#simpleTaps').textContent = String(parseInt($('#simpleTaps').textContent||'0')+1); }
    holding=false; bigBtn.classList.remove('active');
    store.logs.push({ts:nowISO(), task:'simple', type:'tap', data:{}});
  });

  // ---------- Tapping 30s ----------
  const left=$('.target.left'), right=$('.target.right');
  const tapStart=$('#tapStart'), tapStop=$('#tapStop'), tapReset=$('#tapReset');
  const tapHits=$('#tapHits'), tapErr=$('#tapErr'), tapExpected=$('#tapExpected'), tapTime=$('#tapTime');
  let tapTimer=null, deadline=0, expected='L', running=false;
  const setExp=e=>{ expected=e; tapExpected.textContent=e; };
  const stopTap=()=>{running=false; clearInterval(tapTimer); tapTimer=null; tapStop.disabled=true; tapStart.disabled=false; store.tasksDone++;};
  const startTap=()=>{
    tapHits.textContent='0'; tapErr.textContent='0'; tapTime.textContent='30.0'; setExp('L');
    running=true; tapStart.disabled=true; tapStop.disabled=false;
    deadline=Date.now()+30000;
    tapTimer=setInterval(()=>{
      const remain=Math.max(0,deadline-Date.now());
      tapTime.textContent=(remain/1000).toFixed(1);
      if(remain<=0) stopTap();
    }, 100);
  };
  const doTap=(side)=>{
    if(!running) return;
    store.events++; store.logs.push({ts:nowISO(), task:'tapping', type:'tap', data:{side}});
    if(side===expected){
      tapHits.textContent = String(parseInt(tapHits.textContent)+1);
      setExp(expected==='L'?'R':'L');
      beep(800,50);
    } else {
      tapErr.textContent = String(parseInt(tapErr.textContent)+1);
      beep(220,60);
    }
  };
  bindTap(left, ()=>doTap('L'));
  bindTap(right, ()=>doTap('R'));
  tapStart.addEventListener('click', startTap);
  tapStop.addEventListener('click', stopTap);
  tapReset.addEventListener('click', ()=>{ tapHits.textContent='0'; tapErr.textContent='0'; setExp('L'); tapTime.textContent='30.0'; });

  // ---------- Reaction Time ----------
  const rtArena=$('#rtArena'), rtCue=$('#rtCue'), rtGo=$('#rtGo'), rtReset=$('#rtReset');
  const rtLast=$('#rtLast'), rtAvg=$('#rtAvg'), rtN=$('#rtN');
  let rtState='idle', rtStart=0, rtTimes=[]; let rtTO=null;
  const schedule=()=>{
    rtCue.textContent='ESPERE…'; rtArena.style.background='transparent'; rtState='waiting';
    const delay=800+Math.random()*1800;
    rtTO=setTimeout(()=>{
      rtCue.textContent='¡TOQUE!'; rtArena.style.background='#2b7a0b33'; rtState='go'; rtStart=performance.now(); beep(880,80);
    }, delay);
  };
  bindTap(rtArena, ()=>{
    if(rtState==='waiting'){ clearTimeout(rtTO); rtState='idle'; rtCue.textContent='Muy pronto. Reinicie.'; beep(220,120); }
    else if(rtState==='go'){
      const rt=Math.round(performance.now()-rtStart);
      rtTimes.push(rt); rtLast.textContent=rt; rtN.textContent=rtTimes.length;
      rtAvg.textContent=Math.round(rtTimes.reduce((a,b)=>a+b,0)/rtTimes.length);
      store.events++; store.logs.push({ts:nowISO(), task:'rt', type:'hit', data:{rt}});
      rtState='idle'; rtCue.textContent='PREPÁRESE…'; rtArena.style.background='transparent';
    }
  });
  rtGo.addEventListener('click', ()=>{ if(rtTO) clearTimeout(rtTO); schedule(); });
  rtReset.addEventListener('click', ()=>{ rtTimes=[]; rtLast.textContent='—'; rtAvg.textContent='—'; rtN.textContent='0'; rtState='idle'; rtCue.textContent='PREPÁRESE…'; });

  // ---------- Metronome ----------
  const bpm=$('#bpm'), bpmVal=$('#bpmVal');
  const mStart=$('#mStart'), mStop=$('#mStop'); const flash=$('#flash'); let mTimer=null;
  bpm.addEventListener('input', ()=>bpmVal.textContent=bpm.value);
  mStart.addEventListener('click', ()=>{
    const period=60000/parseInt(bpm.value,10);
    mStart.disabled=true; mStop.disabled=false;
    mTimer=setInterval(()=>{
      flash.style.background='#2a5bd7'; setTimeout(()=>flash.style.background='transparent',80);
      beep(880,60);
      store.logs.push({ts:nowISO(), task:'metronome', type:'tick', data:{bpm:parseInt(bpm.value,10)}});
    }, period);
  });
  mStop.addEventListener('click', ()=>{ clearInterval(mTimer); mTimer=null; mStart.disabled=false; mStop.disabled=true; store.tasksDone++; });

  // ---------- Dual Task ----------
  const COLORS=[{name:'ROJO',css:'#e74c3c'},{name:'VERDE',css:'#2ecc71'},{name:'AZUL',css:'#3498db'},{name:'AMARILLO',css:'#f1c40f'}];
  const duoStim=$('#duoStim'), ruleSel=$('#ruleSel'), stimInterval=$('#stimInterval'), dualDur=$('#dualDur');
  const duoStart=$('#duoStart'), duoStop=$('#duoStop'), duoReset=$('#duoReset');
  const duoHits=$('#duoHits'), duoFP=$('#duoFP'), duoMiss=$('#duoMiss'), duoTime=$('#duoTime');
  let duoTimer=null, duoDeadline=0, curStim=null, awaiting=false;
  const newStim=()=>{ const color=COLORS[Math.floor(Math.random()*COLORS.length)], text=COLORS[Math.floor(Math.random()*COLORS.length)].name; curStim={color,text,ts:performance.now()}; duoStim.textContent=text; duoStim.style.color=color.css; awaiting=true; };
  const ruleOK=()=>{ const r=ruleSel.value; if(r==='congruente') return curStim.color.name===curStim.text; if(r==='incongruente') return curStim.color.name!==curStim.text; if(r==='rojo') return curStim.color.name==='ROJO'; return false; };
  const startDual=()=>{
    duoHits.textContent='0'; duoFP.textContent='0'; duoMiss.textContent='0'; duoTime.textContent=dualDur.value;
    duoStart.disabled=true; duoStop.disabled=false;
    const iv=Math.max(400,parseInt(stimInterval.value,10));
    duoDeadline=Date.now()+parseInt(dualDur.value,10)*1000;
    const loop=()=>{
      const remain=Math.max(0, duoDeadline-Date.now());
      duoTime.textContent=Math.ceil(remain/1000);
      if(remain<=0){ stopDual(); return; }
      newStim();
    };
    duoTimer=setInterval(loop, iv);
    loop();
  };
  const stopDual=()=>{ clearInterval(duoTimer); duoTimer=null; duoStart.disabled=false; duoStop.disabled=true; store.tasksDone++; };
  bindTap($('#duoArena'), ()=>{
    if(!curStim) return;
    if(awaiting){
      if(ruleOK()){ duoHits.textContent=String(parseInt(duoHits.textContent)+1); beep(880,60); }
      else { duoFP.textContent=String(parseInt(duoFP.textContent)+1); beep(220,100); }
      store.events++; store.logs.push({ts:nowISO(), task:'dual', type:'tap', data:{ok:ruleOK(), stim:curStim}});
      awaiting=false;
    }
  });
  setInterval(()=>{ if(awaiting && duoTimer){ duoMiss.textContent = String(parseInt(duoMiss.textContent)+1); awaiting=false; } }, 1000);
  duoStart.addEventListener('click', startDual);
  duoStop.addEventListener('click', stopDual);
  duoReset.addEventListener('click', ()=>{ duoHits.textContent='0'; duoFP.textContent='0'; duoMiss.textContent='0'; duoTime.textContent=dualDur.value; });

  // ---------- Sensors ----------
  const reqPerm=$('#reqPerm'), sStart=$('#sStart'), sStop=$('#sStop'), sExport=$('#sExport');
  const sN=$('#sN'), sRMS=$('#sRMS'), sPeak=$('#sPeak'), sFps=$('#sFps'); const canvas=$('#sPlot'), ctx=canvas.getContext('2d');
  let running=false, data=[], lastT=0, peak=0;
  const draw=()=>{
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='#3566e4'; ctx.lineWidth=2; ctx.beginPath();
    const N=data.length; if(N<2) return;
    const maxX=200; const arr=data.slice(Math.max(0,N-maxX));
    const maxMag=Math.max(1, Math.max(...arr.map(d=>d.mag)));
    arr.forEach((d,i)=>{ const x=(i/(arr.length-1||1))*canvas.width; const y=canvas.height - (d.mag/maxMag)*canvas.height; if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y); });
    ctx.stroke();
  };
  const rms=(arr)=>{ if(arr.length===0) return 0; const m=arr.reduce((a,b)=>a+b*b,0)/arr.length; return Math.sqrt(m); };
  const onMotion=(e)=>{
    if(!running) return;
    const t=performance.now(); const dt=(t-lastT)/1000||0; lastT=t;
    const a=e.accelerationIncludingGravity||e.acceleration; if(!a) return;
    const ax=a.x||0, ay=a.y||0, az=a.z||0;
    const mag=Math.sqrt(ax*ax+ay*ay+az*az);
    data.push({t,ax,ay,az,mag}); if(mag>peak) peak=mag;
    if(data.length%5===0){
      sN.textContent=data.length; sPeak.textContent=peak.toFixed(2);
      const last100=data.slice(-100).map(d=>d.mag);
      sRMS.textContent=rms(last100).toFixed(2);
      sFps.textContent=(1/((dt||0.02))).toFixed(0);
      draw();
    }
  };
  reqPerm.addEventListener('click', async ()=>{
    try{
      if(typeof DeviceMotionEvent!=='undefined' && typeof DeviceMotionEvent.requestPermission==='function'){
        const res=await DeviceMotionEvent.requestPermission();
        alert(res==='granted'?'Permiso otorgado':'Permiso denegado');
      } else {
        alert('Este dispositivo no requiere solicitud manual.');
      }
    }catch(e){ alert('Error al solicitar permiso: '+e); }
  });
  sStart.addEventListener('click', ()=>{ data=[]; peak=0; running=true; sStart.disabled=true; sStop.disabled=false; window.addEventListener('devicemotion', onMotion, {passive:true}); });
  sStop.addEventListener('click', ()=>{ running=false; sStart.disabled=false; sStop.disabled=true; window.removeEventListener('devicemotion', onMotion); store.logs.push({ts:nowISO(), task:'sensors', type:'summary', data:{n:data.length, peak, rms:sRMS.textContent}}); store.tasksDone++; });
  sExport.addEventListener('click', ()=>{
    const head=['t_ms','ax','ay','az','mag'];
    if(!data.length){ alert('No hay datos'); return; }
    const t0=data[0].t;
    const rows=data.map(d=>[(d.t-t0).toFixed(1), d.ax.toFixed(3), d.ay.toFixed(3), d.az.toFixed(3), d.mag.toFixed(3)]);
    const csv=[head.join(','),...rows.map(r=>r.join(','))].join('\n');
    const blob=new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download='neurotouch_sensores.csv'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
  });

  // ---------- PWA: toggle offline ----------
  const installBtn = $('#installBtn');
  let swActive = false;
  const registerSW = async ()=>{
    if(!('serviceWorker' in navigator)) { alert('SW no soportado'); return; }
    try{
      await navigator.serviceWorker.register('./sw.js');
      swActive = true; installBtn.textContent = 'Offline habilitado ✓';
    }catch(e){
      alert('No se pudo activar offline: '+e);
    }
  };
  installBtn.addEventListener('click', registerSW);
})();