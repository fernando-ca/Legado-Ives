#!/usr/bin/env python3
"""
Interface Web para Conversor PDF -> EPUB - VERSÃO CORRIGIDA
"""
from flask import Flask, render_template, request, send_file, jsonify
from werkzeug.utils import secure_filename
import os
import sys
from pathlib import Path
import tempfile
import shutil
import unicodedata

# Importar o conversor
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import PyPDF2
import fitz
from ebooklib import epub
from PIL import Image
import re
import io

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024  # 100MB max

# Criar pasta dedicada para conversões
CONVERSOES_DIR = os.path.join(os.getcwd(), 'conversoes_web')
os.makedirs(CONVERSOES_DIR, exist_ok=True)
app.config['UPLOAD_FOLDER'] = CONVERSOES_DIR

ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def remover_acentos(texto):
    """Remove acentos de um texto"""
    nfkd = unicodedata.normalize('NFKD', texto)
    texto_sem_acento = ''.join([c for c in nfkd if not unicodedata.combining(c)])
    return texto_sem_acento

def nome_arquivo_seguro(titulo):
    """Gera nome de arquivo seguro sem caracteres especiais"""
    # Remover acentos
    titulo = remover_acentos(titulo)
    # Substituir espaços e caracteres especiais
    titulo = re.sub(r'[^\w\s-]', '', titulo)
    titulo = re.sub(r'[\s_]+', '_', titulo)
    return titulo.strip('_')

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
            # Salvar PDF
            filename = secure_filename(file.filename)
            temp_pdf_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(temp_pdf_path)

            # Extrair metadados
            with open(temp_pdf_path, 'rb') as f:
                pdf = PyPDF2.PdfReader(f)
                from converter_final_universal import extrair_metadados_simples
                titulo, autor = extrair_metadados_simples(pdf, temp_pdf_path)

            # Nome seguro do EPUB (SEM ACENTOS)
            titulo_seguro = nome_arquivo_seguro(titulo)
            epub_nome = f"{titulo_seguro}.epub"

            # Mudar para pasta de conversões
            os.chdir(app.config['UPLOAD_FOLDER'])

            # Converter PDF para EPUB
            from converter_final_universal import converter_pdf_universal
            import io as io_module
            from contextlib import redirect_stdout

            output = io_module.StringIO()
            with redirect_stdout(output):
                converter_pdf_universal(temp_pdf_path)

            os.chdir(original_dir)

            # Procurar o EPUB gerado (pode ter nome com acentos)
            import glob
            epubs_gerados = glob.glob(os.path.join(app.config['UPLOAD_FOLDER'], '*.epub'))

            if epubs_gerados:
                # Pegar o mais recente
                epub_path_original = max(epubs_gerados, key=os.path.getmtime)
                epub_nome_original = os.path.basename(epub_path_original)

                # Renomear para nome sem acentos
                epub_path_novo = os.path.join(app.config['UPLOAD_FOLDER'], epub_nome)

                # Se já existe, remover
                if os.path.exists(epub_path_novo):
                    os.remove(epub_path_novo)

                # Renomear
                os.rename(epub_path_original, epub_path_novo)

                return jsonify({
                    'sucesso': True,
                    'arquivo': epub_nome,
                    'titulo': titulo,
                    'autor': autor
                })
            else:
                return jsonify({
                    'sucesso': False,
                    'erro': 'EPUB não foi gerado'
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
        # Tentar obter o título original do EPUB
        try:
            book = epub.read_epub(filepath)
            titulo_original = book.get_metadata('DC', 'title')[0][0]
            download_name = f"{titulo_original}.epub"
        except:
            download_name = filename

        return send_file(filepath, as_attachment=True, download_name=download_name)

    return "Arquivo não encontrado", 404

if __name__ == '__main__':
    print("="*70)
    print("CONVERSOR PDF -> EPUB - Interface Web")
    print("="*70)
    print(f"\nPasta de conversões: {CONVERSOES_DIR}")
    print("\nAcesse: http://localhost:5000")
    print("\nPressione Ctrl+C para parar o servidor\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
