'use strict';

let currentGroupIndex = 0;

// Collapse initialisieren
function initCollapsibles(){
  $$('.section.collapsible').forEach((section) => {
    const btn = section.querySelector('.collapse-btn');
    if(!btn) return;
    btn.onclick = () => {
      section.classList.toggle('collapsed');
      btn.textContent = section.classList.contains('collapsed') ? '+' : '−';
    };
  });
}

// Gruppen zeichnen (Drag&Drop + Sections)
function drawGroups(){
  const host = $('#groupsContainer');
  if(!host) return;
  host.innerHTML = '';

  if(!window.appState.groups || window.appState.groups.length === 0){
    window.appState.groups = [{ id: Date.now(), title:'Gruppe 1', enabled:true, collapsed:false, sections:[] }];
  }

  window.appState.groups.forEach((g, gIdx) => {
    const group = document.createElement('div');
    group.className = 'group';
    if(!g.enabled) group.classList.add('disabled');
    if(g.collapsed) group.classList.add('collapsed');

    // Header
    const header = document.createElement('div');
    header.className = 'group-header';

    const titleSection = document.createElement('div');
    titleSection.className = 'group-title-section';

    const moveHandle = document.createElement('div');
    moveHandle.className = 'group-move-handle';
    moveHandle.innerHTML = '<span></span>';
    moveHandle.title = 'Gruppe verschieben';
    moveHandle.setAttribute('draggable', 'true');

    // Gruppen-Drag NUR am Handle (eigener MIME-Typ)
    moveHandle.ondragstart = (e) => {
      e.stopPropagation();
      group.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-group-drag', String(gIdx));
    };
    moveHandle.ondragend = () => {
      group.classList.remove('dragging');
      $$('.group').forEach((el)=> el.classList.remove('drag-over'));
    };
    group.ondragover = (e) => {
      const types = e.dataTransfer && Array.from(e.dataTransfer.types||[]);
      if (!types.includes('application/x-group-drag')) return;
      e.preventDefault();
      e.stopPropagation();
      const dragging = $('.group.dragging');
      if(dragging && dragging !== group){
        e.dataTransfer.dropEffect = 'move';
        group.classList.add('drag-over');
      }
    };
    group.ondragleave = (e) => {
      if(!group.contains(e.relatedTarget)) group.classList.remove('drag-over');
    };
    group.ondrop = (e) => {
      const fromStr = e.dataTransfer.getData('application/x-group-drag');
      if (!fromStr) return;
      e.preventDefault();
      e.stopPropagation();
      group.classList.remove('drag-over');
      const from = parseInt(fromStr, 10);
      const to = gIdx;
      if(from !== to){
        const moved = window.appState.groups.splice(from, 1)[0];
        window.appState.groups.splice(to, 0, moved);
        drawGroups();
        window.sync();
      }
    };

    const collapseBtn = document.createElement('div');
    collapseBtn.className = 'group-collapse-btn';
    collapseBtn.onclick = (e) => {
      e.stopPropagation();
      g.collapsed = !g.collapsed;
      drawGroups();
      window.sync();
    };

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'group-title-input';
    titleInput.value = g.title || `Gruppe ${gIdx+1}`;
    titleInput.placeholder = 'Gruppenname...';
    titleInput.oninput = () => { g.title = titleInput.value; window.sync(); };
    titleInput.onclick = (e)=> e.stopPropagation();
    titleInput.ondragstart = (e)=> e.preventDefault();

    titleSection.appendChild(moveHandle);
    titleSection.appendChild(collapseBtn);
    titleSection.appendChild(titleInput);

    const actions = document.createElement('div');
    actions.className = 'group-actions';

    const toggleBtn = document.createElement('div');
    toggleBtn.className = 'group-toggle' + (g.enabled ? ' active' : '');
    toggleBtn.textContent = g.enabled ? '✓ Aktiviert' : '✗ Deaktiviert';
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      g.enabled = !g.enabled;
      drawGroups();
      window.sync();
    };

    const duplicateBtn = document.createElement('div');
    duplicateBtn.className = 'group-btn duplicate';
    duplicateBtn.title = 'Gruppe duplizieren';
    duplicateBtn.onclick = (e) => {
      e.stopPropagation();
      const newGroup = clone(g);
      newGroup.id = Date.now() + Math.random();
      newGroup.title = (g.title || `Gruppe ${gIdx+1}`) + ' (Kopie)';
      window.appState.groups.splice(gIdx+1, 0, newGroup);
      drawGroups();
      window.sync();
      showToast('Gruppe dupliziert');
    };

    const deleteBtn = document.createElement('div');
    deleteBtn.className = 'group-btn delete';
    deleteBtn.title = 'Gruppe löschen';
    deleteBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      if(confirm(`Gruppe "${g.title || `Gruppe ${gIdx+1}`}" wirklich löschen?`)){
        window.appState.groups.splice(gIdx, 1);
        drawGroups();
        window.sync();
      }
    };

    actions.appendChild(toggleBtn);
    actions.appendChild(duplicateBtn);
    actions.appendChild(deleteBtn);

    header.appendChild(titleSection);
    header.appendChild(actions);

    const content = document.createElement('div');
    content.className = 'group-content';

    if(!g.sections) g.sections = [];
    g.sections.forEach((s, sIdx) => {
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'section';
      if(s.type === 'checklist') renderChecklistSection(sectionDiv, s, g.sections, sIdx);
      else if(s.type === 'spacing') renderSpacingSection(sectionDiv, s, g.sections, sIdx);
      else if(s.type === 'text') renderTextSection(sectionDiv, s, g.sections, sIdx);
      else if(s.type === 'image') renderImageSection(sectionDiv, s, g.sections, sIdx);
      content.appendChild(sectionDiv);
    });

    const addSection = document.createElement('div');
    addSection.className = 'group-add-section';
    const addBtn = document.createElement('button');
    addBtn.className = 'btn';
    addBtn.innerHTML = '➕ Abschnitt hinzufügen';
    addBtn.onclick = () => { currentGroupIndex = gIdx; window.addDynamicSection(); };
    addSection.appendChild(addBtn);
    content.appendChild(addSection);

    group.appendChild(header);
    group.appendChild(content);
    host.appendChild(group);
  });

  updatePageBreaks();
  initCollapsibles();
}

/* ===== Renderer: Checkliste
   – Screen: interaktive Liste (bestehend)
   – Print: zusätzliche Tabelle (validation-table) */
function renderChecklistSection(host, section, sections, sIdx){
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div class="row">
      <div class="title-wrap">
        <button class="collapse-btn">−</button>
        <input type="text" value="${section.title||'Checkliste'}" placeholder="Titel..."
          style="border:1px solid transparent;background:transparent;font-weight:700;color:var(--primary);font-size:18px;padding:4px 6px;border-radius:8px" />
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn icon add-row-btn">+ Zeile</button>
        <button class="btn icon del-section-btn">✕</button>
      </div>
    </div>
  `;
  const titleInput = header.querySelector('input');
  titleInput.oninput = () => { section.title = titleInput.value; window.sync(); };

  const addBtn = header.querySelector('.add-row-btn');
  addBtn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if(!section.rows) section.rows = [];
    section.rows.push({text:'Neuer Punkt', ok:false, note:'', code:''});
    renderChecklistSection(host, section, sections, sIdx);
    window.sync();
  };

  const delBtn = header.querySelector('.del-section-btn');
  delBtn.onclick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if(confirm('Abschnitt löschen?')){
      sections.splice(sIdx, 1);
      drawGroups(); window.sync();
    }
  };

  const body = document.createElement('div');
  body.className = 'section-body';

  /* Screen-Liste */
  const list = document.createElement('div');
  list.className = 'list screen-only';
  if(!section.rows) section.rows = [];
  section.rows.forEach((row, rIdx) => {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'check';
    rowDiv.innerHTML = `
      <div class="move-btns">
        <div class="move-handle" draggable="true"><span></span></div>
      </div>
      <input type="text" class="tiny" value="${row.code||''}" placeholder="Code" maxlength="4" />
      <button class="info-btn" title="${row.info||''}"></button>
      <textarea class="label-input" placeholder="Punkt..." rows="1">${row.text||''}</textarea>
      <textarea class="note" placeholder="Bemerkung..." rows="1">${row.note||''}</textarea>
      <input type="checkbox" ${row.ok?'checked':''} />
      <button class="btn icon tiny del">✕</button>
    `;

    const codeInput = rowDiv.querySelector('.tiny');
    const labelInput = rowDiv.querySelector('.label-input');
    const noteInput = rowDiv.querySelector('.note');
    const checkbox = rowDiv.querySelector('input[type="checkbox"]');
    const delRowBtn = rowDiv.querySelector('.del');

    codeInput.oninput = () => { row.code = codeInput.value; window.sync(); };
    labelInput.oninput = function(){
      row.text = labelInput.value;
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
      window.sync();
    };
    noteInput.oninput = function(){
      row.note = noteInput.value;
      this.style.height = 'auto';
      this.style.height = this.scrollHeight + 'px';
      window.sync();
    };
    checkbox.onchange = () => { row.ok = checkbox.checked; window.sync(); };

    delRowBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      section.rows.splice(rIdx, 1);
      renderChecklistSection(host, section, sections, sIdx);
      window.sync();
    };

    // ✅ Zeilen-Drag nur innerhalb Checkliste (eigener MIME-Typ)
    const handle = rowDiv.querySelector('.move-handle');
    handle.ondragstart = (e) => {
      e.stopPropagation();
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-row-drag', String(rIdx));
    };
    rowDiv.ondragover = (e) => {
      const types = e.dataTransfer && Array.from(e.dataTransfer.types||[]);
      if (!types.includes('application/x-row-drag')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };
    rowDiv.ondrop = (e) => {
      const fromStr = e.dataTransfer.getData('application/x-row-drag');
      if (!fromStr) return;
      e.preventDefault();
      const from = parseInt(fromStr, 10);
      const to = rIdx;
      if(from !== to){
        const moved = section.rows.splice(from, 1)[0];
        section.rows.splice(to, 0, moved);
        renderChecklistSection(host, section, sections, sIdx);
        window.sync();
      }
    };

    list.appendChild(rowDiv);
  });

  /* Print-Tabelle (parallel erzeugt, via CSS nur im Print sichtbar) */
  const table = document.createElement('table');
  table.className = 'validation-table print-only';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr><th style="width:18mm">Code</th><th>Punkt</th><th>Bemerkung</th><th style="width:14mm">OK</th></tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  (section.rows||[]).forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${(r.code||'').toString().replace(/\</g,'&lt;')}</td>
      <td>${(r.text||'').toString().replace(/\</g,'&lt;')}</td>
      <td>${(r.note||'').toString().replace(/\</g,'&lt;')}</td>
      <td>${r.ok ? '☑' : '☐'}</td>
    `;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  body.appendChild(list);
  body.appendChild(table);
  host.innerHTML = '';
  host.appendChild(header);
  host.appendChild(body);

  const collapseBtn = header.querySelector('.collapse-btn');
  collapseBtn.onclick = () => {
    host.classList.toggle('collapsed');
    collapseBtn.textContent = host.classList.contains('collapsed') ? '+' : '−';
  };
}

// (Platzhalter, falls benötigt – aktuelle Version nutzt nur Checkliste)
function renderSpacingSection(host, section, sections, sIdx){
  if(!section.heightCm) section.heightCm = 5;
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div class="row"><h2>Abstand</h2><button class="btn icon del">✕</button></div>
  `;
  const delBtn = header.querySelector('.del');
  delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation();
    if(confirm('Abschnitt löschen?')){ sections.splice(sIdx,1); drawGroups(); window.sync(); }
  };

  const body = document.createElement('div');
  body.className = 'section-body';
  body.innerHTML = `
    <div class="spacing-section">
      <div class="controls" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
        <label style="margin:0">Höhe (cm):</label>
        <input type="number" value="${section.heightCm}" min="1" max="25" style="width:80px" />
      </div>
      <div class="preview" style="background:#fff;border:1px solid #e5e7eb;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;height:${section.heightCm*10}px">↕ ${section.heightCm} cm Abstand</div>
    </div>
  `;
  const heightInput = body.querySelector('input[type="number"]');
  const preview = body.querySelector('.preview');
  heightInput.oninput = () => {
    section.heightCm = parseFloat(heightInput.value) || 5;
    preview.style.height = (section.heightCm * 10) + 'px';
    preview.textContent = '↕ ' + section.heightCm + ' cm Abstand';
    window.sync();
  };

  host.innerHTML = '';
  host.appendChild(header);
  host.appendChild(body);
}

function renderTextSection(host, section, sections, sIdx){
  if(!section.content) section.content = '';
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div class="row">
      <input type="text" value="${section.title||'Text'}" placeholder="Titel..."
        style="border:1px solid transparent;background:transparent;font-weight:700;color:var(--primary);font-size:18px;padding:4px 6px;border-radius:8px" />
      <button class="btn icon del">✕</button>
    </div>
  `;
  const titleInput = header.querySelector('input');
  titleInput.oninput = () => { section.title = titleInput.value; window.sync(); };

  const delBtn = header.querySelector('.del');
  delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation();
    if(confirm('Abschnitt löschen?')){ sections.splice(sIdx, 1); drawGroups(); window.sync(); }
  };

  const body = document.createElement('div');
  body.className = 'section-body';
  body.innerHTML = `
    <div class="text-section">
      <div class="text-editor-toolbar">
        <button data-cmd="bold"><strong>B</strong></button>
        <button data-cmd="italic"><em>I</em></button>
        <button data-cmd="underline"><u>U</u></button>
        <div class="divider"></div>
        <button data-cmd="insertUnorderedList">• Liste</button>
        <button data-cmd="insertOrderedList">1. Liste</button>
      </div>
      <div class="text-editor-content" contenteditable="true">${section.content}</div>
    </div>
  `;
  const editor = body.querySelector('.text-editor-content');
  const toolbar = body.querySelector('.text-editor-toolbar');
  editor.oninput = () => { section.content = editor.innerHTML; window.sync(); };
  toolbar.querySelectorAll('button').forEach((btn) => {
    btn.onclick = () => {
      document.execCommand(btn.getAttribute('data-cmd'), false, null);
      editor.focus();
    };
  });

  host.innerHTML = '';
  host.appendChild(header);
  host.appendChild(body);
}

function renderImageSection(host, section, sections, sIdx){
  if(!section.images) section.images = [];
  const header = document.createElement('div');
  header.className = 'section-header';
  header.innerHTML = `
    <div class="row">
      <input type="text" value="${section.title||'Bilder'}" placeholder="Titel..."
        style="border:1px solid transparent;background:transparent;font-weight:700;color:var(--primary);font-size:18px;padding:4px 6px;border-radius:8px" />
      <button class="btn icon del">✕</button>
    </div>
  `;
  const titleInput = header.querySelector('input');
  titleInput.oninput = () => { section.title = titleInput.value; window.sync(); };

  const delBtn = header.querySelector('.del');
  delBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation();
    if(confirm('Abschnitt löschen?')){ sections.splice(sIdx, 1); drawGroups(); window.sync(); }
  };

  const body = document.createElement('div');
  body.className = 'section-body';
  body.innerHTML = `
    <div class="image-section">
      <div class="image-upload-zone">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">📸 Bilder hochladen</div>
        <div style="font-size:14px;color:#94a3b8;">Klicken oder Dateien hierher ziehen</div>
        <input type="file" accept="image/*" multiple style="display:none" />
      </div>
      <div class="image-preview"></div>
    </div>
  `;
  const zone = body.querySelector('.image-upload-zone');
  const fileInput = zone.querySelector('input[type="file"]');
  const preview = body.querySelector('.image-preview');

  function renderPreview(){
    preview.innerHTML = '';
    section.images.forEach((src, idx) => {
      const item = document.createElement('div');
      item.className = 'image-preview-item';
      item.innerHTML = `<img src="${src}" alt="Bild ${idx+1}" /><button class="delete-btn">✕</button>`;
      item.querySelector('.delete-btn').onclick = () => {
        section.images.splice(idx,1);
        renderPreview(); window.sync();
      };
      preview.appendChild(item);
    });
  }
  renderPreview();

  zone.onclick = () => fileInput.click();
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
  zone.ondragleave = () => zone.classList.remove('dragover');
  zone.ondrop = (e) => {
    e.preventDefault(); zone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files || []);
    if(!files.length) return;
    const readers = files.map((f)=> new Promise((res,reject)=>{
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = reject;
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((arr)=>{
      section.images.push(...arr);
      renderPreview(); window.sync();
    });
  };
  fileInput.onchange = () => {
    const files = Array.from(fileInput.files || []);
    if(!files.length) return;
    const readers = files.map((f)=> new Promise((res,reject)=>{
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = reject;
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((arr)=>{
      section.images.push(...arr);
      renderPreview(); window.sync();
      fileInput.value = '';
    });
  };

  host.innerHTML = '';
  host.appendChild(header);
  host.appendChild(body);
}

window.drawGroups = drawGroups;
window.renderChecklistSection = renderChecklistSection;
window.renderSpacingSection  = renderSpacingSection;
window.renderTextSection     = renderTextSection;
window.renderImageSection    = renderImageSection;
window.initCollapsibles      = initCollapsibles;
