from flask import Flask, request, send_file, jsonify
from weasyprint import HTML
import io

app = Flask(__name__, static_folder='designer', static_url_path='') #static_folder y static_url_path

#ruta original para la interfaz grapejs
@app.route('/')
def index():
    return app.send_static_file('index.html')

#cambia la ruta a /generar-pdf-desde-archivo/ para evitar conflictos con la ruta de GrapesJS
@app.route('/generar-pdf-desde-archivo/', methods=['POST'])
#funcion para generar el pdf con el html recibido usando WeasyPrint
def generar_pdf_desde_archivo(): 
    datos = request.get_json()
    html_recibido = datos.get('html', '')

    try:
        #generar el pdf a partir del html recibido usando WeasyPrint
        pdf = HTML(string=html_recibido).write_pdf() 

        return send_file( #descarga el pdf generado
            io.BytesIO(pdf),
            mimetype='application/pdf',
            as_attachment=True,
            download_name='factura.pdf'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)