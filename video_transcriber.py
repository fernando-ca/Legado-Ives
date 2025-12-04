"""
Video Transcription Module
Converte vídeos de URLs para texto usando Whisper AI
"""

import os
import sys
import whisper
import ffmpeg
import yt_dlp
from pathlib import Path
from datetime import datetime


class VideoTranscriber:
    """Classe para gerenciar transcrição de vídeos"""

    def __init__(self, model_size='small', output_dir='output_transcricoes'):
        """
        Inicializa o transcritor

        Args:
            model_size: Tamanho do modelo Whisper (tiny, small, medium, large)
            output_dir: Diretório para salvar resultados
        """
        self.model_size = model_size
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

        # Criar subpastas
        self.uploads_dir = self.output_dir / 'uploads'
        self.audios_dir = self.output_dir / 'audios'
        self.texts_dir = self.output_dir / 'texts'

        for dir_path in [self.uploads_dir, self.audios_dir, self.texts_dir]:
            dir_path.mkdir(exist_ok=True)

        self.model = None
        print(f"VideoTranscriber inicializado com modelo: {model_size}")

    def _load_model(self):
        """Carrega o modelo Whisper (lazy loading)"""
        if self.model is None:
            print(f"Carregando modelo Whisper '{self.model_size}'...")
            self.model = whisper.load_model(self.model_size)
            print("Modelo carregado com sucesso!")
        return self.model

    def download_video(self, url, progress_callback=None):
        """
        Baixa vídeo de uma URL

        Args:
            url: URL do vídeo
            progress_callback: Função para reportar progresso (opcional)

        Returns:
            Caminho do vídeo baixado
        """
        print(f"\n📥 Baixando vídeo de: {url}")

        # Gerar nome único baseado em timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        output_template = str(self.uploads_dir / f'video_{timestamp}.%(ext)s')

        def progress_hook(d):
            if d['status'] == 'downloading':
                percent = d.get('_percent_str', '0%')
                speed = d.get('_speed_str', 'N/A')
                print(f"\rDownload: {percent} - Velocidade: {speed}", end='', flush=True)
                if progress_callback:
                    progress_callback('download', percent)
            elif d['status'] == 'finished':
                print("\n✅ Download concluído!")
                if progress_callback:
                    progress_callback('download', '100%')

        ydl_opts = {
            'format': 'best[ext=mp4]/best',  # Preferir MP4
            'outtmpl': output_template,
            'progress_hooks': [progress_hook],
            'quiet': False,
            'no_warnings': False,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                video_file = ydl.prepare_filename(info)

                print(f"✅ Vídeo salvo em: {video_file}")

                # Retornar informações úteis
                return {
                    'filepath': video_file,
                    'title': info.get('title', 'Sem título'),
                    'duration': info.get('duration', 0),
                    'uploader': info.get('uploader', 'Desconhecido')
                }
        except Exception as e:
            print(f"❌ Erro ao baixar vídeo: {str(e)}")
            raise

    def extract_audio(self, video_path, progress_callback=None):
        """
        Extrai áudio de um arquivo de vídeo

        Args:
            video_path: Caminho do vídeo
            progress_callback: Função para reportar progresso (opcional)

        Returns:
            Caminho do arquivo de áudio extraído
        """
        print(f"\n🎵 Extraindo áudio de: {video_path}")

        if progress_callback:
            progress_callback('extract', '0%')

        # Gerar nome do arquivo de áudio
        video_name = Path(video_path).stem
        audio_path = str(self.audios_dir / f'{video_name}.wav')

        try:
            # Usar FFmpeg para extrair áudio
            # Configurações: WAV, mono, 16kHz (ideal para Whisper)
            stream = ffmpeg.input(video_path)
            stream = ffmpeg.output(
                stream,
                audio_path,
                acodec='pcm_s16le',  # WAV format
                ac=1,                 # Mono
                ar='16000'            # 16kHz sample rate
            )

            ffmpeg.run(stream, overwrite_output=True, quiet=True)

            print(f"✅ Áudio extraído: {audio_path}")

            if progress_callback:
                progress_callback('extract', '100%')

            return audio_path

        except ffmpeg.Error as e:
            error_msg = e.stderr.decode() if e.stderr else str(e)
            print(f"❌ Erro ao extrair áudio: {error_msg}")
            raise

    def transcribe_audio(self, audio_path, language='pt', progress_callback=None):
        """
        Transcreve áudio para texto usando Whisper

        Args:
            audio_path: Caminho do arquivo de áudio
            language: Código do idioma (pt para português)
            progress_callback: Função para reportar progresso (opcional)

        Returns:
            Dicionário com transcrição e metadados
        """
        print(f"\n🎙️ Transcrevendo áudio: {audio_path}")
        print(f"Idioma: {language}")
        print("⏳ Isso pode levar alguns minutos...")

        if progress_callback:
            progress_callback('transcribe', '0%')

        try:
            # Carregar modelo
            model = self._load_model()

            # Transcrever
            result = model.transcribe(
                audio_path,
                language=language,
                verbose=False,
                fp16=False  # Usar FP32 para compatibilidade CPU
            )

            print("✅ Transcrição concluída!")

            if progress_callback:
                progress_callback('transcribe', '100%')

            return {
                'text': result['text'].strip(),
                'language': result.get('language', language),
                'segments': result.get('segments', [])
            }

        except Exception as e:
            print(f"❌ Erro ao transcrever: {str(e)}")
            raise

    def save_transcription(self, transcription, video_info=None, filename=None):
        """
        Salva transcrição em arquivo de texto

        Args:
            transcription: Texto da transcrição
            video_info: Informações do vídeo (opcional)
            filename: Nome do arquivo (opcional, gera automaticamente se não fornecido)

        Returns:
            Caminho do arquivo salvo
        """
        if filename is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'transcricao_{timestamp}.txt'

        output_path = self.texts_dir / filename

        with open(output_path, 'w', encoding='utf-8') as f:
            # Cabeçalho com informações
            f.write("=" * 80 + "\n")
            f.write("TRANSCRIÇÃO DE VÍDEO\n")
            f.write("=" * 80 + "\n\n")

            if video_info:
                f.write(f"Título: {video_info.get('title', 'N/A')}\n")
                duration_min = video_info.get('duration', 0) // 60
                f.write(f"Duração: {duration_min} minutos\n")
                f.write(f"Autor: {video_info.get('uploader', 'N/A')}\n")
                f.write("\n")

            f.write(f"Data da transcrição: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
            f.write(f"Modelo: Whisper {self.model_size}\n")
            f.write("\n" + "=" * 80 + "\n\n")

            # Transcrição
            f.write(transcription)

            f.write("\n\n" + "=" * 80 + "\n")
            f.write("Transcrito automaticamente com OpenAI Whisper\n")
            f.write("=" * 80 + "\n")

        print(f"💾 Transcrição salva em: {output_path}")
        return str(output_path)

    def process_video_url(self, url, language='pt'):
        """
        Processa vídeo completo: baixa, extrai áudio e transcreve

        Args:
            url: URL do vídeo
            language: Idioma da transcrição

        Returns:
            Dicionário com resultados
        """
        try:
            # 1. Baixar vídeo
            video_info = self.download_video(url)
            video_path = video_info['filepath']

            # 2. Extrair áudio
            audio_path = self.extract_audio(video_path)

            # 3. Transcrever
            transcription_result = self.transcribe_audio(audio_path, language=language)

            # 4. Salvar transcrição
            output_path = self.save_transcription(
                transcription_result['text'],
                video_info=video_info
            )

            return {
                'success': True,
                'transcription': transcription_result['text'],
                'output_file': output_path,
                'video_info': video_info
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# Função standalone para uso rápido
def transcribe_video_from_url(url, model_size='small', language='pt'):
    """
    Função de conveniência para transcrever vídeo diretamente

    Args:
        url: URL do vídeo
        model_size: Tamanho do modelo Whisper
        language: Idioma

    Returns:
        Texto da transcrição
    """
    transcriber = VideoTranscriber(model_size=model_size)
    result = transcriber.process_video_url(url, language=language)

    if result['success']:
        return result['transcription']
    else:
        raise Exception(result['error'])


# Script de teste/uso direto
if __name__ == '__main__':
    print("🎬 Transcritor de Vídeos - Teste")
    print("=" * 80)

    # Exemplo de uso
    if len(sys.argv) > 1:
        video_url = sys.argv[1]
    else:
        video_url = input("Digite a URL do vídeo: ")

    transcriber = VideoTranscriber(model_size='small')
    result = transcriber.process_video_url(video_url, language='pt')

    if result['success']:
        print("\n✅ SUCESSO!")
        print(f"\nTranscrição salva em: {result['output_file']}")
        print("\n--- PRÉVIA DA TRANSCRIÇÃO ---")
        print(result['transcription'][:500] + "...")
    else:
        print(f"\n❌ ERRO: {result['error']}")
