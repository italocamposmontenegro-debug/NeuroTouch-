// --- NeuroTouch Touch/Pointer HOTFIX ---
// Unifica entradas: pointer, touch y click.
// Usa pointer events cuando están disponibles y añade fallback a touch/click.
(function(){
  const on = (el, ev, fn, opts)=> el && el.addEventListener(ev, fn, opts||false);
  const active = 'onpointerdown' in window ? 'pointerdown' : ('ontouchstart' in window ? 'touchstart' : 'mousedown');
  const inactive = 'onpointerup' in window ? 'pointerup' : ('ontouchend' in window ? 'touchend' : 'mouseup');

  // BIG BUTTON
  (function(){
    const btn = document.getElementById('bigBtn');
    if(!btn) return;
    let holdT=null, down=false;
    const downFn=(e)=>{ e.preventDefault(); down=true; btn.classList.add('active'); clearTimeout(holdT);
      holdT=setTimeout(()=>{ if(down) document.dispatchEvent(new CustomEvent('nt:log',{detail:{task:'simple',type:'hold',data:{ms:500}}}))},500);
      document.dispatchEvent(new CustomEvent('nt:beep',{detail:{hz:660,ms:80}}));
    };
    const upFn=(e)=>{ e.preventDefault(); clearTimeout(holdT); if(down){
        document.dispatchEvent(new CustomEvent('nt:log',{detail:{task:'simple',type:'tap',data:{}}}));
      }
      down=false; btn.classList.remove('active');
    };
    on(btn, active, downFn, {passive:false});
    on(btn, inactive, upFn, {passive:false});
    on(btn, 'click', (e)=>{ e.preventDefault(); document.dispatchEvent(new CustomEvent('nt:beep',{detail:{hz:660,ms:80}})); });
  })();

  // TAPPING TARGETS
  (function(){
    const L = document.querySelector('.target.left'), R = document.querySelector('.target.right');
    const tap = (side)=> document.dispatchEvent(new CustomEvent('nt:tapping',{detail:{side}}));
    [L,R].forEach((el, i)=>{
      if(!el) return;
      const side = i===0 ? 'L' : 'R';
      on(el, active, (e)=>{ e.preventDefault(); tap(side); }, {passive:false});
      on(el, 'click', (e)=>{ e.preventDefault(); tap(side); });
    });
  })();

  // RT ARENA
  (function(){
    const arena = document.getElementById('rtArena');
    if(!arena) return;
    const tap=()=> document.dispatchEvent(new CustomEvent('nt:rtTap'));
    on(arena, active, (e)=>{ e.preventDefault(); tap(); }, {passive:false});
    on(arena, 'click', (e)=>{ e.preventDefault(); tap(); });
  })();

  // DUAL TASK ARENA
  (function(){
    const arena = document.getElementById('duoArena');
    if(!arena) return;
    const tap=()=> document.dispatchEvent(new CustomEvent('nt:duoTap'));
    on(arena, active, (e)=>{ e.preventDefault(); tap(); }, {passive:false});
    on(arena, 'click', (e)=>{ e.preventDefault(); tap(); });
  })();
})();