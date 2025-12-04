#!/usr/bin/env python3
"""
Interface Web para Conversor PDF -> EPUB
"""
from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
import os
import sys
from pathlib import Path
import tempfile
import shutil

# Importar o conversor
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

from converter_final_universal import converter_pdf_universal
import PyPDF2
import fitz
from ebooklib import epub
from PIL import Image
import re
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extrair_capa(pdf_path):
    """Extrai capa como base64 para preview"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        image_list = page.get_images()

        if image_list:
            xref = image_list[0][0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            import base64
            doc.close()
            return base64.b64encode(image_bytes).decode('utf-8')

        doc.close()
        return None
    except:
        return None

def extrair_preview_metadados(pdf_path):
    """Extrai preview dos metadados sem converter"""
    try:
        with open(pdf_path, 'rb') as f:
            pdf = PyPDF2.PdfReader(f)
            total_paginas = len(pdf.pages)

            # Importar funções do conversor
            from converter_final_universal import extrair_metadados_simples

            titulo, autor = extrair_metadados_simples(pdf, pdf_path)
            capa_base64 = extrair_capa(pdf_path)

            return {
                'titulo': titulo,
                'autor': autor,
                'paginas': total_paginas,
                'capa': capa_base64,
                'sucesso': True
            }
    except Exception as e:
        return {
            'sucesso': False,
            'erro': str(e)
        }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/preview', methods=['POST'])
def preview():
    """Faz preview dos metadados sem converter"""
    if 'pdf_file' not in request.files:
        return jsonify({'sucesso': False, 'erro': 'Nenhum arquivo enviado'})

    file = request.files['pdf_file']

    if file.filename == '':
        return jsonify({'sucesso': False, 'erro': 'Nenhum arquivo selecionado'})

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(temp_path)

        preview_data = extrair_preview_metadados(temp_path)

        # Não apagar ainda, vamos precisar para conversão
        return jsonify(preview_data)

    return jsonify({'sucesso': False, 'erro': 'Formato inválido. Use PDF.'})

@app.route('/converter', methods=['POST'])
def converter():
    """Converte o PDF para EPUB"""
    if 'pdf_file' not in request.files:
        return jsonify({'sucesso': False, 'erro': 'Nenhum arquivo enviado'})

    file = request.files['pdf_file']

    if file.filename == '':
        return jsonify({'sucesso': False, 'erro': 'Nenhum arquivo selecionado'})

    if file and allowed_file(file.filename):
        original_dir = os.getcwd()
        try:
            filename = secure_filename(file.filename)
            temp_pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(temp_pdf_path)

            # Mudar para pasta temporária
            os.chdir(app.config['UPLOAD_FOLDER'])

            # Executar conversão
            with open(temp_pdf_path, 'rb') as f:
                pdf = PyPDF2.PdfReader(f)
                from converter_final_universal import extrair_metadados_simples
                titulo, autor = extrair_metadados_simples(pdf, temp_pdf_path)

            # Calcular nome do EPUB (mesma lógica do conversor)
            epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
            epub_nome = re.sub(r'[<>:"|?*\\]', '', epub_nome)

            # Importar e executar conversão completa
            from converter_final_universal import converter_pdf_universal

            # Capturar stdout para não poluir logs
            import io as io_module
            from contextlib import redirect_stdout

            output = io_module.StringIO()
            with redirect_stdout(output):
                resultado = converter_pdf_universal(temp_pdf_path)

            # Voltar ao diretório original
            os.chdir(original_dir)

            # Verificar se EPUB foi gerado
            epub_path = os.path.join(app.config['UPLOAD_FOLDER'], epub_nome)

            if os.path.exists(epub_path):
                return jsonify({
                    'sucesso': True,
                    'arquivo': epub_nome,
                    'titulo': titulo,
                    'autor': autor
                })
            else:
                # Tentar encontrar o arquivo gerado (pode ter nome diferente)
                import glob
                epubs = glob.glob(os.path.join(app.config['UPLOAD_FOLDER'], '*.epub'))
                if epubs:
                    # Pegar o mais recente
                    epub_path = max(epubs, key=os.path.getmtime)
                    epub_nome = os.path.basename(epub_path)
                    return jsonify({
                        'sucesso': True,
                        'arquivo': epub_nome,
                        'titulo': titulo,
                        'autor': autor
                    })
                else:
                    return jsonify({
                        'sucesso': False,
                        'erro': f'EPUB não encontrado. Esperado: {epub_nome}'
                    })

        except Exception as e:
            os.chdir(original_dir)
            import traceback
            return jsonify({
                'sucesso': False,
                'erro': f'{str(e)}\n{traceback.format_exc()}'
            })

    return jsonify({'sucesso': False, 'erro': 'Formato inválido'})

@app.route('/download/<filename>')
def download(filename):
    """Download do EPUB gerado"""
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(filename))
    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True, download_name=filename)
    return "Arquivo não encontrado", 404

if __name__ == '__main__':
    print("="*70)
    print("CONVERSOR PDF -> EPUB - Interface Web")
    print("="*70)
    print("\nAcesse: http://localhost:5000")
    print("\nPressione Ctrl+C para parar o servidor\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
