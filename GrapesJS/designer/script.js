// Constantes globales
const GRID_SIZE = 20;
let mostrarCuadricula = true;

// Inicialización del editor de GrapesJS
const editor = grapesjs.init({
  container: '#gjs',
  fromElement: false,
  height: '100%',
  storageManager: { type: 'none' },
  dragMode: 'absolute'
});

// ================================
// INICIALIZACIÓN Y CONFIGURACIÓN
// ================================
editor.on('load', () => {
  registerCustomTypes(); // Registra los tipos personalizados que permiten la edición inline
  initializeCanvas();
  setupWrapper();
  setupComponentHandlers();
  setupCustomPanels();
});

// Registro de tipos personalizados para permitir la edición (doble clic y blur)
// Se incluye la actualización del modelo cuando se dispara el evento blur.
function registerCustomTypes() {
  // Tipo personalizado para texto editable
  editor.DomComponents.addType('Text', {
    model: {
      defaults: {
        editable: true,
        droppable: true,
        content: 'Texto editable',
        style: 'font-size:16px; width:200px; height:auto;'
      }
    },
    view: {
      events: {
        dblclick: 'onDblClick',
        blur: 'onBlur'
      },
      onDblClick(e) {
        e.stopPropagation();
        this.el.setAttribute('contenteditable', 'true');
        this.startEditing();
      },
      onBlur(e) {
        const newContent = this.el.innerHTML;
        this.model.set('content', newContent);
        this.el.removeAttribute('contenteditable');
        this.finishEditing();
      }
    }
  });

  // Tipo personalizado para div editable
  editor.DomComponents.addType('Div', {
    model: {
      defaults: {
        editable: true,
        droppable: true,
        content: 'Caja',
        style: 'padding:10px; border:1px solid #000; width:200px; height:100px;'
      }
    },
    view: {
      events: {
        dblclick: 'onDblClick',
        blur: 'onBlur'
      },
      onDblClick(e) {
        e.stopPropagation();
        this.el.setAttribute('contenteditable', 'true');
        this.startEditing();
      },
      onBlur(e) {
        const newContent = this.el.innerHTML;
        this.model.set('content', newContent);
        this.el.removeAttribute('contenteditable');
        this.finishEditing();
      }
    }
  });

  // Tipo personalizado para celdas de tabla (table cell)
  // Se añade tabindex para que sean focusables y así puedan disparar el evento blur.
  editor.DomComponents.addType('table cell', {
    model: {
      defaults: {
        editable: true,
        droppable: false,
        content: 'Dato',
        style: 'border: 1px solid black; padding: 8px;'
      }
    },
    view: {
      events: {
        dblclick: 'onDblClick',
        blur: 'onBlur'
      },
      onDblClick(e) {
        e.stopPropagation();
        // Para que pueda recibir foco se añade tabindex
        this.el.setAttribute('tabindex', '0');
        this.el.focus();
        this.el.setAttribute('contenteditable', 'true');
        this.startEditing();
      },
      onBlur(e) {
        const newContent = this.el.innerHTML;
        this.model.set('content', newContent);
        this.el.removeAttribute('contenteditable');
        this.el.removeAttribute('tabindex');
        this.finishEditing();
      }
    }
  });
}

// Configura el canvas inicial aplicando la cuadrícula si corresponde.
function initializeCanvas() {
  if (mostrarCuadricula) applyGrid();
}

// Configura el wrapper principal: lo hace droppable y agrega comportamientos de arrastre y edición a sus hijos.
function setupWrapper() {
  const wrapper = editor.DomComponents.getWrapper();
  wrapper.set({
    droppable: true,
    style: { position: 'relative', minHeight: '1500px' }
  });
  // Se recorre cada componente existente para habilitar arrastre y edición
  wrapper.find('*').forEach(comp => {
    makeDraggable(comp);
    makeEditable(comp);
  });
}

// Configura los manejadores de eventos para componentes (al agregarlos o arrastrarlos).
function setupComponentHandlers() {
  editor.on('component:add', model => {
    makeDraggable(model);
    makeEditable(model);
  });

  editor.on('component:drag:end', model => {
    if (typeof model.getStyle !== 'function') return;
    const style = model.getStyle();
    if (style?.left && style?.top) {
      const snapLeft = Math.round(parseInt(style.left) / GRID_SIZE) * GRID_SIZE;
      const snapTop = Math.round(parseInt(style.top) / GRID_SIZE) * GRID_SIZE;
      model.setStyle({ ...style, left: snapLeft + 'px', top: snapTop + 'px' });
    }
  });
}

// ================================
// FUNCIONES DE COMPORTAMIENTO GENERAL
// ================================

// Aplica la cuadrícula en el canvas mediante background-image.
function applyGrid() {
  const canvasBody = editor.Canvas.getBody();
  canvasBody.style.backgroundImage = `
    linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)
  `;
  canvasBody.style.backgroundSize = `${GRID_SIZE}px ${GRID_SIZE}px`;
  canvasBody.style.backgroundPosition = '0 0';
  canvasBody.style.position = 'relative';
}

// Elimina la cuadrícula del canvas.
function hideGrid() {
  editor.Canvas.getBody().style.backgroundImage = 'none';
}

// Alterna la visibilidad de la cuadrícula.
const toggleGrid = () => {
  mostrarCuadricula = !mostrarCuadricula;
  mostrarCuadricula ? applyGrid() : hideGrid();
};

// Establece la capacidad de arrastre en ciertos elementos.
function makeDraggable(model) {
  const tag = model.get('tagName');
  // Se verifica para ciertos elementos y nuestros tipos personalizados.
  if (['table', 'div', 'img'].includes(tag)) {
    model.set({
      draggable: true,
      droppable: ['div', 'text', 'img', 'table'],
      resizable: {
        tl: 1, tr: 1, bl: 1, br: 1,
        keyWidth: 'width',
        keyHeight: 'height',
        currentUnit: 'px'
      }
    });
  } else {
    model.set({ draggable: false });
  }
}

// Permite la edición de componentes que lo requieran.
function makeEditable(model) {
  const tag = model.get('tagName');
  // Incluye nuestros tipos personalizados: "Text", "Div" y "table cell"
  if (['td', 'th', 'div', 'text', 'Text', 'Div', 'table cell'].includes(tag)) {
    model.set('editable', true);
  }
}

// ================================
// PANEL PERSONALIZADO Y COMANDOS
// ================================

// Configura el panel de botones personalizados.
function setupCustomPanels() {
  editor.Panels.addPanel({
    id: 'custom-buttons',
    buttons: [
      {
        id: 'file-button',
        label: '📂 Cargar HTML',
        className: 'fa custom-button',
        command: openFileCommand
      },
      {
        id: 'export-button',
        label: '💾 Exportar HTML',
        className: 'fa custom-button',
        command: exportHTMLCommand
      },
      {
        id: 'add-text',
        className: 'fa',
        label: '🅰️ Texto',
        command: addTextComponent
      },
      {
        id: 'add-image',
        className: 'fa',
        label: '🖼️ Imagen',
        command: addImageComponent
      },
      {
        id: 'add-div',
        className: 'fa',
        label: '🔲 Div',
        command: addDivComponent
      },
      {
        id: 'add-table',
        className: 'fa',
        label: '📋 Tabla',
        command(editor, sender) {
          openTableSelector(sender);
        }
      },
      {
        id: 'toggle-grid',
        label: '🧲 Cuadrícula',
        className: 'fa custom-button',
        command: toggleGrid
      },
      {
        id: 'delete-element',
        className: 'fa',
        label: '🗑️ Eliminar',
        command() {
          const selected = editor.getSelected();
          if (selected) selected.remove();
        }
      },
    ]
  });
}

// Abre el selector de archivo para cargar HTML.
function openFileCommand() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html';
  input.style.display = 'none';
  input.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      editor.setComponents(event.target.result);
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

// Exporta el HTML y CSS generados en un archivo.
function exportHTMLCommand() {
  const htmlExport = editor.getHtml();
  const cssExport = editor.getCss();
  const finalHtml = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Template Exportado</title>
        <style>${cssExport}</style>
      </head>
      <body>${htmlExport}</body>
    </html>
  `;
  const blob = new Blob([finalHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template.html";
  link.click();
  URL.revokeObjectURL(url);
}

// Agrega un componente de texto utilizando el tipo "Text" personalizado.
function addTextComponent() {
  const selected = editor.getSelected();
  const textComponent = {
    type: 'Text',
    content: 'Texto editable',
    style: 'font-size:16px; width:200px; height:auto;'
  };

  if (selected && selected.get('tagName') === 'div') {
    selected.append(textComponent);
  } else {
    editor.DomComponents.getWrapper().append({
      ...textComponent,
      style: 'position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)'
    });
  }
}

// Agrega un componente de imagen utilizando el tipo "image" predeterminado.
function addImageComponent() {
  const selected = editor.getSelected();
  const imageComponent = {
    type: 'image',
    attributes: { src: 'https://placehold.co/100x100' },
    style: 'width:200px; height:auto;'
  };

  if (selected && selected.get('droppable')) {
    selected.append(imageComponent);
  } else {
    editor.DomComponents.getWrapper().append({
      ...imageComponent,
      style: 'position:absolute; left:50%; top:50%; transform:translate(-50%, -50%)'
    });
  }
}

// Agrega un componente de div utilizando el tipo "Div" personalizado.
function addDivComponent() {
  const selected = editor.getSelected();
  const divComponent = {
    type: 'Div',
    content: 'Caja',
    style: 'padding:10px; border:1px solid #000; width:200px; height:100px;'
  };

  if (selected && selected.get('droppable')) {
    selected.append(divComponent);
  } else {
    editor.DomComponents.getWrapper().append({
      ...divComponent,
      style: 'padding:10px; border:1px solid #000; position:absolute; left:50%; top:50%; transform:translate(-50%, -50%)'
    });
  }
}

// Abre el selector para insertar una tabla mediante una interfaz de cuadrícula.
function openTableSelector(sender) {
  const MAX_COLS = 10;
  const MAX_ROWS = 10;
  const grid = document.getElementById('grid-container');
  const label = document.getElementById('grid-label');
  const selector = document.getElementById('selector-tabla');

  grid.innerHTML = '';
  selector.style.display = 'block';
  grid.style.gridTemplateColumns = `repeat(${MAX_COLS}, 20px)`;

  let selectedCols = 0;
  let selectedRows = 0;

  for (let r = 1; r <= MAX_ROWS; r++) {
    for (let c = 1; c <= MAX_COLS; c++) {
      const cell = document.createElement('div');
      cell.style.border = '1px solid #ccc';
      cell.style.background = '#f0f0f0';
      cell.style.cursor = 'pointer';
      cell.dataset.row = r;
      cell.dataset.col = c;
      grid.appendChild(cell);

      cell.addEventListener('mouseenter', () => {
        selectedRows = r;
        selectedCols = c;
        label.textContent = `${c}x${r}`;
        grid.querySelectorAll('div').forEach(box => {
          const br = +box.dataset.row;
          const bc = +box.dataset.col;
          box.style.background = (br <= r && bc <= c) ? '#3399ff' : '#f0f0f0';
        });
      });

      cell.addEventListener('click', () => {
        insertTable(selectedCols, selectedRows);
        selector.style.display = 'none';
      });
    }
  }

  const btn = sender.el;
  const rect = btn.getBoundingClientRect();
  selector.style.left = `${rect.left + window.scrollX}px`;
  selector.style.top = `${rect.bottom + window.scrollY + 5}px`;

  const onClickOutside = e => {
    if (!selector.contains(e.target)) {
      selector.style.display = 'none';
      document.removeEventListener('mousedown', onClickOutside);
    }
  };
  setTimeout(() => {
    document.addEventListener('mousedown', onClickOutside);
  }, 0);
}

// Inserta la tabla en el canvas con celdas editables utilizando los tipos personalizados.
function insertTable(cols, rows) {
  const selected = editor.getSelected();
  const wrapper = editor.DomComponents.getWrapper();

  const tableComponent = {
    type: 'table',
    tagName: 'table',
    classes: ['Table'],
    style: 'width:auto; border-collapse: collapse; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);',
    components: [
      {
        tagName: 'thead',
        components: [
          {
            tagName: 'tr',
            components: Array.from({ length: cols }, (_, i) => ({
              type: 'table cell',
              tagName: 'th',
              content: `Columna ${i + 1}`,
              editable: true,
              style: 'border: 1px solid black; padding: 8px;',
              classes: ['Table', 'cell']
            }))
          }
        ]
      },
      {
        tagName: 'tbody',
        components: Array.from({ length: rows }, () => ({
          tagName: 'tr',
          components: Array.from({ length: cols }, () => ({
            type: 'table cell',
            tagName: 'td',
            content: 'Dato',
            editable: true,
            style: 'border: 1px solid black; padding: 8px;',
            classes: ['Table', 'cell']
          }))
        }))
      }
    ]
  };

  if (selected && selected.get('droppable')) {
    selected.append(tableComponent);
  } else {
    wrapper.append(tableComponent);
  }
}

// ================================
// MENÚ CONTEXTUAL PARA TABLAS
// ================================

const tableContextMenu = document.getElementById('tabla-menu-contextual');
let selectedCell = null;

editor.on('component:selected', model => {
  const tag = model.get('tagName');
  if (!['td', 'th'].includes(tag)) {
    tableContextMenu.style.display = 'none';
    selectedCell = null;
    return;
  }
  selectedCell = model;
  const el = model.view.el;
  const rect = el.getBoundingClientRect();
  const canvasRect = editor.Canvas.getFrameEl().getBoundingClientRect();
  tableContextMenu.style.left = `${rect.left + canvasRect.left}px`;
  tableContextMenu.style.top = `${rect.bottom + canvasRect.top + 5}px`;
  tableContextMenu.style.display = 'block';
});

// Oculta el menú contextual si se hace clic fuera de una celda.
editor.on('canvas:click', e => {
  if (!e.data || !e.data.model || !['td', 'th'].includes(e.data.model.get('tagName'))) {
    tableContextMenu.style.display = 'none';
    selectedCell = null;
  }
});

// Retorna la fila y la tabla padre para una celda seleccionada.
function getParentRowAndTable(cellModel) {
  const row = cellModel.parent();
  let table = cellModel;
  while (table && table.get('tagName') !== 'table') {
    table = table.parent();
  }
  return { row, table };
}

// Botones del menú contextual para agregar/eliminar filas o columnas.
document.getElementById('add-row-btn').onclick = () => {
  if (!selectedCell) return;
  const { row } = getParentRowAndTable(selectedCell);
  const colCount = row.components().length;
  row.parent().append({
    tagName: 'tr',
    components: Array.from({ length: colCount }, () => ({
      type: 'table cell',
      tagName: 'td',
      content: 'Nueva celda',
      editable: true,
      style: 'padding: 8px; border: 1px solid black;',
      classes: ['Table', 'cell']
    }))
  });
  tableContextMenu.style.display = 'none';
};

document.getElementById('add-col-btn').onclick = () => {
  if (!selectedCell) return;
  const { table } = getParentRowAndTable(selectedCell);
  table.find('tr').forEach(row => {
    row.append({
      type: 'table cell',
      tagName: 'td',
      content: 'Nueva celda',
      editable: true,
      style: 'padding: 8px; border: 1px solid black;',
      classes: ['Table', 'cell']
    });
  });
  tableContextMenu.style.display = 'none';
};

document.getElementById('del-row-btn').onclick = () => {
  if (!selectedCell) return;
  selectedCell.parent().remove();
  tableContextMenu.style.display = 'none';
};

document.getElementById('del-col-btn').onclick = () => {
  if (!selectedCell) return;
  const colIndex = selectedCell.index();
  const { table } = getParentRowAndTable(selectedCell);
  table.find('tr').forEach(row => {
    const cells = row.components();
    if (cells.at(colIndex)) {
      cells.at(colIndex).remove();
    }
  });
  tableContextMenu.style.display = 'none';
};