'use strict';

// Vor dem Drucken: Datum & Version in Footer/Deckblatt setzen
window.addEventListener('beforeprint', () => {
  // Footer-Datum aktualisieren
  const f = document.getElementById('printFooter');
  if (f) {
    const d = new Date().toLocaleDateString('de-DE');
    f.setAttribute('data-date', `Validierungsprotokoll – ${d}`);
  }

  // Deckblatt-Datum
  const dd = document.getElementById('deckblattDatum');
  if (dd) dd.textContent = new Date().toLocaleDateString('de-DE');

  // ❌ Kein counterReset – sonst steht Seite 0
  // document.body.style.counterReset = 'page';
});

// Button → PDF / Druck (nur einmal binden)
(function(){
  if (window.__PRINT_HANDLER_BOUND__) return;
  window.__PRINT_HANDLER_BOUND__ = true;

  const btn = document.getElementById('btnPDF');
  if(!btn) return;

  btn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();

    // Page-Break-Marker aktualisieren, falls sichtbar
    const markers = document.getElementById('pageBreakMarkers');
    if (markers && !markers.classList.contains('hidden') && typeof updatePageBreaks === 'function') {
      updatePageBreaks();
    }

    window.print();
    setTimeout(()=>console.log('✅ Offizieller Druck ausgeführt (v4.4.2 – single print)'), 400);
  }, { once:false });
})();
