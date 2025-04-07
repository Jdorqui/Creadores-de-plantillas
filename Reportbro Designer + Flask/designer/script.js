let designer;

$(document).ready(function () {
  // Inicializa el diseñador ReportBro
  designer = new ReportBro(document.getElementById('reportbro'), {
    language: 'en',
    showSaveButton: true
  });

  // Exporta el diseño a JSON
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

  // Carga el diseño desde un archivo JSON
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
          alert('Error leyendo JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // Carga y adapta el HTML a ReportBro (separando header, main y footer)
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
          const parser = new DOMParser();
          const doc = parser.parseFromString(e.target.result, 'text/html');

          // Extrae las secciones principales de la plantilla
          const headerEl = doc.querySelector('.header');
          const mainEl = doc.querySelector('main');
          const footerEl = doc.querySelector('footer');

          // Creamos un array de elementos para ReportBro.
          // Se usan innerHTML para conservar (al menos) parte del formato.
          const docElements = [];
          if (headerEl) {
            docElements.push({
              id: 'header_1',
              elementType: 'text',
              x: 0,
              y: 0,
              width: 600,
              height: 100,
              content: headerEl.innerHTML,
              bold: false,
              italic: false,
              underline: false,
              fontSize: 12,
              containerId: '0_header',
              childElements: []
            });
          }
          if (mainEl) {
            docElements.push({
              id: 'main_1',
              elementType: 'text',
              x: 0,
              y: 0,
              width: 600,
              height: 800,
              content: mainEl.innerHTML,
              bold: false,
              italic: false,
              underline: false,
              fontSize: 12,
              containerId: '0_content',
              childElements: []
            });
          }
          if (footerEl) {
            docElements.push({
              id: 'footer_1',
              elementType: 'text',
              x: 0,
              y: 0,
              width: 600,
              height: 100,
              content: footerEl.innerHTML,
              bold: false,
              italic: false,
              underline: false,
              fontSize: 12,
              containerId: '0_footer',
              childElements: []
            });
          }

          // Construimos la plantilla con la estructura que ReportBro espera
          const plantilla = {
            layout: "A4_PORTRAIT",
            paperFormat: "A4",
            paperOrientation: "PORTRAIT",
            version: 1,
            pageMargins: { top: 20, bottom: 20, left: 20, right: 20 },
            containers: [
              { id: "0_header", height: 100 },
              { id: "0_content", height: 800 },
              { id: "0_footer", height: 100 }
            ],
            docElements: docElements,
            script: "",
            parameters: [],
            parameterValues: {},
            reportParameters: [],
            variables: [],
            expressions: [],
            styleSettings: {
              font: "Arial",
              fontSize: 10,
              bold: false,
              italic: false,
              underline: false
            }
          };

          console.log(JSON.stringify(plantilla, null, 2));
          designer.load(plantilla);
        } catch (err) {
          alert("Error cargando plantilla generada: " + err.message);
          console.error(err);
        }
      };

      reader.readAsText(file);
    };
    input.click();
  });

  // Exporta el diseño a HTML
  $('#export-html').on('click', function () {
    const template = designer.getReport();
    const doc = document.implementation.createHTMLDocument('Plantilla ReportBro');
    const body = doc.body;

    const px = v => `${v}px`;
    const substituteVars = txt => txt ? txt.replace(/\$\{(\w+)\}/g, (_, v) => v === 'page_number' ? '1' : 'valor') : '';

    const style = doc.createElement('style');
    style.textContent = `
      @page { size: A4; margin: 1cm; }
      body { font-family: Arial, sans-serif; font-size: 10pt; margin: 0; padding: 0; }
      header, footer, main { width: 100%; position: relative; }
      .page { width: 210mm; height: 297mm; margin: auto; position: relative; page-break-after: always; border: 1px solid #000; }
    `;
    doc.head.appendChild(style);

    const page = document.createElement('div');
    page.className = 'page';

    const header = document.createElement('header');
    const main = document.createElement('main');
    const footer = document.createElement('footer');

    page.appendChild(header);
    page.appendChild(main);
    page.appendChild(footer);

    const handlers = {
      section: el => {
        const sec = document.createElement('div');
        sec.style.cssText = `position: absolute; left:${px(el.x)}; top:${px(el.y)}; width:${px(el.width)}; height:${px(el.height)}; box-sizing:border-box;`;
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
