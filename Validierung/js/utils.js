'use strict';

// Shortcuts
window.$ = (s) => document.querySelector(s);
window.$$ = (s) => document.querySelectorAll(s);
window.clone = (o) => JSON.parse(JSON.stringify(o));

// Toast
window.showToast = function(message, type) {
  type = type || 'success';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.right = '16px';
  toast.style.bottom = '16px';
  toast.style.padding = '10px 14px';
  toast.style.borderRadius = '10px';
  toast.style.color = '#fff';
  toast.style.fontWeight = '700';
  toast.style.boxShadow = '0 8px 24px rgba(0,0,0,.2)';
  toast.style.zIndex = '6000';
  toast.style.background = (type === 'error')
    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
    : 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
};

// Page break markers (screen only)
window.updatePageBreaks = function() {
  const markersHost = $('#pageBreakMarkers');
  if (!markersHost || markersHost.classList.contains('hidden')) return;
  markersHost.innerHTML = '';
  // Simpler Heuristik: alle ~1050px (A4 innen) eine Linie
  const approxPageHeight = 1122; // px @ 96dpi ~ A4 innen
  const sheet = $('.sheet');
  if (!sheet) return;
  const rect = sheet.getBoundingClientRect();
  const totalHeight = sheet.scrollHeight;
  let y = 0;
  let p = 1;
  while (y + approxPageHeight < totalHeight) {
    y += approxPageHeight;
    const line = document.createElement('div');
    line.className = 'page-break-line';
    line.style.top = `${y + 80}px`;
    const label = document.createElement('div');
    label.className = 'page-break-label';
    label.style.top = `${y + 80}px`;
    label.textContent = `Seitenumbruch (≈ Seite ${++p})`;
    markersHost.appendChild(line);
    markersHost.appendChild(label);
  }
};
