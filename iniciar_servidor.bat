@echo off
chcp 65001 >nul
cls
echo ====================================================================
echo 🎬 TRANSCRITOR DE VÍDEOS - Servidor Web
echo ====================================================================
echo.
echo Iniciando servidor Flask...
echo.
echo Acesse: http://localhost:5000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ====================================================================
echo.

python app_video.py

pause
