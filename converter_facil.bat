@echo off
chcp 65001 >nul
echo.
echo ═══════════════════════════════════════════════════════════════
echo   📚 CONVERSOR PDF → EPUB - MODO FÁCIL
echo ═══════════════════════════════════════════════════════════════
echo.

:: Verificar se Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ Python não encontrado!
        echo.
        echo Por favor, instale Python:
        echo 1. Microsoft Store: buscar "Python 3.12"
        echo 2. Ou baixar de: https://www.python.org/downloads/
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

echo ✅ Python encontrado!
echo.

:: Verificar dependências
echo 🔍 Verificando dependências...
%PYTHON_CMD% -c "import PyPDF2, ebooklib, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Dependências não instaladas. Instalando...
    echo.
    %PYTHON_CMD% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências!
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas!
    echo.
)

:: Listar PDFs disponíveis
echo 📁 PDFs disponíveis em test_pdfs/:
echo.
dir /b test_pdfs\*.pdf 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Nenhum PDF encontrado!
    echo.
    echo 📝 Como usar:
    echo 1. Coloque seu PDF na pasta test_pdfs/
    echo 2. Execute este arquivo novamente
    echo.
    pause
    exit /b 1
)

echo.
echo ───────────────────────────────────────────────────────────────
echo.
echo 🎯 OPÇÕES DE CONVERSÃO:
echo.
echo [1] Conversão SIMPLES (auto-detecta título e autor)
echo [2] Conversão COM CAPA
echo [3] Conversão COMPLETA (título, autor e capa manuais)
echo [4] Testar instalação (sem converter)
echo [5] Sair
echo.
set /p opcao="Escolha uma opção (1-5): "

if "%opcao%"=="1" goto simples
if "%opcao%"=="2" goto com_capa
if "%opcao%"=="3" goto completa
if "%opcao%"=="4" goto testar
if "%opcao%"=="5" goto fim

echo ❌ Opção inválida!
pause
exit /b 1

:simples
echo.
set /p pdf_file="Digite o nome do PDF (ex: livro.pdf): "
if not exist "test_pdfs\%pdf_file%" (
    echo ❌ Arquivo não encontrado: test_pdfs\%pdf_file%
    pause
    exit /b 1
)
echo.
echo 🚀 Convertendo...
%PYTHON_CMD% main.py "test_pdfs\%pdf_file%"
goto resultado

:com_capa
echo.
set /p pdf_file="Digite o nome do PDF (ex: livro.pdf): "
if not exist "test_pdfs\%pdf_file%" (
    echo ❌ Arquivo não encontrado: test_pdfs\%pdf_file%
    pause
    exit /b 1
)
echo.
set /p capa_file="Digite o nome da capa (ex: capa.jpg): "
if not exist "test_covers\%capa_file%" (
    echo ❌ Arquivo não encontrado: test_covers\%capa_file%
    pause
    exit /b 1
)
echo.
echo 🚀 Convertendo...
%PYTHON_CMD% main.py "test_pdfs\%pdf_file%" -c "test_covers\%capa_file%"
goto resultado

:completa
echo.
set /p pdf_file="Digite o nome do PDF (ex: livro.pdf): "
if not exist "test_pdfs\%pdf_file%" (
    echo ❌ Arquivo não encontrado: test_pdfs\%pdf_file%
    pause
    exit /b 1
)
echo.
set /p titulo="Digite o TÍTULO do livro: "
set /p autor="Digite o AUTOR do livro: "
echo.
set /p tem_capa="Tem capa? (S/N): "
if /i "%tem_capa%"=="S" (
    set /p capa_file="Digite o nome da capa (ex: capa.jpg): "
    if not exist "test_covers\!capa_file!" (
        echo ⚠️  Capa não encontrada, continuando sem capa...
        set capa_file=
    )
)
echo.
echo 🚀 Convertendo...
if defined capa_file (
    %PYTHON_CMD% main.py "test_pdfs\%pdf_file%" -t "%titulo%" -a "%autor%" -c "test_covers\%capa_file%" -v
) else (
    %PYTHON_CMD% main.py "test_pdfs\%pdf_file%" -t "%titulo%" -a "%autor%" -v
)
goto resultado

:testar
echo.
echo 🧪 Executando testes...
echo.
%PYTHON_CMD% test_converter.py
echo.
pause
exit /b 0

:resultado
echo.
if %errorlevel% equ 0 (
    echo ═══════════════════════════════════════════════════════════════
    echo   ✅ CONVERSÃO CONCLUÍDA COM SUCESSO!
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo 📚 Arquivo EPUB gerado!
    echo.
    echo 📁 Procure o arquivo .epub na pasta atual
    echo    ou verifique a mensagem acima para o caminho exato
    echo.
    echo 📱 Para ler o EPUB, use:
    echo    • Calibre (Windows)
    echo    • Google Play Livros (Android)
    echo    • Apple Books (iOS)
    echo    • https://readium.org/ (Online)
    echo.
) else (
    echo ═══════════════════════════════════════════════════════════════
    echo   ❌ ERRO NA CONVERSÃO
    echo ═══════════════════════════════════════════════════════════════
    echo.
    echo Verifique as mensagens de erro acima
    echo.
)

:fim
echo.
pause
