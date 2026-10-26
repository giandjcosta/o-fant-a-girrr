/* Spogliatoio — Lazy loading compatibile con lo scope privato di index.html.
 * Includere PRIMA dello script principale; dentro la sua IIFE, appena prima di
 * byHash();render();, usare:
 * render = window.spgLazyWrap(render, function () {
 *   return {tab:tab,team:team,data:D,filter:filter,role:role,sortBy:sortBy,
 *     open:open,mkV:typeof mkV==='undefined'?'':mkV,
 *     mkT:typeof mkT==='undefined'?'':mkT,
 *     calComp:typeof calComp==='undefined'?'':calComp,
 *     calIdx:typeof calIdx==='undefined'?'':calIdx,
 *     authed:authed(),setTab:function(t){tab=t}};
 * });
 * Non modifica window.D e non espone codici squadra o dati privati.
 */
(function () {
  'use strict';
  var HEAVY = {swap:1,mkt:1,fa:1,pitch:1,bor:1,lega:1,stat:1};
  var LABELS = {swap:'Chi scambiare',mkt:'Mercato Scambi',fa:'Svincolati',
    pitch:'Sostituzioni',bor:'Borsino',lega:'Calendario',stat:'Statistiche'};
  function skeleton(label) {
    return '<div class="card" role="status" aria-live="polite" style="padding:28px;text-align:center">' +
      '<div class="meta" style="margin-bottom:8px">Carico ' + label + '…</div>' +
      '<div style="height:8px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden">' +
      '<div style="height:100%;width:40%;background:linear-gradient(90deg,transparent,#ffd166,transparent);animation:spglazy 1s linear infinite"></div>' +
      '</div></div>';
  }
  window.spgLazyWrap = function (original, readState) {
    if (typeof original !== 'function' || typeof readState !== 'function') return original;
    var pending = 0, lastSig = null, lastData = null;
    if (!document.getElementById('spg-lazy-css')) {
      var style = document.createElement('style');
      style.id = 'spg-lazy-css';
      style.textContent = '@keyframes spglazy{from{transform:translateX(-100%)}to{transform:translateX(250%)}}' +
        '@media(prefers-reduced-motion:reduce){[role=status] div{animation:none!important}}';
      document.head.appendChild(style);
    }
    return function () {
      var id = ++pending; // ogni nuovo render, anche leggero o logout, annulla i precedenti
      var state = readState();
      if (!state || !state.authed) {
        lastSig = null;
        return original.apply(this, arguments);
      }
      if (state.data !== lastData) {
        lastData = state.data;
        lastSig = null;
      }
      if (state.tab === 'stat' && state.team !== 'Oranje VC') {
        if (typeof state.setTab === 'function') state.setTab('rosa');
        state = readState();
      }
      var signature = [state.tab,state.team,state.data && state.data.updated,
        state.filter,state.role,state.sortBy,state.open,state.mkV,state.mkT,
        state.calComp,state.calIdx].map(function (v) {return String(v == null ? '' : v)}).join('|');
      var target = document.getElementById('app');
      if (!HEAVY[state.tab] || !target || signature === lastSig) {
        lastSig = signature;
        return original.apply(this, arguments);
      }
      var buttons = document.querySelectorAll('#tabs button');
      [].forEach.call(buttons,function(b){
        b.setAttribute('aria-selected',String(b.dataset.t === state.tab));
        if(b.dataset.t === 'stat') b.hidden = state.team !== 'Oranje VC';
      });
      target.innerHTML = skeleton(LABELS[state.tab] || state.tab);
      var context = this, args = arguments;
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (id !== pending) return;
          lastSig = signature;
          original.apply(context,args);
        });
      });
    };
  };
})();
