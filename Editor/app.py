import os
from flask import Flask, send_file, request, jsonify, send_from_directory
from weasyprint import HTML
import io
from werkzeug.utils import secure_filename
import json

app = Flask(__name__, static_folder='designer', static_url_path='')

# 1) Sirve el editor
@app.route('/')
def index():
    return app.send_static_file('index.html')

# 2) Genera PDF recibiendo el HTML tal cual
@app.route('/generar-pdf-desde-archivo/', methods=['POST'])
def generar_pdf():
    data = request.get_json(silent=True) or {}
    html = data.get('html', '')
    try:
        pdf = HTML(string=html).write_pdf()
        return send_file(
            io.BytesIO(pdf),
            mimetype='application/pdf',
            as_attachment=True,
            download_name='factura.pdf'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/subir-imagen/', methods=['POST'])
def subir_imagen():
    if 'imagen' not in request.files:
        return jsonify({'error': 'No file'}), 400
    f = request.files['imagen']
    if not f.filename:
        return jsonify({'error': 'No filename'}), 400
    filename = secure_filename(f.filename)
    path = os.path.join(UPLOAD_FOLDER, filename)
    f.save(path)
    url = '/uploads/' + filename
    return jsonify({'url': url})

# ------------------- PLANTILLAS ------------------------
PLANTILLAS_FOLDER = os.path.join(app.static_folder, 'plantillas')
os.makedirs(PLANTILLAS_FOLDER, exist_ok=True)

@app.route('/guardar-plantilla/', methods=['POST'])
def guardar_plantilla():
    data = request.get_json()
    nombre = data.get('nombre', '').strip()
    contenido = data.get('contenido', {})
    if not nombre or not contenido:
        return jsonify({'error': 'Nombre o contenido vacío'}), 400
    safe_name = "".join([c if c.isalnum() or c in ('_', '-') else '_' for c in nombre])
    file_path = os.path.join(PLANTILLAS_FOLDER, safe_name + '.json')
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(contenido, f, indent=2, ensure_ascii=False)
    return jsonify({'ok': True})

@app.route('/listar-plantillas/')
def listar_plantillas():
    archivos = []
    for fname in os.listdir(PLANTILLAS_FOLDER):
        if fname.endswith('.json'):
            archivos.append(fname[:-5]) # sin extensión
    return jsonify({'plantillas': archivos})

@app.route('/plantillas/<nombre>')
def cargar_plantilla(nombre):
    safe_name = "".join([c if c.isalnum() or c in ('_', '-') else '_' for c in nombre])
    file_path = os.path.join(PLANTILLAS_FOLDER, safe_name + '.json')
    if not os.path.exists(file_path):
        return jsonify({'error': 'No encontrada'}), 404
    with open(file_path, encoding='utf-8') as f:
        contenido = json.load(f)
    return jsonify(contenido)
# ------------------------------------------------------

if __name__ == '__main__':
    app.run(port=5002, debug=True)
