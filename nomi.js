/* O Girrr · Nomi mostrati delle squadre (Claude, 9 novembre 2026, decisione di Gianluca).
   Va nella radice del sito (/o-fant-a-girrr/nomi.js), incluso il prima possibile in ogni pagina.
   La squadra di Leanzino e Mario si chiama «The Blues Brothers» (correzione ufficiale accettata dalla Lega). La chiave interna
   resta «The Blue brothers» (codici di accesso, database, data.json): qui cambia solo quello che si legge.
   - testi della pagina e attributi visibili (alt, title, aria-label, placeholder), anche quelli che arrivano dopo;
   - immagini disegnate nel telefono (Condividi, Curva), perché si corregge il testo scritto sul canvas;
   - testo dei messaggi condivisi.
   Non tocca i valori dei menu (<option value>), i campi in cui si scrive, né i dati: le chiavi restano quelle di prima.
   Stessa tabella in scripts/pdf_settimana.py (PDF e immagini del Tabellone) e scripts/leghe_importa.py (import da Leghe). */
(function () {
  if (window.__girrrNomi) return; window.__girrrNomi = 1;
  var NOMI = [['Blue brothers', 'Blues Brothers'], ['Blue Brothers', 'Blues Brothers'], ['BLUE BROTHERS', 'BLUES BROTHERS'], ['blue brothers', 'blues brothers']];
  function serve(s) { return typeof s === 'string' && /blue brothers/i.test(s) && giusto(s) !== s; }
  function giusto(s) { if (typeof s !== 'string' || !/blue brothers/i.test(s)) return s; for (var i = 0; i < NOMI.length; i++) s = s.split(NOMI[i][0]).join(NOMI[i][1]); return s; }
  window.girrrNome = giusto;

  /* Canvas: immagini da condividere, Curva, Tabellone disegnato nel telefono */
  try {
    var C = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
    if (C) ['fillText', 'strokeText', 'measureText'].forEach(function (m) {
      var o = C[m]; if (!o) return;
      C[m] = function (t) { if (serve(t)) { var a = Array.prototype.slice.call(arguments); a[0] = giusto(t); return o.apply(this, a); } return o.apply(this, arguments); };
    });
  } catch (e) {}
  /* Messaggi condivisi */
  try {
    if (navigator.share) {
      var s0 = navigator.share.bind(navigator);
      navigator.share = function (d) { if (d) { if (d.text) d.text = giusto(d.text); if (d.title) d.title = giusto(d.title); } return s0(d); };
    }
  } catch (e) {}

  /* Testi della pagina */
  var SALTA = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, NOSCRIPT: 1, CODE: 1 };
  var ATTR = ['alt', 'title', 'aria-label', 'placeholder'];
  /* Nei menu a tendina il valore della voce resta il nome vecchio (è la chiave): si cambia solo il testo che si legge */
  function testo(t) {
    var p = t.parentNode; if (!p || SALTA[p.nodeName] || p.isContentEditable || !serve(t.nodeValue)) return;
    var nuovo = giusto(t.nodeValue); if (nuovo === t.nodeValue) return;
    if (p.nodeName === 'OPTION' && !p.hasAttribute('value')) p.setAttribute('value', p.value);
    t.nodeValue = nuovo;
  }
  function nodo(n) {
    if (n.nodeType === 3) { testo(n); return; }
    if (n.nodeType !== 1 || SALTA[n.nodeName] || n.isContentEditable) return;
    for (var i = 0; i < ATTR.length; i++) { var v = n.getAttribute(ATTR[i]); if (serve(v)) n.setAttribute(ATTR[i], giusto(v)); }
    var tw = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), x;
    while ((x = tw.nextNode())) {
      if (x.nodeType === 3) testo(x);
      else if (!SALTA[x.nodeName]) { for (var j = 0; j < ATTR.length; j++) { var w = x.getAttribute(ATTR[j]); if (serve(w)) x.setAttribute(ATTR[j], giusto(w)); } }
    }
  }
  function avvia() {
    if (document.body) nodo(document.body);
    if (serve(document.title)) document.title = giusto(document.title);
    if (!window.MutationObserver) return;
    new MutationObserver(function (lista) {
      for (var i = 0; i < lista.length; i++) {
        var m = lista[i];
        if (m.type === 'characterData') { if (serve(m.target.nodeValue)) nodo(m.target); }
        else if (m.type === 'attributes') { nodo(m.target); }
        else for (var k = 0; k < m.addedNodes.length; k++) nodo(m.addedNodes[k]);
      }
      if (serve(document.title)) document.title = giusto(document.title);
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})();
