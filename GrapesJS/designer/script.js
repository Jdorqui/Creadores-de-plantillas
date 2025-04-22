const GRID_SIZE = 20;
let mostrarCuadricula = true;

//inicializacion del editor grapejs
const editor = grapesjs.init({
  container: '#gjs',
  fromElement: false,
  height: '100%',
  storageManager: { type: 'none' },
  dragMode: 'absolute'
});

//inicializacion de los paneles y configuracion
editor.on('load', () => {
  registerCustomTypes();
  initializeCanvas();
  setupWrapper();
  setupComponentHandlers();
  setupCustomPanels();
});

//registra los tipos personalizados para el editor
function registerCustomTypes() {
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

  //tipo personalizado para celdas de tabla (table cell)
  //se añade tabindex para que sean focusables y asi puedan disparar el evento blur.
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
        //para que pueda recibir foco se añade tabindex
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

//inicializa el canvas y aplica la cuadricula si es necesario.
function initializeCanvas() {
  if (mostrarCuadricula) applyGrid();
}

//configura el wrapper principal: lo hace droppable y agrega comportamientos de arrastre y edicion a sus hijos.
function setupWrapper() {
  const wrapper = editor.DomComponents.getWrapper();
  wrapper.set({
    droppable: true,
    style: { position: 'relative', minHeight: '1500px' }
  });
  //se recorre cada componente para habilitar arrastre y edicion
  wrapper.find('*').forEach(comp => {
    makeDraggable(comp);
    makeEditable(comp);
  });
}

//configura los manejadores de eventos para componentes (al agregarlos o arrastrarlos).
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

//aplica la cuadricula en el canvas mediante background-image.
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

//elimina la cuadricula.
function hideGrid() {
  editor.Canvas.getBody().style.backgroundImage = 'none';
}

//alterna la visibilidad de la cuadricula.
const toggleGrid = () => {
  mostrarCuadricula = !mostrarCuadricula;
  mostrarCuadricula ? applyGrid() : hideGrid();
};

//hace draggable divs textos imagenes y tablas.
function makeDraggable(model) {
  const tag = model.get('tagName');
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

//permite la edicion de los componentes td, th, div y text, table cell
function makeEditable(model) {
  const tag = model.get('tagName');
  // Incluye nuestros tipos personalizados: "Text", "Div" y "table cell"
  if (['td', 'th', 'div', 'text', 'Text', 'Div', 'table cell'].includes(tag)) {
    model.set('editable', true);
  }
}

//botones
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
      {
        id: 'generar-pdf',
        className: 'fa fa-file-pdf-o',
        command: 'generar-pdf',
        attributes: { title: 'Generar PDF' }
      },
    ]
  });
}

//cargar html
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

//exportacion de html y css
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

//añade un componente tipo text.
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

//añade un componente tipo imagen.
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

//añade un componente tipo div.
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

//selector de las tablas
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

//inserta la tabla en el canvas con el tamaño y cantidad de filas y columnas seleccionadas.
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

//tablas y celdas
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

//devuelve la fila y tabla padre para una celda seleccionada.
function getParentRowAndTable(cellModel) {
  const row = cellModel.parent();
  let table = cellModel;
  while (table && table.get('tagName') !== 'table') {
    table = table.parent();
  }
  return { row, table };
}

//botones para añadir o eliminar filas o columnas.
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

//weasyprint button function para generar pdf
editor.Commands.add('generar-pdf', {
  run(editor) {
      const inputArchivo = document.createElement('input');
      inputArchivo.type = 'file';
      inputArchivo.accept = '.html';
      inputArchivo.style.display = 'none';

      inputArchivo.onchange = event => {
          const archivo = event.target.files[0];

          if (archivo) {
              const lector = new FileReader();
              lector.onload = function(e) {
                  const contenidoHTML = e.target.result;

                  fetch('/generar-pdf-desde-archivo/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({html: contenidoHTML})
                  })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { throw new Error(text) });
                    }
                    return response.blob();
                })
                .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const enlace = document.createElement('a');
                    enlace.href = url;
                    enlace.download = 'factura.pdf';
                    document.body.appendChild(enlace);
                    enlace.click();
                    enlace.remove();
                })
                .catch(error => {
                    console.error('Error del servidor:', error.message);
                    alert("Error del servidor: " + error.message);
                });
              };
              lector.readAsText(archivo);
          }
      };

      document.body.appendChild(inputArchivo);
      inputArchivo.click();
      document.body.removeChild(inputArchivo);
  }
});