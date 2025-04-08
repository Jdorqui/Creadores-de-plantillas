//preprocesar el html y transforma las etiquetas de Django a texto
function preprocessHTML(htmlString) {
  htmlString = htmlString.replace(/{%\s*([\s\S]*?)\s*%}/g, "[DjangoBlock: $1]"); //reemplaza bloques: {% ... %} -> [DjangoBlock: ...]
  htmlString = htmlString.replace(/{{\s*([\s\S]*?)\s*}}/g, "[DjangoVar: $1]"); //reemplaza variables: {{ ... }} -> [DjangoVar: $1]
  return htmlString;
}

//convertir html a json compatible con ReportBro
function convertHTMLToReportBroJSON(htmlString, options = {}) {
  htmlString = preprocessHTML(htmlString); // Preprocesa el HTML para conservar las etiquetas Django como texto

  //etiquetas permitidas
  const defaultAllowedTags = ['p', 'span', 'td', 'th', 'div']; 
  const allowedTags = options.allowedTags || defaultAllowedTags;
  
  //parsear el html y crear documento dom
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  
  //selecciona los nodos permitidos
  const nodes = doc.body.querySelectorAll(allowedTags.join(','));
  const docElements = [];
  let currentY = 0;
  
  nodes.forEach(node => {
    const content = node.textContent ? node.textContent.trim() : "";
    if (!content) return; //ignora los nodos vacios

    //detecta el contenedor si el nodo esta dentro de <header>, <footer> o <main>
    let containerId = '0_content';
    if (node.closest('header')) {
      containerId = '0_header';
    } else if (node.closest('footer')) {
      containerId = '0_footer';
    } else if (node.closest('main')) {
      containerId = '0_content';
    }
    
    //intenta obtener estilos computados al nodo, el nodo es el elemento padre y que si tiene estilos computados significa que es un elemento de texto
    let computedStyle = {};
    try {
      computedStyle = window.getComputedStyle(node);
    } catch (err) {
      //si da error se asigna un objeto vacio
    }
    
    //determina estilos basicos
    const bold = (node.tagName.toLowerCase() === 'th') || (computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) >= 700);
    const italic = computedStyle.fontStyle === 'italic';
    const underline = computedStyle.textDecorationLine ? computedStyle.textDecorationLine.includes('underline') : false;
    const fontSize = parseInt(computedStyle.fontSize) || 10;
    
    //crea el elemento de texto en el formato de reportbro
    docElements.push({
      id: Math.random().toString(36).substring(2, 9),
      elementType: 'text',
      x: 0,
      y: currentY,
      width: 200,
      height: 10,
      content: content,
      bold: bold,
      italic: italic,
      underline: underline,
      fontSize: fontSize,
      containerId: containerId,
      childElements: [],
      align: computedStyle.textAlign || 'left',
      parentId: null
    });
    
    currentY += 12; //se incrementa para el siguiente elemento
  });
  
  //construccion de la plantilla para reportbro
  const plantilla = {
    layout: options.layout || "A4_PORTRAIT",
    paperFormat: options.paperFormat || "A4",
    paperOrientation: options.paperOrientation || "PORTRAIT",
    version: 1,
    pageMargins: options.pageMargins || { top: 20, bottom: 20, left: 20, right: 20 },
    containers: options.containers || [
      { id: "0_header", height: 100, elements: [] },
      { id: "0_content", height: 800, elements: [] },
      { id: "0_footer", height: 100, elements: [] }
    ],
    docElements: docElements,
    script: "",
    parameters: [],
    parameterValues: {},
    reportParameters: [],
    variables: [],
    expressions: [],
    data: [],
    groups: [],
    customFonts: [],
    styles: [],
    styleSettings: {
      font: "Arial",
      fontSize: 10,
      bold: false,
      italic: false,
      underline: false
    }
  };
  
  return plantilla;
}

//valida la plantilla para reportbro, si no existe alguna propiedad se asigna un array vacio
function validateTemplate(template) {
  const requiredArrays = ['docElements', 'parameters', 'reportParameters', 'variables', 'expressions', 'containers', 'data', 'groups', 'customFonts', 'styles'];
  requiredArrays.forEach(prop => {
    if (!Array.isArray(template[prop])) {
      template[prop] = [];
    }
  });
  return template;
}