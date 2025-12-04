#!/usr/bin/env python3
"""
Script de teste para o conversor PDF → EPUB
"""

import os
import sys
from main import main as converter_main
from metadata_extractor import MetadataExtractor
from pdf_processor import PDFProcessor
from epub_generator import EPUBGenerator


def test_metadata_extraction():
    """Testa extração de metadados"""
    print("🧪 Testando extração de metadados...")
    
    extractor = MetadataExtractor()
    
    # Teste com metadados simulados
    test_metadata = {
        'title': 'Título do Livro',
        'author': 'Nome do Autor',
        'subject': 'Ficção',
        'creator': 'Teste',
        'producer': 'PDF Creator'
    }
    
    # Teste de limpeza de metadados
    cleaned = extractor._clean_metadata(test_metadata)
    print(f"✅ Metadados limpos: {cleaned}")
    
    # Teste de nome de arquivo seguro
    safe_name = extractor.get_safe_filename("Meu Livro: Capítulo 1!")
    print(f"✅ Nome seguro: {safe_name}")
    
    return True


def test_pdf_processing():
    """Testa processamento de PDF"""
    print("🧪 Testando processamento de PDF...")
    
    processor = PDFProcessor()
    
    # Teste de limpeza de texto
    dirty_text = "Este é um   texto    com\n\nmúltiplos    espaços   e\n\nquebras de linha."
    clean_text = processor._clean_text(dirty_text)
    print(f"✅ Texto limpo: '{clean_text}'")
    
    # Teste de divisão em parágrafos
    paragraphs = processor._split_into_paragraphs(clean_text)
    print(f"✅ Parágrafos: {len(paragraphs)}")
    
    # Teste de detecção de título
    is_title = processor._is_title("CAPÍTULO 1")
    print(f"✅ Detecção de título: {is_title}")
    
    return True


def test_epub_generation():
    """Testa geração de EPUB"""
    print("🧪 Testando geração de EPUB...")
    
    generator = EPUBGenerator()
    
    # Estrutura de teste
    test_structure = {
        'chapters': [
            {
                'title': 'Capítulo 1',
                'content': 'Este é o conteúdo do primeiro capítulo.',
                'html': '<div class="chapter"><h1>Capítulo 1</h1><p>Este é o conteúdo do primeiro capítulo.</p></div>'
            },
            {
                'title': 'Capítulo 2', 
                'content': 'Este é o conteúdo do segundo capítulo.',
                'html': '<div class="chapter"><h1>Capítulo 2</h1><p>Este é o conteúdo do segundo capítulo.</p></div>'
            }
        ]
    }
    
    # Teste de criação de EPUB
    try:
        epub_book = generator.create_epub(
            title="Livro de Teste",
            author="Autor de Teste",
            content_structure=test_structure
        )
        print("✅ EPUB criado com sucesso")
        return True
    except Exception as e:
        print(f"❌ Erro ao criar EPUB: {e}")
        return False


def test_with_sample_pdf():
    """Testa com PDF de exemplo (se existir)"""
    print("🧪 Testando com PDF de exemplo...")
    
    # Procurar por PDFs na pasta atual
    pdf_files = [f for f in os.listdir('.') if f.endswith('.pdf')]
    
    if not pdf_files:
        print("⚠️  Nenhum arquivo PDF encontrado para teste")
        print("   Para testar, coloque um arquivo PDF na pasta e execute novamente")
        return True
    
    pdf_file = pdf_files[0]
    print(f"📄 Testando com: {pdf_file}")
    
    try:
        # Testar extração de metadados
        extractor = MetadataExtractor()
        metadata = extractor.extract_from_pdf(pdf_file)
        print(f"✅ Metadados extraídos: {metadata}")
        
        # Testar processamento
        processor = PDFProcessor()
        pages = processor.extract_text_from_pdf(pdf_file)
        print(f"✅ Páginas processadas: {len(pages)}")
        
        if pages:
            structure = processor.create_epub_structure(pages)
            print(f"✅ Capítulos criados: {structure['total_chapters']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste com PDF: {e}")
        return False


def run_all_tests():
    """Executa todos os testes"""
    print("🚀 INICIANDO TESTES DO CONVERSOR PDF → EPUB")
    print("=" * 50)
    
    tests = [
        ("Extração de Metadados", test_metadata_extraction),
        ("Processamento de PDF", test_pdf_processing),
        ("Geração de EPUB", test_epub_generation),
        ("Teste com PDF", test_with_sample_pdf)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🔍 {test_name}")
        try:
            if test_func():
                print(f"✅ {test_name}: PASSOU")
                passed += 1
            else:
                print(f"❌ {test_name}: FALHOU")
        except Exception as e:
            print(f"❌ {test_name}: ERRO - {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 RESULTADO: {passed}/{total} testes passaram")
    
    if passed == total:
        print("🎉 TODOS OS TESTES PASSARAM! O conversor está pronto para uso.")
    else:
        print("⚠️  Alguns testes falharam. Verifique os erros acima.")
    
    return passed == total


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("""
🧪 SCRIPT DE TESTE - CONVERSOR PDF → EPUB
=========================================

Este script testa todas as funcionalidades do conversor:
- Extração de metadados
- Processamento de PDF
- Geração de EPUB
- Teste com arquivo PDF real

Uso:
  python test_converter.py           # Executa todos os testes
  python test_converter.py --help   # Mostra esta ajuda

Para testar com um PDF real:
1. Coloque um arquivo PDF na pasta do projeto
2. Execute: python test_converter.py
3. O script encontrará e testará automaticamente

Requisitos:
- Todas as dependências instaladas (pip install -r requirements.txt)
- Pelo menos um arquivo PDF para teste completo
        """)
    else:
        success = run_all_tests()
        sys.exit(0 if success else 1)


