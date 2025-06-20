let originalText = '';
let cellRanges = [];
let activeSpan = null;
let codeMode = false;
let layoutMode = false;

const variables = {
  usuario: ['nombre', 'email', 'rol'],
  fecha:   ['dia', 'mes', 'anio'],
  pedido:  ['id', 'total', 'estado']
};

// -----------------------
// DOM
// -----------------------
const fileInput      = document.getElementById('file-input');
const btnImport      = document.getElementById('btn-import');
const btnExport      = document.getElementById('btn-export');
const btnExportPDF   = document.getElementById('btn-export-pdf');
const btnCode        = document.getElementById('btn-code');
const btnLayout      = document.getElementById('btn-layout');
const btnNueva       = document.getElementById('btn-nueva');
const btnAddTable    = document.getElementById('btn-add-table');
const btnAddImg      = document.getElementById('btn-add-img');
const btnAddVar      = document.getElementById('btn-add-var');
const inputInsertImg = document.getElementById('input-insert-img');
const preview        = document.getElementById('preview');
const elementList    = document.getElementById('element-list');
const inspector      = document.getElementById('inspector');
const inputNombrePlantilla = document.getElementById('nombre-plantilla');
const btnSaveTemplate      = document.getElementById('btn-save-template');
const btnLoadTemplate      = document.getElementById('btn-load-template');
const selectPlantilla      = document.getElementById('select-plantilla');

// -----------------------
// Utilidad para limpiar spans antes de recargar
// -----------------------
function limpiarEditCells(html) {
  return html
    .replace(/<span class="edit-cell"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/ contenteditable="true"/gi, '');
}

// -----------------------
// Añadir tabla
// -----------------------
btnAddTable.onclick = () => {
  const tabla = `<table border="1" style="width:300px;min-width:120px;border-collapse:collapse;">
    <caption>Ejemplo de tabla</caption>
    <tr><th>Columna 1</th><th>Columna 2</th></tr>
    <tr><td>Celda 1</td><td>Celda 2</td></tr>
  </table>`;
  if (activeSpan) {
    insertHtmlAtCaret(tabla);
    document.getElementById('ins-text') && (document.getElementById('ins-text').value = activeSpan.innerHTML);
  } else {
    let clean = limpiarEditCells(preview.innerHTML);
    clean += tabla;
    loadTemplate(clean);
  }
};

// -----------------------
// Añadir imagen
// -----------------------
btnAddImg.onclick = () => inputInsertImg.click();

inputInsertImg.onchange = function(e) {
  subirImagenAJAX(e.target.files[0]);
  e.target.value = '';
};

// -----------------------
// Añadir variable
// -----------------------
btnAddVar.onclick = showVariablesMenu;

function showVariablesMenu() {
  let menu = document.getElementById('var-menu');
  if (menu) { menu.remove(); return; }
  menu = document.createElement('div');
  menu.id = 'var-menu';
  Object.assign(menu.style, {
    position: 'absolute',
    top:  (btnAddVar.offsetTop + btnAddVar.offsetHeight + 6) + 'px',
    left: btnAddVar.offsetLeft + 'px',
    background: '#fff',
    border: '1px solid #ccc',
    padding: '8px',
    zIndex: 10000
  });
  const sel = document.createElement('select');
  Object.entries(variables).forEach(([cat, vars]) => {
    const grp = document.createElement('optgroup');
    grp.label = cat;
    vars.forEach(v => {
      const opt = document.createElement('option');
      opt.value       = `{{ ${cat}.${v} }}`;
      opt.textContent = `${cat}.${v}`;
      grp.appendChild(opt);
    });
    sel.appendChild(grp);
  });
  const btnIns = document.createElement('button');
  btnIns.textContent = 'Insertar';
  btnIns.style.marginLeft = '8px';
  btnIns.onclick = () => {
    insertarContenido(sel.value);
    menu.remove();
  };
  menu.appendChild(sel);
  menu.appendChild(btnIns);
  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('mousedown', function out(e){
      if (!menu.contains(e.target) && e.target.id !== 'btn-add-var') {
        menu.remove();
        document.removeEventListener('mousedown', out);
      }
    });
  }, 100);
}

// -----------------------
// Insertar contenido
// -----------------------
function insertarContenido(html) {
  if (activeSpan) {
    insertHtmlAtCaret(html);
    document.getElementById('ins-text') && (document.getElementById('ins-text').value = activeSpan.innerHTML);
  } else {
    let clean = limpiarEditCells(preview.innerHTML);
    clean += html;
    loadTemplate(clean);
  }
}

// -----------------------
// Importar/exportar
// -----------------------
btnImport.onclick = () => fileInput.click();
fileInput.onchange = e => {
  const f = e.target.files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => loadTemplate(ev.target.result);
  reader.readAsText(f, 'UTF-8');
  e.target.value = '';
};

btnExport.onclick = () => {
  if (codeMode) switchToVisual();
  let updated = originalText;
  cellRanges
    .slice()
    .sort((a, b) => b.start - a.start)
    .forEach(cr => {
      const span = document.querySelector(`.edit-cell[data-id="${cr.id}"]`);
      const content = span ? span.innerHTML : '';
      updated = updated.slice(0, cr.start) + content + updated.slice(cr.end);
    });
  updated = updated.replace(/(\{\{[^}]*?)(&nbsp;)+([^}]*?\}\})/g, '$1 $3');
  updated = updated.replace(/(\{%[^%]*?)(&nbsp;)+([^%]*?%\})/g, '$1 $3');

  const blob = new Blob([updated], { type: 'text/html' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'template_django.html';
  a.click();
  URL.revokeObjectURL(a.href);
};

btnExportPDF.onclick = () => {
  let updated = originalText;
  cellRanges
    .slice()
    .sort((a, b) => b.start - a.start)
    .forEach(cr => {
      const span = document.querySelector(`.edit-cell[data-id="${cr.id}"]`);
      const content = span ? span.innerHTML : '';
      updated = updated.slice(0, cr.start) + content + updated.slice(cr.end);
    });

  updated = updated.replace(/(\{\{[^}]*?)(&nbsp;)+([^}]*?\}\})/g, '$1 $3');
  updated = updated.replace(/(\{%[^%]*?)(&nbsp;)+([^%]*?%\})/g, '$1 $3');

  fetch('/generar-pdf-desde-archivo/', {  // <<--- Cambiado aquí
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html: updated })
  })
  .then(async r => {
    const contentType = r.headers.get("Content-Type");
    if (!r.ok) {
      let errMsg = await r.text();
      alert('Error al exportar PDF\n' + errMsg);
      return;
    }
    if (!contentType || !contentType.includes("pdf")) {
      let errMsg = await r.text();
      alert('Error: El backend no devolvió un PDF. \n\n' + errMsg);
      return;
    }
    const blob = await r.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'plantilla.pdf';
    a.click();
    URL.revokeObjectURL(a.href);
  })
  .catch((err) => {
    alert('Error al exportar PDF: ' + err);
  });
};

// -----------------------
// Nueva plantilla
// -----------------------
btnNueva.onclick = nuevaPlantillaBase;
function nuevaPlantillaBase() {
  const html = `
    <table border="1" style="border-collapse:collapse;">
      <caption>Ejemplo de tabla</caption>
      <tr><th>Columna 1</th><th>Columna 2</th></tr>
      <tr><td>Celda 1</td><td>Celda 2</td></tr>
    </table>
  `;
  loadTemplate(html);
  setTimeout(() => {
    const table = preview.querySelector('table');
    if (table) {
      makeAbsolute(table);
      const pw = preview.offsetWidth, ph = preview.offsetHeight;
      const tw = table.offsetWidth, th = table.offsetHeight;
      table.style.left = Math.max(0, Math.round((pw - tw) / 2)) + "px";
      table.style.top  = Math.max(0, Math.round((ph - th) / 2)) + "px";
      table.dataset.moved = "1";
    }
  }, 30);
}

// -----------------------
// Cargar plantilla y marcar celdas editables por rangos
// -----------------------
function loadTemplate(html) {
  originalText = html;
  cellRanges = [];
  const tags = ['td', 'th', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  let previewHTML = html;
  let offset = 0;
  const tagRE = new RegExp('(<(' + tags.join('|') + ')\\b[^>]*>)([\\s\\S]*?)(<\\/\\2>)', 'gi');
  let m;
  while ((m = tagRE.exec(html))) {
    const [match, openTag, tagName, inner, closeTag] = m;
    const start = m.index + openTag.length;
    const end = start + inner.length;
    const id = cellRanges.length;
    cellRanges.push({ start, end, id });
    let span = `<span class="edit-cell" data-id="${id}" contenteditable="true">${inner}</span>`;
    previewHTML = previewHTML.slice(0, start + offset)
      + span
      + previewHTML.slice(end + offset);
    offset += span.length - inner.length;
  }
  preview.innerHTML = previewHTML;

  document.querySelectorAll('.edit-cell').forEach(span => {
    span.onclick = () => selectElement(span);
  });

  setLayoutMode(layoutMode);
  buildElementList();
}

// -----------------------
// Sidebar/Inspector
// -----------------------
function buildElementList() {
  if (!elementList) return;
  elementList.innerHTML = '';
  document.querySelectorAll('.edit-cell').forEach(span => {
    const id = span.dataset.id;
    const text = span.textContent.trim().slice(0, 30) || '<vacio>';
    const btn = document.createElement('div');
    btn.textContent = `Celda ${id}: ${text}`;
    btn.onclick = () => selectElement(span);
    elementList.appendChild(btn);
  });
}

function selectElement(span) {
  if (activeSpan) activeSpan.style.background = '';
  activeSpan = span;
  span.style.background = 'rgba(255,255,0,0.3)';
  Array.from(elementList.children).forEach(d => d.classList.remove('active'));
  const match = Array.from(elementList.children)
    .find(d => d.textContent.startsWith(`Celda ${span.dataset.id}:`));
  if (match) match.classList.add('active');

  let html = `
    <h3>Celda ${span.dataset.id}</h3>
    <label>Texto:</label>
    <textarea id="ins-text" rows="3">${span.innerHTML}</textarea>
    <label>Estilos CSS:</label>
    <input id="ins-style" type="text" value="${span.getAttribute('style')||''}">
  `;

  // Si está dentro de una celda de tabla, muestra botones tabla
  const td = span.closest('td,th');
  const table = span.closest('table');
  if (td && table) {
    html += `<div style="margin-top:12px;padding:8px 0;border-top:1px solid #bbb">
      <b>Tabla</b><br>
      <button id="add-row">➕ Fila abajo</button>
      <button id="del-row">➖ Fila</button>
      <button id="add-col">➕ Col derecha</button>
      <button id="del-col">➖ Col</button>
    </div>`;
    setTimeout(() => {
      document.getElementById('add-row').onclick = () => { addRow(td, table); };
      document.getElementById('del-row').onclick = () => { delRow(td, table); };
      document.getElementById('add-col').onclick = () => { addCol(td, table); };
      document.getElementById('del-col').onclick = () => { delCol(td, table); };
    }, 60);
  }
  inspector.innerHTML = html;
  document.getElementById('ins-text').onblur = e =>
    activeSpan.innerHTML = e.target.value;
  document.getElementById('ins-style').onblur = e =>
    activeSpan.setAttribute('style', e.target.value);
}

// Funciones tabla
function addRow(cell, table) {
  const row = cell.parentElement;
  const clone = row.cloneNode(true);
  clone.querySelectorAll('td,th').forEach(td => td.innerHTML = 'Nueva celda');
  row.parentElement.insertBefore(clone, row.nextSibling);
  loadTemplate(limpiarEditCells(preview.innerHTML));
}
function delRow(cell, table) {
  const row = cell.parentElement;
  if (table.rows.length <= 1) return;
  row.parentElement.removeChild(row);
  loadTemplate(limpiarEditCells(preview.innerHTML));
}
function addCol(cell, table) {
  const colIdx = Array.from(cell.parentElement.children).indexOf(cell);
  Array.from(table.rows).forEach(row => {
    const ref = row.children[colIdx];
    let newCell = ref.cloneNode(true);
    newCell.innerHTML = 'Nueva celda';
    ref.parentElement.insertBefore(newCell, ref.nextSibling);
  });
  loadTemplate(limpiarEditCells(preview.innerHTML));
}
function delCol(cell, table) {
  const colIdx = Array.from(cell.parentElement.children).indexOf(cell);
  Array.from(table.rows).forEach(row => {
    if (row.children.length > 1) row.removeChild(row.children[colIdx]);
  });
  loadTemplate(limpiarEditCells(preview.innerHTML));
}

// -----------------------
// Click fuera de celda: deselecciona
// -----------------------
preview.onclick = (e) => {
  if (!e.target.classList.contains('edit-cell')) {
    if (activeSpan) activeSpan.style.background = '';
    activeSpan = null;
    Array.from(elementList?.children || []).forEach(d => d.classList.remove('active'));
    inspector.innerHTML = `<h3>Inspector</h3><p>Selecciona un elemento para editar</p>`;
  }
};

// -----------------------
// DRAG/RESIZE TABLAS
// -----------------------
btnLayout.onclick = () => {
  layoutMode = !layoutMode;
  btnLayout.textContent = layoutMode ? '✔️ Terminar disposición' : '🖱️ Editar disposición';
  setLayoutMode(layoutMode);
};

function setLayoutMode(active) {
  document.querySelectorAll('table').forEach(table => {
    if (active) {
      enableDragResizeTable(table);
      table.classList.add('table-draggable');
    } else {
      if (!table.dataset.moved) {
        table.style.position = '';
        table.style.left = '';
        table.style.top = '';
        table.style.width = '';
        table.style.height = '';
      }
      table.classList.remove('table-draggable');
    }
  });
}

function enableDragResizeTable(table) {
  if (table._draggableReady) return;
  table._draggableReady = true;

  let startX, startY, startLeft, startTop, startW, startH, dragging = false, resizing = false;

  let handle = table.querySelector('.resize-handle');
  if (!handle) {
    handle = document.createElement('div');
    handle.className = 'resize-handle';
    table.appendChild(handle);
  }

  table.addEventListener('mousedown', function(e) {
    if (!layoutMode) return;
    if (e.target.classList.contains('edit-cell')) return;
    const rect = table.getBoundingClientRect();

    if (e.target === handle || (e.clientX > rect.right - 16 && e.clientY > rect.bottom - 16)) {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = rect.width;
      startH = rect.height;
      if (getComputedStyle(table).position !== 'absolute') makeAbsolute(table);
      document.body.style.userSelect = "none";
      return;
    }
    dragging = true;
    if (getComputedStyle(table).position !== 'absolute') makeAbsolute(table);
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(table.style.left, 10) || 0;
    startTop = parseInt(table.style.top, 10) || 0;
    table.style.zIndex = 99;
    document.body.style.userSelect = "none";
  });

  document.addEventListener('mousemove', function(e) {
    if (!layoutMode) return;
    const previewRect = preview.getBoundingClientRect();
    if (dragging) {
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      let rect = table.getBoundingClientRect();
      let width = rect.width;
      let height = rect.height;
      newLeft = Math.max(0, Math.min(newLeft, preview.offsetWidth - width));
      newTop = Math.max(0, Math.min(newTop, preview.offsetHeight - height));
      table.style.left = newLeft + "px";
      table.style.top  = newTop + "px";
      table.dataset.moved = "1";
    } else if (resizing) {
      let dw = e.clientX - startX;
      let dh = e.clientY - startY;
      let newWidth  = startW + dw;
      let newHeight = startH + dh;
      const offsetLeft = parseInt(table.style.left, 10) || 0;
      const offsetTop  = parseInt(table.style.top, 10) || 0;
      newWidth  = Math.max(40, Math.min(newWidth, preview.offsetWidth - offsetLeft));
      newHeight = Math.max(20, Math.min(newHeight, preview.offsetHeight - offsetTop));
      table.style.width = newWidth + "px";
      table.style.height = newHeight + "px";
      table.dataset.moved = "1";
    }
  });

  document.addEventListener('mouseup', function() {
    if (dragging || resizing) {
      dragging = false;
      resizing = false;
      table.style.zIndex = 10;
      document.body.style.userSelect = "";
    }
  });
}

function makeAbsolute(table) {
  const rect = table.getBoundingClientRect();
  const parentRect = preview.getBoundingClientRect();
  table.style.position = 'absolute';
  table.style.left = (rect.left - parentRect.left + preview.scrollLeft) + 'px';
  table.style.top = (rect.top - parentRect.top + preview.scrollTop) + 'px';
  table.style.width = rect.width + 'px';
  table.style.height = rect.height + 'px';
}

// -----------------------
// Insertar HTML en caret
// -----------------------
function insertHtmlAtCaret(html) {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && activeSpan && activeSpan.contains(sel.anchorNode)) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = document.createRange().createContextualFragment(html);
    range.insertNode(frag);
    activeSpan.focus();
  } else if (activeSpan) {
    activeSpan.innerHTML += html;
  }
}

// -----------------------
// Subir imagen AJAX
// -----------------------
function subirImagenAJAX(file) {
  if (!file) return;
  const formData = new FormData();
  formData.append('imagen', file);
  fetch('/subir-imagen/', {
    method: 'POST',
    body: formData
  })
  .then(resp => resp.json())
  .then(data => {
    if (data.url) {
      let imgUrl = data.url.replace(/^\//, '');
      const imgTag = `<img src="${imgUrl}" alt="" style="max-width:300px;max-height:200px;display:block;margin:auto;">`;
      insertarContenido(imgTag);
    } else {
      alert('Error subiendo imagen: ' + (data.error || 'Desconocido'));
    }
  })
  .catch(() => alert('Error subiendo imagen (red).'));
}

// -----------------------
// Modo código/visual
// -----------------------
btnCode.onclick = () => {
  if (!codeMode) {
    switchToCode();
  } else {
    switchToVisual();
  }
};

function switchToCode() {
  codeMode = true;
  let updated = originalText;
  cellRanges
    .slice()
    .sort((a, b) => b.start - a.start)
    .forEach(cr => {
      const span = document.querySelector(`.edit-cell[data-id="${cr.id}"]`);
      const content = span ? span.innerHTML : '';
      updated = updated.slice(0, cr.start) + content + updated.slice(cr.end);
    });
  preview.style.display = 'none';
  inspector.style.display = 'none';
  let codeArea = document.getElementById('code-view');
  if (!codeArea) {
    codeArea = document.createElement('textarea');
    codeArea.id = 'code-view';
    codeArea.style.width = "100%";
    codeArea.style.height = "calc(100vh - 80px)";
    codeArea.style.fontFamily = "monospace";
    codeArea.style.fontSize = "15px";
    codeArea.style.margin = "8px 0";
    codeArea.style.padding = "12px";
    codeArea.style.boxSizing = "border-box";
    preview.parentNode.insertBefore(codeArea, preview);
  }
  codeArea.value = updated;
  codeArea.style.display = 'block';
  btnCode.textContent = '👁️ Visual';
}

function switchToVisual() {
  codeMode = false;
  let codeArea = document.getElementById('code-view');
  let html = codeArea ? codeArea.value : '';
  if (codeArea) {
    codeArea.style.display = 'none';
  }
  preview.style.display = '';
  inspector.style.display = '';
  if (html && html !== originalText) {
    loadTemplate(html);
  } else {
    loadTemplate(originalText);
  }
  btnCode.textContent = '📜 Codigo';
}

// -----------------------
// Guardar/Cargar plantilla
// -----------------------
btnSaveTemplate.onclick = async () => {
  const nombre = inputNombrePlantilla.value.trim();
  if (!nombre) return alert('Ponle un nombre a la plantilla.');
  let updated = originalText;
  cellRanges
    .slice()
    .sort((a, b) => b.start - a.start)
    .forEach(cr => {
      const span = document.querySelector(`.edit-cell[data-id="${cr.id}"]`);
      const content = span ? span.innerHTML : '';
      updated = updated.slice(0, cr.start) + content + updated.slice(cr.end);
    });
  let tableStates = [];
  document.querySelectorAll('table').forEach(table => {
    tableStates.push({
      position: table.style.position || '',
      left: table.style.left || '',
      top: table.style.top || '',
      width: table.style.width || '',
      height: table.style.height || '',
      moved: table.dataset.moved || ''
    });
  });
  const data = {
    html: updated,
    tables: tableStates
  };
  const resp = await fetch('/guardar-plantilla/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, contenido: data })
  });
  const res = await resp.json();
  if (res.ok) {
    alert('Plantilla guardada');
    await actualizarListaPlantillas();
  } else {
    alert('Error al guardar');
  }
};

btnLoadTemplate.onclick = async () => {
  const nombre = selectPlantilla.value;
  if (!nombre) return alert('Elige una plantilla');
  const resp = await fetch('/plantillas/' + encodeURIComponent(nombre));
  const plantilla = await resp.json();
  if (!plantilla.html) return alert('Plantilla corrupta o vacía');
  loadTemplate(plantilla.html);
  setTimeout(() => {
    if (plantilla.tables && Array.isArray(plantilla.tables)) {
      document.querySelectorAll('table').forEach((table, i) => {
        const t = plantilla.tables[i];
        if (t) {
          table.style.position = t.position || '';
          table.style.left     = t.left     || '';
          table.style.top      = t.top      || '';
          table.style.width    = t.width    || '';
          table.style.height   = t.height   || '';
          if (t.moved) table.dataset.moved = t.moved;
        }
      });
    }
  }, 10);
};

async function actualizarListaPlantillas() {
  const resp = await fetch('/listar-plantillas/');
  const datos = await resp.json();
  selectPlantilla.innerHTML = '';
  (datos.plantillas || []).forEach(nombre => {
    const opt = document.createElement('option');
    opt.value = nombre;
    opt.textContent = nombre;
    selectPlantilla.appendChild(opt);
  });
}
actualizarListaPlantillas();
