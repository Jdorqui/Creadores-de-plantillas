// ====================== CONFIG INICIAL ======================
const GRID_SIZE = 20;
let mostrarCuadricula = true;

// ====================== INICIALIZACIÓN DE GRAPESJS ======================
const editor = grapesjs.init({
  container: '#gjs',
  fromElement: false,
  height: '100%',
  storageManager: { type: 'none' },
  dragMode: 'absolute',
  plugins: ['grapesjs-custom-code'],
  pluginsOpts: {
    'grapesjs-custom-code': { modalTitle: 'Insertar código Django' }
  }
});

editor.on('load', () => {
  registerCustomTypes();
  initializeCanvas();
  setupWrapper();
  setupComponentHandlers();
  setupCustomPanels();
});

// ====================== TIPOS PERSONALIZADOS ======================
function registerCustomTypes() {
  const dc = editor.DomComponents;
  function defineInlineType(type, tags, style, drop) {
    dc.addType(type, {
      isComponent: el => tags.includes(el.tagName) && { type },
      model: {
        defaults: {
          droppable: drop,
          editable: true,
          selectable: true,
          hoverable: true,
          attributes: { style }
        }
      },
      view: {
        events: { dblclick: 'startEdit', blur: 'stopEdit' },
        startEdit(e) {
          e.stopPropagation();
          this.el.contentEditable = true;
          this.el.focus();
        },
        stopEdit() {
          this.el.contentEditable = false;
          this.el.removeAttribute('tabindex');
          const m = this.model;
          m.components(this.el.innerHTML);
          m.setAttributes({ style: this.el.getAttribute('style') || '' });
        }
      }
    });
  }

  defineInlineType('Text', ['P','SPAN','H1','H2','H3','LI','A'], 'display:inline-block;white-space:pre-wrap;', false);
  defineInlineType('Div', ['DIV'], 'padding:10px;border:1px solid #000;', true);
  defineInlineType('table cell', ['TD','TH'], 'border:1px solid black;padding:8px;', false);

  editor.on('component:add', m => {
    const t = m.get('type');
    if (['Text','Div','table cell'].includes(t) && m.view?.el) {
      const s = m.view.el.getAttribute('style');
      if (s) m.setAttributes({ style: s });
    }
  });

  editor.Commands.add('addTextComponent', { run() { addTextComponent(); } });
}

// ====================== CANVAS & CUADRÍCULA ======================
function initializeCanvas() {
  if (!mostrarCuadricula) return;
  const body = editor.Canvas.getBody();
  body.style.backgroundImage = 'linear-gradient(to right,rgba(0,0,0,0.05)1px,transparent 1px),' + 'linear-gradient(to bottom,rgba(0,0,0,0.05)1px,transparent 1px)';
  body.style.backgroundSize = `${GRID_SIZE}px ${GRID_SIZE}px`;
}
function toggleGrid() {
  mostrarCuadricula = !mostrarCuadricula;
  const body = editor.Canvas.getBody();
  body.style.backgroundImage = mostrarCuadricula ? 'linear-gradient(to right,rgba(0,0,0,0.05)1px,transparent 1px),' + 'linear-gradient(to bottom,rgba(0,0,0,0.05)1px,transparent 1px)' : 'none';
}

// ====================== HELPERS DRAG & EDITABLE ======================
function makeDraggable(m) {
  const tag = (m.get('tagName')||'').toLowerCase();
  if (['table','div','img'].includes(tag)) {
    m.set({
      draggable: true,
      droppable: ['div','Text','image','table','table cell'],
      resizable: { tl:1,tr:1,bl:1,br:1, keyWidth:'width', keyHeight:'height', currentUnit:'px' }
    });
  } else {
    m.set({ draggable: false });
  }
}
function makeEditable(m) {
  if (['Text','Div','table cell'].includes(m.get('type'))) {
    m.set('editable', true);
  }
}

// ====================== WRAPPER & HANDLERS ======================
function setupWrapper() {
  const w = editor.DomComponents.getWrapper();
  w.set({
    droppable: true,
    classes: ['pagina'], // añade clase pagina
    style: {
      position: 'relative',
      width: '794px',    // A4 (210mm*3.78) a 96dpi
      height: '1123px',  // A4 (297mm*3.78) a 96dpi
      minHeight: '1123px',
      margin: '30px auto', // centra en el editor visual
      background: 'white',
      border: '1px solid #888',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }
  });
  w.find('*').forEach(c => { makeDraggable(c); makeEditable(c); });
}

function setupComponentHandlers() {
  editor.on('component:add', m => { makeDraggable(m); makeEditable(m); });
  editor.on('component:drag:end', m => {
    const s = m.getStyle?.();
    if (s?.left && s?.top) {
      const snap = v => Math.round(parseInt(v)/GRID_SIZE)*GRID_SIZE + 'px';
      m.setStyle({ ...s, left: snap(s.left), top: snap(s.top) });
    }
  });
}

// ====================== WEASYPRINT GENERAR PDF ======================
editor.Commands.add('generar-pdf', {
  run(editor) {
    // extrae solo el HTML interior de .pagina
    const wrapper = editor.DomComponents.getWrapper();
    const paginaHTML = wrapper.toHTML(); // Solo el contenido del wrapper, incl. la clase
    const grapeCSS = editor.getCss();

    // CSS para PDF y edicion visual
    const extraCSS = `
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      border: 0;
      height: 100%;
      width: 100%;
    }
    @page {
      size: A4;
      margin: 0;
    }
    .pagina {
      margin: 0 auto;
      background: white;
      border: 1px solid #888;
      width: 794px;
      height: 1123px;
      position: relative;
      box-sizing: border-box;
      overflow: hidden;
    }
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <title>Factura</title>
    <style>
    ${extraCSS}
    ${grapeCSS}
    </style>
    </head>
    <body>
    ${paginaHTML}
    </body>
    </html>
    `;

    fetch('/generar-pdf-desde-archivo/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    })
    .then(res => {
      if (!res.ok) throw new Error(`Error al generar PDF (${res.status})`);
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'factura.pdf';
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch(err => {
      alert(err.message);
      console.error(err);
    });
  }
});

// ====================== PANEL DE BOTONES ======================
function setupCustomPanels() {
  editor.Panels.addPanel({
    id: 'main',
    buttons: [
      { id:'pdf', label:'🗃️ Generar PDF', command: 'generar-pdf' },
      { id:'text', label:'🅰️ Texto', command: 'addTextComponent' },
      { id:'image', label:'🖼️ Imagen', command: 'addImageComponent' },
      { id:'div', label:'🔲 Div', command: 'addDivComponent' },
      { id:'table', label:'📋 Tabla', command: 'openTableSelector' },
      { id:'variable', label:'🔧 Variable', command: 'open-variable-selector' },
      { id:'grid', label:'🧲 Cuadrícula', command: toggleGrid },
      { id:'delete', label:'🗑️ Eliminar', command: () => {const sel = editor.getSelected();sel && sel.remove();}}
    ]
  });
}

// ========== AÑADIR COMPONENTES ==============
editor.Commands.add('addImageComponent', { run() { addImageComponent(); } });
editor.Commands.add('addDivComponent',   { run() { addDivComponent();   } });
editor.Commands.add('openTableSelector',{ run() { openTableSelector(); } });
editor.Commands.add('open-variable-selector', {run(editor, sender) {openVariableSelector(editor, sender);}});

function addTextComponent() {
  const sel = editor.getSelected();
  const cfg = { type:'Text', content:'Texto editable' };
  if (sel && sel.get('droppable')) sel.append(cfg);
  else editor.DomComponents.getWrapper().append({...cfg, style:'position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);'});
}
function addImageComponent() {
  const sel = editor.getSelected();
  const cfg = { type:'image', attributes:{ src:'https://placehold.co/100x100' } };
  if (sel && sel.get('droppable')) sel.append(cfg);
  else editor.DomComponents.getWrapper().append({...cfg, style:'position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);'});
}
function addDivComponent() {
  const sel = editor.getSelected();
  const cfg = { type:'Div' };
  if (sel && sel.get('droppable')) sel.append(cfg);
  else editor.DomComponents.getWrapper().append({...cfg, style:'position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);'});
}

// ====================== VARIABLES ======================
const VARS = { //se definen las variables que se pueden insertar en el editor
  empresa: [
    'logotipo','nif','direccion','numero','bloque',
    'planta','puerta','cp','municipio','provincia',
    'email','telefono'
  ],
  cliente: ['nombre','nif','direccion','telefono'],
  factura: ['numero','fecha','total']
};

function openVariableSelector(editor, sender) { //abre el selector de variables
  const sel = document.getElementById('selector-variable');
  const sub = document.getElementById('submenu-variable');
  const catList = document.getElementById('var-cats');
  const itemList = document.getElementById('var-items');
  sel.style.display = 'block';

  catList.innerHTML = ''; //se limpia el selector de categorias
  itemList.innerHTML = ''; //se limpia el selector de items
  sub.style.display = 'none'; //se oculta el submenu de items

  Object.keys(VARS).forEach(cat => { //se añaden las categorias al selector de variables
    const li = document.createElement('li');
    li.textContent = cat;
    li.style.cssText = 'padding: 4px 8px; cursor: pointer;';
    li.addEventListener('mouseenter', () => {
      itemList.innerHTML = '';
      VARS[cat].forEach(key => {
        const li2 = document.createElement('li');
        const fullVar = `{{ ${cat}.${key} }}`;
        li2.textContent = key;
        li2.style.cssText = 'padding: 4px 8px; cursor: pointer;';
        li2.addEventListener('click', () => {
          insertVariable(fullVar);
          hideVariableSelector();
        });
        itemList.appendChild(li2);
      });
      // Posicionar submenu
      const r = li.getBoundingClientRect();
      sub.style.left = `${r.right + 5}px`;
      sub.style.top = `${r.top}px`;
      sub.style.display = 'block';
    });
    catList.appendChild(li);
  });

  //se posiciona el selector de variables
  const btnRect = sender.el.getBoundingClientRect();
  sel.style.left = `${btnRect.left}px`;
  sel.style.top = `${btnRect.bottom + 5}px`;
  sel.style.display = 'block';

  //se oculta el submenu de items al hacer clic fuera de el
  setTimeout(() => document.addEventListener('mousedown', onVariableSelectorOutside), 0);
}

function hideVariableSelector() { //oculta el selector de variables
  const sel = document.getElementById('selector-variable');
  const sub = document.getElementById('submenu-variable');
  sel.style.display = 'none';
  sub.style.display = 'none';
  document.removeEventListener('mousedown', onVariableSelectorOutside);
}

function onVariableSelectorOutside(e) { //cierra el selector de variables al hacer clic fuera de el
  if (!sel.contains(e.target) && !sub.contains(e.target)) { //si el clic no se hace dentro del selector de variables
    hideVariableSelector(); //oculta el selector de variables
  }
}

function insertVariable(variable) { //inserta la variable seleccionada en el selector de variables
  const sel = editor.getSelected();
  const cfg = {
    type: 'Text',
    content: variable,
    style: 'display: inline-block; white-space: pre-wrap;'
  };
  if (sel && sel.get('droppable')) sel.append(cfg);
  else editor.DomComponents.getWrapper().append({...cfg, style: 'position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);'});
}

// ====================== TABLAS ======================
function openTableSelector(editor, sender) { //abre el selector de tablas
  const sel  = document.getElementById('selector-tabla');
  const grid = document.getElementById('grid-container');
  const lbl  = document.getElementById('grid-label');
  const MAX_COLS = 10, MAX_ROWS = 10;
  sel.style.display = 'block';
  sel.style.position = 'fixed';

  grid.innerHTML = ''; //limpia el grid
  lbl.textContent = '0x0'; //limpia el label

  for (let r = 1; r <= MAX_ROWS; r++) { //construye el grid para seleccionar el tamaño de la tabla
    for (let c = 1; c <= MAX_COLS; c++) {
      const cell = document.createElement('div');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.style.cssText = 'border: 1px solid #ccc; background: #f0f0f0; ' + 'width: 20px; height: 20px; cursor: pointer;';
      grid.appendChild(cell);

      cell.addEventListener('mouseenter', () => {
        lbl.textContent = `${c}x${r}`;
        Array.from(grid.children).forEach(d => {
          const br = +d.dataset.row, bc = +d.dataset.col;
          d.style.background = (br <= r && bc <= c) ? '#3399ff' : '#f0f0f0';
        });
      });

      cell.addEventListener('click', () => { //al hacer click en el tamaño deseado se inserta la tabla
        insertTable(c, r);
        sel.style.display = 'none';
      });
    }
  }

  //posiciona el selector de tablas
  const btnRect = sender.el.getBoundingClientRect();
  sel.style.left = `${btnRect.left}px`;
  sel.style.top = `${btnRect.bottom + 5}px`;
  sel.style.display = 'block';
}

function hideTableSelector() { //oculta el selector de tablas
  const sel = document.getElementById('selector-tabla');
  sel.style.display = 'none';
}

function insertTable(cols, rows) { //inserta la tabla con el tamaño seleccionado en el editor 
  const sel = editor.getSelected(); //se obtiene el item seleccionado
  const w = editor.DomComponents.getWrapper(); //se obtiene el wrapper
  const cfg = { //se define la tabla
    type: 'table',
    tagName: 'table',
    classes: ['Table'],
    style: 'border-collapse: collapse; position: absolute; left: 50%; top: 50%; transform: translate(-50%,-50%);',
    components: [
      {
        tagName: 'thead',
        components: [{
          tagName: 'tr',
          components: Array.from({ length: cols }, (_, i) => ({
            type: 'table cell', tagName: 'th',
            content: `Columna ${i+1}`,
            editable: true,
            style: 'border: 1px solid black; padding: 8px;',
            classes: ['Table','cell']
          }))
        }]
      },
      {
        tagName: 'tbody',
        components: Array.from({ length: rows }, () => ({
          tagName: 'tr',
          components: Array.from({ length: cols }, () => ({
            type: 'table cell', tagName: 'td',
            content: 'Dato',
            editable: true,
            style: 'border: 1px solid black; padding: 8px;',
            classes: ['Table','cell']
          }))
        }))
      }
    ]
  };

  if (sel && sel.get('droppable')) //si el item seleccionado es un contenedor se añade la tabla dentro de este
  {
    sel.append(cfg); 
  } 
  else //si no se añade la tabla al wrapper
  {
    w.append(cfg);
  } 
}