/* O Girrr 6.5 · Copertina del primo ingresso con Notte Tropicale (ChatGPT, rifatta da Claude il 18 novembre 2026 su
   richiesta di Gianluca: «copertina fissa, si preme Continua, poi la transizione dalla vecchia alla nuova grafica»).
   - Solo nella Home, solo la prima volta che si entra nel Girrr da un dispositivo (localStorage nt_entrata_vista).
   - Il caricatore delle skin tiene la pagina coperta di viola finché la copertina non è pronta: niente schermi neri o bianchi.
   - La copertina compare con una dissolvenza quando l'immagine è decodificata e resta finché non si tocca «Continua».
   - Dopo «Continua»: la copertina svanisce sul Girrr con la grafica di sempre, poi la nuova grafica entra con una tendina
     in diagonale (View Transitions dove ci sono, altrimenti una dissolvenza). Con «riduci movimento»: cambi senza movimento.
   - Prove sul computer: ?entrata-prova=1 su localhost la rimostra. */
(function () {
  'use strict';
  var h = document.documentElement, ID = 'notte-tropicale', CHIAVE = 'nt_entrata_vista';
  function avvia() {
    if (!document.body || document.body.getAttribute('data-v53') !== 'home' || (h.getAttribute('data-event-theme') !== ID && !h.classList.contains('girrr-b-senza-barra')) ||
        h.getAttribute('data-nt-entrata-avviata')) return;
    var prova = /(?:localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get('entrata-prova') === '1';
    var vista = false; try { vista = localStorage.getItem(CHIAVE) === '1'; } catch (e) {}
    if (vista && !prova) { h.removeAttribute('data-evento-primo'); return; }
    h.setAttribute('data-nt-entrata-avviata', '1');
    var ridotto = false; try { ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var me = document.querySelector('script[data-nt-entrata]') || document.currentScript;
    var base; try { base = new URL('./', me && me.src ? me.src : location.href); } catch (e) { h.removeAttribute('data-evento-primo'); return; }
    var asset = new URL('gta6-lucia-jason-cover.webp', base).href;
    if (!document.querySelector('link[data-nt-entrata-css]')) {
      var st = document.createElement('link'); st.rel = 'stylesheet'; st.href = new URL('entrata.css', base).href;
      st.setAttribute('data-nt-entrata-css', ''); document.head.appendChild(st);
    }
    var ov = document.createElement('div'); ov.className = 'nt-ingresso';
    ov.style.visibility = 'visible';   /* resta visibile anche mentre il resto della pagina è nascosto dal caricatore */
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Notte Tropicale, edizione speciale dal 19 al 27 novembre');
    var fondo = document.createElement('div'); fondo.className = 'nt-ingresso-fondo'; fondo.style.backgroundImage = 'url("' + asset + '")';
    var img = document.createElement('img'); img.className = 'nt-ingresso-poster'; img.alt = ''; img.decoding = 'async';
    try { img.fetchPriority = 'high'; } catch (e) {}
    var tit = document.createElement('div'); tit.className = 'nt-ingresso-titoli';
    var nome = document.createElement('strong'); nome.textContent = 'O GIRRR';
    var sotto = document.createElement('div'), scritta = document.createElement('em'), date = document.createElement('small');
    scritta.textContent = 'Notte Tropicale'; date.textContent = '19–27 novembre 2026';
    var vai = document.createElement('button'); vai.type = 'button'; vai.className = 'nt-ingresso-continua'; vai.textContent = 'Continua ›';
    sotto.append(scritta, date, vai); tit.append(nome, sotto); ov.append(fondo, img, tit);
    document.body.appendChild(ov);

    var mostrata = false;
    function mostra() {
      if (mostrata) return; mostrata = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        ov.classList.add('nt-ingresso-visibile');
        /* quando la copertina è piena si toglie il velo del caricatore */
        setTimeout(function () { h.removeAttribute('data-evento-primo'); try { vai.focus({ preventScroll: true }); } catch (e) {} }, ridotto ? 0 : 420);
      }); });
    }
    img.addEventListener('error', function () {
      var alt = new URL('miami-tramonto.jpg', base).href;
      if (img.src !== alt) { img.src = alt; fondo.style.backgroundImage = 'url("' + alt + '")'; } else mostra();
    });
    img.addEventListener('load', function () { (img.decode ? img.decode() : Promise.resolve()).then(mostra, mostra); });
    img.src = asset;
    setTimeout(mostra, 2500);   /* se l'immagine tarda, la copertina si mostra lo stesso (con lo sfondo viola) */

    var chiusa = false;
    function continua() {
      if (chiusa) return; chiusa = true;
      try { localStorage.setItem(CHIAVE, '1'); } catch (e) {}
      document.removeEventListener('keydown', tasto);
      /* 6.5: la copertina lascia la Home originale; il caricatore accende la skin con la Nuvola. */
      h.removeAttribute('data-evento-primo');
      try { window.scrollTo(0, 0); } catch (err) {}
      ov.classList.add('nt-ingresso-uscita');
      setTimeout(function () {
        ov.remove();
        document.dispatchEvent(new Event('nt-copertina-chiusa'));
      }, ridotto ? 0 : 600);
    }
    function tasto(e) { if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); continua(); } }
    vai.addEventListener('click', continua);
    document.addEventListener('keydown', tasto);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia, { once: true }); else avvia();
})();
