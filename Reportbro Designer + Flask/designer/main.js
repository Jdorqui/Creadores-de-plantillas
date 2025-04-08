let designer;

//inicializa el diseñador ReportBro
$(document).ready(function () {
designer = new ReportBro(document.getElementById('reportbro'), {
  language: 'en',
  showSaveButton: true
});

//exporta el diseño a json
$('#export-json').on('click', function () {
  const template = designer.getReport();
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'plantilla_reportbro.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

//carga el diseño desde un archivo json
$('#load-json').on('click', function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function () {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const json = JSON.parse(e.target.result);
        designer.load(json);
      } catch (err) {
        alert('Error leyendo el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

//carga el diseño a partir de un archivo html utilizando la funcion convertHTMLToReportBroJSON (definida en htmlToJson.js)
$('#load-html').on('click', function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html';
  input.onchange = function () {
    const file = input.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const htmlContent = e.target.result;
        let plantillaJSON = convertHTMLToReportBroJSON(htmlContent);
        plantillaJSON = validateTemplate(plantillaJSON);
        designer.load(plantillaJSON);
      } catch (err) {
        alert("Error cargando plantilla generada: " + err.message);
        console.error(err);
      }
    };
    
    reader.readAsText(file);
  };
  input.click();
});

//exporta el diseño a HTML
$('#export-html').on('click', function () {
  const template = designer.getReport();
  const doc = document.implementation.createHTMLDocument('Plantilla ReportBro');
  const body = doc.body;
  const px = v => `${v}px`;
  const substituteVars = txt => txt ? txt.replace(/\$\{(\w+)\}/g, (_, v) => v === 'page_number' ? '1' : 'valor') : '';
  const style = doc.createElement('style');
  
  //estilos para la impresion
  style.textContent = `
    @page { size: A4; margin: 1cm; }
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 0; padding: 0; }
    header, footer, main { width: 100%; position: relative; }
    .page { width: 210mm; height: 297mm; margin: auto; position: relative; page-break-after: always; border: 1px solid #000; }
  `;
  doc.head.appendChild(style);
  
  const page = document.createElement('div');
  const header = document.createElement('header');
  const main = document.createElement('main');
  const footer = document.createElement('footer');

  page.className = 'page';
  page.appendChild(header);
  page.appendChild(main);
  page.appendChild(footer);

  //estilos para los contenedores
  const handlers = {
    section: el => {
      const sec = document.createElement('div');
      sec.style.cssText = `position: absolute; left:${px(el.x)}; top:${px(el.y)}; width:${px(el.width)}; height:${px(el.height)}; box-sizing: border-box;`;
      sec.dataset.sectionId = el.id;
      return sec;
    },
    text: el => {
      const div = document.createElement('div');
      div.innerText = substituteVars(el.content);
      div.style.cssText = `position:absolute;width:${px(el.width)};height:${px(el.height)};left:${px(el.x)};top:${px(el.y)};` +
        `font-size:${el.fontSize || 10}pt;${el.bold ? 'font-weight:bold;' : ''}${el.italic ? 'font-style:italic;' : ''}${el.underline ? 'text-decoration:underline;' : ''}text-align:${el.align || 'left'};white-space:pre-wrap;overflow:hidden;box-sizing:border-box;`;
      return div;
    },
    image: el => {
      const img = document.createElement('img');
      img.src = el.image;
      img.style.cssText = `position:absolute;left:${px(el.x)};top:${px(el.y)};width:${px(el.width)};height:${px(el.height)};object-fit:contain;`;
      return img;
    },
    table: el => {
      const table = document.createElement('table');
      table.style.cssText = `position:absolute;left:${px(el.x)};top:${px(el.y)};width:${px(el.width)};height:${px(el.height)};border-collapse:collapse;font-size:10pt;box-sizing:border-box;`;
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');
      (el.headerData?.columnData || []).forEach(h => {
        const th = document.createElement('th');
        th.innerText = substituteVars(h.content);
        th.style.cssText = 'border:1px solid black;padding:2px;';
        tr.appendChild(th);
      });
      if (tr.children.length > 0) thead.appendChild(tr);
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      (el.contentDataRows || []).forEach(row => {
        const tr = document.createElement('tr');
        row.columnData.forEach(c => {
          const td = document.createElement('td');
          td.innerText = substituteVars(c.content);
          td.style.cssText = 'border:1px solid black;padding:2px;';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      return table;
    },
    bar_code: el => {
      const div = document.createElement('div');
      div.innerText = '[Código QR]';
      div.style.cssText = `position:absolute;left:${px(el.x)};top:${px(el.y)};width:${px(el.width)};height:${px(el.height)};border:1px dashed gray;text-align:center;line-height:${px(el.height)}`;
      return div;
    }
  };

  const sectionMap = new Map();
  
  //se almacenan las secciones en un sectionmap
  template.docElements.forEach(el => {
    if (el.elementType === 'section') {
      const rendered = handlers.section(el);
      sectionMap.set(el.id, rendered);
      const container = el.containerId === '0_header' ? header : el.containerId === '0_footer' ? footer : main;
      if (el.parentId && sectionMap.has(el.parentId)) {
        sectionMap.get(el.parentId).appendChild(rendered);
      } else {
        container.appendChild(rendered);
      }
    }
  });

  //se renderizan los elementos de la plantilla
  template.docElements.forEach(el => {
    if (el.elementType === 'section') return;
    const handler = handlers[el.elementType];
    if (!handler) return;
    const rendered = handler(el);
    if (el.parentId && sectionMap.has(el.parentId)) {
      sectionMap.get(el.parentId).appendChild(rendered);
    } else {
      const container = el.containerId === '0_header' ? header : el.containerId === '0_footer' ? footer : main;
      container.appendChild(rendered);
    }
  });

  //se renderizan los contenedores de la plantilla
  body.appendChild(page); 
  const finalBlob = new Blob([doc.documentElement.outerHTML], { type: 'text/html' }); 
  const url = URL.createObjectURL(finalBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'plantilla_reportbro.html';
  a.click();
  URL.revokeObjectURL(url);
  });
});