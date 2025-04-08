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
    var htmlExport = editor.getHtml();
    var cssExport  = editor.getCss();
    console.log("HTML Exportado:", htmlExport);
    console.log("CSS Exportado:", cssExport);
    // Aquí podrías, por ejemplo, mostrarlo en un modal o copiarlo al portapapeles.
    alert("HTML y CSS exportados en la consola");
  });