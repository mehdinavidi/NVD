'use strict';

// App State (Schlüssel bleiben kompatibel)
window.appState = {
  nameEinrichtung:'', standortInstallation:'', verantwortlichePerson:'', produkt:'',
  programmPaket:'', version:'', softwarepflege:'', arbeitsplaetze:'', angebundeneGeraete:'',
  bemerkungInstallation:'', validierungDatum:'', letzteValidierung:'', naechsteValidierung:'',
  checkValidierung:false, checkRevalidierung:false,
  validiererName:'', qualifikation:'', produktschulung:'',
  unterschriftValidierer:'', freigabeBetreiber:'',
  groups:[]
};

const STORAGE_KEY = 'validierung_v3_fixed'; // absichtlich gleich für 1:1 Fortführung

const formFields = [
  'nameEinrichtung','standortInstallation','verantwortlichePerson','produkt',
  'programmPaket','version','softwarepflege','arbeitsplaetze','angebundeneGeraete',
  'bemerkungInstallation','validierungDatum','letzteValidierung','naechsteValidierung',
  'checkValidierung','checkRevalidierung',
  'validiererName','qualifikation','produktschulung',
  'unterschriftValidierer','freigabeBetreiber'
];

// Sync <-> state
window.sync = function sync(){
  formFields.forEach((k)=>{
    const el = document.getElementById(k);
    if(el){
      if(el.type === 'checkbox') appState[k] = el.checked;
      else appState[k] = el.value;
    }
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
};

// State laden
function loadState(){
  try{
    const stored = localStorage.getItem(STORAGE_KEY);
    if(!stored) return false;
    const data = JSON.parse(stored);
    Object.assign(appState, data);
    formFields.forEach((k)=>{
      const el = document.getElementById(k);
      if(el){
        if(el.type === 'checkbox') el.checked = !!appState[k];
        else el.value = appState[k] || '';
      }
    });
    return true;
  }catch(e){ return false; }
}

// Export / Import / Reset
function exportJSON(){
  const blob = new Blob([JSON.stringify(appState, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'validierung_'+Date.now()+'.json';
  a.click();
}

function importJSON(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = () => {
    const file = input.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try{
        const data = JSON.parse(e.target.result);
        Object.assign(appState, data);
        renderAll();
        showToast('✓ Daten erfolgreich geladen');
      }catch(err){ showToast('✗ Fehler beim Laden: '+err.message, 'error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAll(){
  if(!confirm('Alle Daten löschen?')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// Modal: Abschnitt hinzufügen
window.addDynamicSection = function addDynamicSection(){
  const modal = $('#sectionTypeModal');
  modal.classList.add('active');
};
function closeSectionModal(){ $('#sectionTypeModal').classList.remove('active'); }

function bindSectionTypeModal(){
  $('#sectionTypeClose').onclick = closeSectionModal;
  $$('#sectionTypeModal .section-type-card').forEach((card)=>{
    card.onclick = () => {
      const type = card.getAttribute('data-type');
      const g = appState.groups[currentGroupIndex];
      if(!g.sections) g.sections = [];
      if(type === 'checklist'){
        g.sections.push({ type:'checklist', title:'Checkliste', rows:[
          { text:'Konformität mit Spezifikation', ok:false, note:'', code:'KV-001' },
          { text:'Messgenauigkeit überprüft', ok:false, note:'', code:'KV-002' }
        ]});
      }else if(type === 'spacing'){
        g.sections.push({ type:'spacing', heightCm:5 });
      }else if(type === 'text'){
        g.sections.push({ type:'text', title:'Text', content:'' });
      }else if(type === 'image'){
        g.sections.push({ type:'image', title:'Bilder', images:[] });
      }
      drawGroups(); sync(); closeSectionModal();
      showToast('Abschnitt hinzugefügt');
    };
  });
}

// Event-Bindings
function bindUI(){
  // Datum/Stamp (robust)
  const stampEl = document.getElementById('stamp');
  if (stampEl) {
    const now = new Date();
    stampEl.textContent = now.toLocaleString();
  }

  // Hamburger-Menü
  const hb = $('#hamburgerBtn');
  const hm = $('#hamburgerMenu');
  hb.onclick = (e) => {
    e.stopPropagation();
    hb.classList.toggle('active');
    hm.classList.toggle('active');
  };

  // Schließen bei Klick außerhalb
  document.addEventListener('click', (e) => {
    if (!hm.classList.contains('active')) return;
    if (!hm.contains(e.target) && !hb.contains(e.target)) {
      hm.classList.remove('active');
      hb.classList.remove('active');
    }
  });

  // Schließen bei ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hm.classList.contains('active')) {
      hm.classList.remove('active');
      hb.classList.remove('active');
    }
  });

  // Menübutton schließt Menü
  hm.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', () => {
      hm.classList.remove('active');
      hb.classList.remove('active');
    });
  });

  // Buttons
  $('#btnNewGroup').onclick = () => {
    appState.groups.push({ id: Date.now(), title:`Gruppe ${appState.groups.length+1}`, enabled:true, collapsed:false, sections:[] });
    drawGroups(); sync(); showToast('Neue Gruppe erstellt');
  };

  $('#btnNewSectionMenu').onclick = () => {
    if(!appState.groups.length){
      appState.groups.push({ id: Date.now(), title:'Gruppe 1', enabled:true, collapsed:false, sections:[] });
    }
    // Standard: letzte Gruppe
    window.currentGroupIndex = appState.groups.length - 1;
    addDynamicSection();
  };

  // ⚠️ Kein eigener PDF-Button-Handler hier!
  // Der Druck wird ausschließlich in pdf.js verdrahtet, um Doppelaufrufe zu vermeiden.

  $('#btnSave').onclick = exportJSON;
  $('#btnLoad').onclick = importJSON;
  $('#btnReset').onclick = resetAll;

  // Signatur-Felder löschen
  $$('.sig-controls .btn').forEach((b)=>{
    const target = b.getAttribute('data-clear-text');
    b.onclick = () => {
      const t = document.getElementById(target);
      if(t){ t.value = ''; sync(); }
    };
  });

  // Inputs -> sync
  formFields.forEach((k)=>{
    const el = document.getElementById(k);
    if(!el) return;
    const evt = (el.tagName === 'SELECT' || el.type === 'checkbox') ? 'change' : 'input';
    el.addEventListener(evt, sync);
  });
}

// Render All
function renderAll(){
  // Felder aus State auf UI (falls importJSON)
  formFields.forEach((k)=>{
    const el = document.getElementById(k);
    if(el){
      if(el.type === 'checkbox') el.checked = !!appState[k];
      else el.value = appState[k] || '';
    }
  });
  drawGroups();
}

document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  bindSectionTypeModal();
  loadState(); // optional
  renderAll();
  showToast('UI geladen');
});
