//inicializa grapejs
var editor = grapesjs.init({
  container: '#gjs',
  fromElement: true, //carga el contenido html en el contenedor
  height: '100%',
  storageManager: { type: 'none' } //desactiva el almacenamiento local 
});

//input file y FileReader para cargar el contenido del html
document.getElementById('file-input').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(event) {
    var htmlContent = event.target.result;
    editor.setComponents(htmlContent); //se carga el contenido html en grapejs
  };
  reader.readAsText(file);
});

//obtiene el contenido html y css y lo exporta en la consola
document.getElementById('export-html').addEventListener('click', function() {
  //obtiene el contenido html y css
  var htmlExport = editor.getHtml();
  var cssExport  = editor.getCss();

  //se crea el html final con el css exportado y el formato deseado
  var finalHtml = `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Template Exportado</title>
        <style>
          ${cssExport}
        </style>
      </head>
      <body>
        ${htmlExport}
      </body>
    </html>
  `;

  //crea un Blob y genera un link de descarga
  var blob = new Blob([finalHtml], { type: "text/html" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = "template.html";
  link.click();
  URL.revokeObjectURL(url);
})

//elementos <table>, <td> y <div> editables
editor.on('load', () => {
  const doc = editor.Canvas.getDocument();
  const editableEls = doc.querySelectorAll('table, td, div');
  editableEls.forEach(el => el.setAttribute('contenteditable', 'true'));
});