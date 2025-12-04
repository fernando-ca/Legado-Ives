#!/usr/bin/env python3
"""
Interface Web para Transcritor de Vídeos
Converte vídeos de URLs para texto usando Whisper AI
"""
from flask import Flask, render_template, request, send_file, jsonify, session
from werkzeug.utils import secure_filename
import os
import sys
from pathlib import Path
import threading
import uuid

# Configurar encoding para UTF-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Importar nosso transcritor
from video_transcriber import VideoTranscriber

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max
app.secret_key = 'video-transcriber-secret-key-2025'

# Criar pasta dedicada para transcrições
TRANSCRICOES_DIR = os.path.join(os.getcwd(), 'transcricoes_web')
os.makedirs(TRANSCRICOES_DIR, exist_ok=True)
app.config['OUTPUT_FOLDER'] = TRANSCRICOES_DIR

# Dicionário global para armazenar progresso das transcrições
transcription_progress = {}

def processar_video_thread(task_id, video_url, model_size='small'):
    """Processa vídeo em thread separada"""
    try:
        transcription_progress[task_id] = {
            'status': 'downloading',
            'progress': 0,
            'message': 'Iniciando download do vídeo...'
        }

        # Criar transcritor
        transcriber = VideoTranscriber(
            model_size=model_size,
            output_dir=TRANSCRICOES_DIR
        )

        # Callback para atualizar progresso
        def progress_callback(stage, progress_str):
            if stage == 'download':
                transcription_progress[task_id] = {
                    'status': 'downloading',
                    'progress': 30,
                    'message': f'Baixando vídeo... {progress_str}'
                }
            elif stage == 'extract':
                transcription_progress[task_id] = {
                    'status': 'extracting',
                    'progress': 50,
                    'message': 'Extraindo áudio do vídeo...'
                }
            elif stage == 'transcribe':
                transcription_progress[task_id] = {
                    'status': 'transcribing',
                    'progress': 70,
                    'message': 'Transcrevendo áudio (isso pode levar alguns minutos)...'
                }

        # Processar vídeo
        transcription_progress[task_id] = {
            'status': 'downloading',
            'progress': 10,
            'message': 'Baixando vídeo...'
        }

        video_info = transcriber.download_video(video_url, progress_callback)

        transcription_progress[task_id] = {
            'status': 'extracting',
            'progress': 40,
            'message': 'Extraindo áudio...'
        }

        audio_path = transcriber.extract_audio(video_info['filepath'], progress_callback)

        transcription_progress[task_id] = {
            'status': 'transcribing',
            'progress': 60,
            'message': f'Transcrevendo "{video_info["title"]}" (pode levar alguns minutos)...'
        }

        transcription_result = transcriber.transcribe_audio(audio_path, language='pt', progress_callback=progress_callback)

        transcription_progress[task_id] = {
            'status': 'saving',
            'progress': 90,
            'message': 'Salvando transcrição...'
        }

        output_path = transcriber.save_transcription(
            transcription_result['text'],
            video_info=video_info
        )

        # Sucesso!
        transcription_progress[task_id] = {
            'status': 'completed',
            'progress': 100,
            'message': 'Transcrição concluída!',
            'transcription': transcription_result['text'],
            'output_file': os.path.basename(output_path),
            'video_info': {
                'title': video_info['title'],
                'duration': video_info['duration'] // 60,  # minutos
                'uploader': video_info['uploader']
            }
        }

    except Exception as e:
        transcription_progress[task_id] = {
            'status': 'error',
            'progress': 0,
            'message': f'Erro: {str(e)}'
        }


@app.route('/')
def index():
    return render_template('index_video.html')


@app.route('/transcrever', methods=['POST'])
def transcrever():
    """Inicia transcrição de vídeo"""
    data = request.get_json()
    video_url = data.get('video_url', '').strip()
    model_size = data.get('model_size', 'small')

    if not video_url:
        return jsonify({'sucesso': False, 'erro': 'URL do vídeo é obrigatória'})

    # Validar modelo
    valid_models = ['tiny', 'small', 'medium', 'large']
    if model_size not in valid_models:
        model_size = 'small'

    # Gerar ID único para esta tarefa
    task_id = str(uuid.uuid4())

    # Iniciar processamento em thread separada
    thread = threading.Thread(
        target=processar_video_thread,
        args=(task_id, video_url, model_size)
    )
    thread.daemon = True
    thread.start()

    return jsonify({
        'sucesso': True,
        'task_id': task_id,
        'message': 'Transcrição iniciada'
    })


@app.route('/progresso/<task_id>')
def progresso(task_id):
    """Retorna progresso da transcrição"""
    if task_id in transcription_progress:
        return jsonify(transcription_progress[task_id])
    else:
        return jsonify({
            'status': 'not_found',
            'message': 'Tarefa não encontrada'
        })


@app.route('/download/<filename>')
def download(filename):
    """Download da transcrição"""
    filepath = os.path.join(TRANSCRICOES_DIR, 'texts', secure_filename(filename))

    if os.path.exists(filepath):
        return send_file(filepath, as_attachment=True, download_name=filename)

    return "Arquivo não encontrado", 404


@app.route('/listar')
def listar():
    """Lista transcrições disponíveis"""
    texts_dir = os.path.join(TRANSCRICOES_DIR, 'texts')

    if not os.path.exists(texts_dir):
        return jsonify({'transcricoes': []})

    files = []
    for filename in os.listdir(texts_dir):
        if filename.endswith('.txt'):
            filepath = os.path.join(texts_dir, filename)
            file_stat = os.stat(filepath)
            files.append({
                'nome': filename,
                'tamanho': file_stat.st_size,
                'data': file_stat.st_mtime
            })

    # Ordenar por data (mais recente primeiro)
    files.sort(key=lambda x: x['data'], reverse=True)

    return jsonify({'transcricoes': files})


if __name__ == '__main__':
    print("=" * 70)
    print("TRANSCRITOR DE VÍDEOS - Interface Web")
    print("=" * 70)
    print(f"\nPasta de transcrições: {TRANSCRICOES_DIR}")
    print("\nModelos disponíveis:")
    print("  • tiny   - Muito rápido, menor precisão")
    print("  • small  - Rápido, boa precisão (RECOMENDADO)")
    print("  • medium - Mais lento, excelente precisão")
    print("  • large  - Muito lento, melhor precisão")
    print("\nAcesse: http://localhost:5001")
    print("\nPressione Ctrl+C para parar o servidor\n")
    app.run(debug=False, host='127.0.0.1', port=5001, threaded=True)
