from flask import Flask, request, send_file, jsonify
from weasyprint import HTML
import io

# Mantienes el static_folder y static_url_path original
app = Flask(__name__, static_folder='designer', static_url_path='')

# Ruta original para servir tu interfaz GrapesJS
@app.route('/')
def index():
    return app.send_static_file('index.html')

# Ruta adicional para generar PDF usando WeasyPrint
@app.route('/generar-pdf-desde-archivo/', methods=['POST'])
def generar_pdf_desde_archivo():
    datos = request.get_json()
    html_recibido = datos.get('html', '')

    try:
        pdf = HTML(string=html_recibido).write_pdf()

        return send_file(
            io.BytesIO(pdf),
            mimetype='application/pdf',
            as_attachment=True,
            download_name='factura.pdf'
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)
