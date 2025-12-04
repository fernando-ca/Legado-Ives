#!/usr/bin/env python3
"""
Script de instalação rápida para o conversor PDF → EPUB
"""

import subprocess
import sys
import os


def install_requirements():
    """Instala as dependências necessárias"""
    print("📦 Instalando dependências...")
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependências instaladas com sucesso!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Erro ao instalar dependências: {e}")
        return False
    except FileNotFoundError:
        print("❌ Arquivo requirements.txt não encontrado!")
        return False


def test_installation():
    """Testa se a instalação foi bem-sucedida"""
    print("🧪 Testando instalação...")
    
    try:
        import PyPDF2
        import ebooklib
        from PIL import Image
        import bs4
        print("✅ Todas as bibliotecas importadas com sucesso!")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar biblioteca: {e}")
        return False


def create_sample_files():
    """Cria arquivos de exemplo para teste"""
    print("📝 Criando arquivos de exemplo...")
    
    # Criar arquivo de exemplo de uso
    example_usage = """# EXEMPLO DE USO - CONVERSOR PDF → EPUB

## Instalação (já feita)
pip install -r requirements.txt

## Uso Básico
python main.py livro.pdf

## Com Capa
python main.py livro.pdf -c capa.jpg

## Com Metadados Personalizados
python main.py livro.pdf -t "Meu Título" -a "Meu Autor" -o "meu_livro.epub"

## Teste do Sistema
python test_converter.py

## Ajuda
python main.py --help
"""
    
    with open("EXEMPLO_USO.md", "w", encoding="utf-8") as f:
        f.write(example_usage)
    
    print("✅ Arquivo de exemplo criado: EXEMPLO_USO.md")


def main():
    """Função principal de instalação"""
    print("🚀 INSTALAÇÃO DO CONVERSOR PDF → EPUB")
    print("=" * 40)
    
    # Verificar Python
    if sys.version_info < (3, 7):
        print("❌ Python 3.7+ é necessário!")
        print(f"   Versão atual: {sys.version}")
        return False
    
    print(f"✅ Python {sys.version.split()[0]} detectado")
    
    # Instalar dependências
    if not install_requirements():
        return False
    
    # Testar instalação
    if not test_installation():
        return False
    
    # Criar arquivos de exemplo
    create_sample_files()
    
    print("\n" + "=" * 40)
    print("🎉 INSTALAÇÃO CONCLUÍDA COM SUCESSO!")
    print("\n📚 Próximos passos:")
    print("1. Coloque um arquivo PDF na pasta")
    print("2. Execute: python main.py arquivo.pdf")
    print("3. Ou teste: python test_converter.py")
    print("\n📖 Para ajuda: python main.py --help")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)


