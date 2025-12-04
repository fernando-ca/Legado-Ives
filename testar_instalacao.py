#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de teste para verificar instalação do Transcritor de Vídeos
"""
import sys
import os

# Configurar encoding UTF-8 no Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

def verificar_ffmpeg():
    """Verifica se FFmpeg está instalado"""
    print("🔍 Verificando FFmpeg...")
    try:
        import subprocess
        result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
        if result.returncode == 0:
            version_line = result.stdout.split('\n')[0]
            print(f"   ✅ FFmpeg encontrado: {version_line}")
            return True
        else:
            print("   ❌ FFmpeg não encontrado ou erro ao executar")
            return False
    except FileNotFoundError:
        print("   ❌ FFmpeg não está instalado ou não está no PATH")
        print("   📝 Instale: https://www.gyan.dev/ffmpeg/builds/")
        return False
    except Exception as e:
        print(f"   ❌ Erro ao verificar FFmpeg: {e}")
        return False

def verificar_biblioteca(nome_lib, nome_import=None):
    """Verifica se uma biblioteca Python está instalada"""
    if nome_import is None:
        nome_import = nome_lib

    print(f"🔍 Verificando {nome_lib}...")
    try:
        __import__(nome_import)
        print(f"   ✅ {nome_lib} instalado")
        return True
    except ImportError:
        print(f"   ❌ {nome_lib} não instalado")
        print(f"   📝 Instale: pip install {nome_lib}")
        return False

def verificar_whisper():
    """Verifica se Whisper está instalado e carrega um modelo pequeno"""
    print("🔍 Verificando OpenAI Whisper...")
    try:
        import whisper
        print("   ✅ Whisper instalado")

        # Tentar carregar modelo tiny (mais rápido para teste)
        print("   📦 Testando carregamento de modelo 'tiny'...")
        print("      (Isso pode levar alguns segundos na primeira vez)")
        model = whisper.load_model("tiny")
        print("   ✅ Modelo carregado com sucesso!")
        return True
    except ImportError:
        print("   ❌ Whisper não instalado")
        print("   📝 Instale: pip install openai-whisper")
        return False
    except Exception as e:
        print(f"   ❌ Erro ao carregar Whisper: {e}")
        return False

def verificar_torch():
    """Verifica PyTorch e detecta GPU"""
    print("🔍 Verificando PyTorch...")
    try:
        import torch
        print(f"   ✅ PyTorch instalado (versão {torch.__version__})")

        # Verificar GPU
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"   🚀 GPU NVIDIA detectada: {gpu_name}")
            print("      Transcrições serão MUITO mais rápidas!")
        else:
            print("   💻 Usando CPU (sem GPU detectada)")
            print("      Transcrições serão mais lentas, mas funcionais")

        return True
    except ImportError:
        print("   ❌ PyTorch não instalado")
        print("   📝 Instale: pip install torch")
        return False
    except Exception as e:
        print(f"   ⚠️  PyTorch instalado, mas erro ao verificar GPU: {e}")
        return True

def main():
    print("=" * 70)
    print("TESTE DE INSTALAÇÃO - TRANSCRITOR DE VÍDEOS")
    print("=" * 70)
    print()

    resultados = []

    # Verificar dependências essenciais
    resultados.append(("FFmpeg", verificar_ffmpeg()))
    print()

    resultados.append(("yt-dlp", verificar_biblioteca("yt-dlp", "yt_dlp")))
    print()

    resultados.append(("ffmpeg-python", verificar_biblioteca("ffmpeg-python", "ffmpeg")))
    print()

    resultados.append(("PyTorch", verificar_torch()))
    print()

    resultados.append(("Whisper", verificar_whisper()))
    print()

    resultados.append(("Flask", verificar_biblioteca("Flask", "flask")))
    print()

    # Resumo
    print("=" * 70)
    print("RESUMO")
    print("=" * 70)

    todos_ok = True
    for nome, status in resultados:
        emoji = "✅" if status else "❌"
        print(f"{emoji} {nome}")
        if not status:
            todos_ok = False

    print()

    if todos_ok:
        print("🎉 TUDO PRONTO!")
        print()
        print("Para iniciar o servidor, execute:")
        print("   python app_video.py")
        print()
        print("Depois acesse: http://localhost:5000")
        return 0
    else:
        print("⚠️  ALGUMAS DEPENDÊNCIAS ESTÃO FALTANDO")
        print()
        print("Para instalar todas de uma vez:")
        print("   pip install -r requirements_video.txt")
        print()
        print("Não esqueça de instalar o FFmpeg separadamente:")
        print("   https://www.gyan.dev/ffmpeg/builds/")
        return 1

if __name__ == '__main__':
    sys.exit(main())
