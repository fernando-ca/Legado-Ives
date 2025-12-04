@echo off
chcp 65001 >nul
echo ====================================================================
echo INSTALADOR - TRANSCRITOR DE VÍDEOS
echo ====================================================================
echo.

echo [1/3] Verificando Python...
python --version
if errorlevel 1 (
    echo ERRO: Python não encontrado!
    echo Por favor, instale Python 3.8+ de https://www.python.org/
    pause
    exit /b 1
)
echo.

echo [2/3] Instalando dependências Python...
echo Isso pode levar 5-10 minutos (PyTorch é grande)...
echo.
pip install -r requirements_video.txt
if errorlevel 1 (
    echo.
    echo ERRO ao instalar dependências Python!
    echo Tente manualmente: pip install -r requirements_video.txt
    pause
    exit /b 1
)
echo.

echo [3/3] Verificando FFmpeg...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ⚠️  FFmpeg NÃO ENCONTRADO!
    echo.
    echo Para instalar FFmpeg:
    echo   Opção 1 - Chocolatey: choco install ffmpeg
    echo   Opção 2 - Download: https://www.gyan.dev/ffmpeg/builds/
    echo.
    echo Pressione qualquer tecla para continuar mesmo assim...
    pause >nul
) else (
    echo ✅ FFmpeg encontrado!
)
echo.

echo ====================================================================
echo TESTANDO INSTALAÇÃO
echo ====================================================================
echo.
python testar_instalacao.py
echo.

echo ====================================================================
echo INSTALAÇÃO CONCLUÍDA!
echo ====================================================================
echo.
echo Para iniciar o servidor:
echo    python app_video.py
echo.
echo Depois acesse: http://localhost:5000
echo.
pause
