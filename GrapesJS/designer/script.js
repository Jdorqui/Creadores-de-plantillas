//inicializa grapejs
var editor = grapesjs.init({
    container : '#gjs',
    fromElement: true, // Carga el contenido HTML que ya esté en el contenedor
    height: '100%',
    storageManager: { type: 'none' } // Desactivamos el almacenamiento automático
  });

  //input file y FileReader para cargar el contenido del html
  document.getElementById('file-input').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(event) {
      var htmlContent = event.target.result;
      // Cargamos el HTML importado en el editor
      editor.setComponents(htmlContent);
    };
    reader.readAsText(file);
  });

  //obtiene el contenido html y css y lo exporta en la consola
  document.getElementById('export-html').addEventListener('click', function() {
    // Obtiene el contenido HTML y CSS del editor
    var htmlExport = editor.getHtml();
    var cssExport  = editor.getCss();

    // Combina el HTML y el CSS en un solo documento
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

    //console.log("HTML Exportado:", finalHtml);

    // Crea un Blob y genera un link de descarga
    var blob = new Blob([finalHtml], { type: "text/html" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "template.html";
    // Se simula el click para descargar el archivo
    link.click();

    // Libera la URL creada
    URL.revokeObjectURL(url);

    // Opcional: muestra una alerta
    alert("Archivo HTML descargado.");})