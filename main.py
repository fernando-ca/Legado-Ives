#!/usr/bin/env python3
"""
Conversor PDF para EPUB com Metadados Completos
Script principal para conversão de arquivos PDF para EPUB mantendo metadados
"""

import os
import sys
import argparse
from datetime import datetime
from typing import Optional

from metadata_extractor import MetadataExtractor
from pdf_processor import PDFProcessor
from epub_generator import EPUBGenerator
import config


def main():
    """Função principal do conversor"""
    parser = argparse.ArgumentParser(
        description="Conversor PDF para EPUB com metadados completos",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python main.py livro.pdf
  python main.py livro.pdf -c capa.jpg
  python main.py livro.pdf -o "Meu Livro.epub"
  python main.py livro.pdf -t "Título Personalizado" -a "Autor Personalizado"
        """
    )
    
    # Argumentos obrigatórios
    parser.add_argument('pdf_file', help='Caminho para o arquivo PDF')
    
    # Argumentos opcionais
    parser.add_argument('-c', '--cover', help='Caminho para imagem de capa (JPG/PNG)')
    parser.add_argument('-o', '--output', help='Nome do arquivo EPUB de saída')
    parser.add_argument('-t', '--title', help='Título personalizado para o livro')
    parser.add_argument('-a', '--author', help='Autor personalizado para o livro')
    parser.add_argument('-v', '--verbose', action='store_true', help='Modo verboso')
    
    args = parser.parse_args()
    
    # Verificar se arquivo PDF existe
    if not os.path.exists(args.pdf_file):
        print(f"❌ Erro: Arquivo PDF não encontrado: {args.pdf_file}")
        sys.exit(1)
    
    # Verificar se arquivo de capa existe (se fornecido)
    if args.cover and not os.path.exists(args.cover):
        print(f"❌ Erro: Arquivo de capa não encontrado: {args.cover}")
        sys.exit(1)
    
    print("🚀 Iniciando conversão PDF → EPUB...")
    print(f"📄 Arquivo PDF: {args.pdf_file}")
    if args.cover:
        print(f"🖼️  Capa: {args.cover}")
    
    try:
        # 1. Extrair metadados do PDF
        print("\n📋 Extraindo metadados do PDF...")
        metadata_extractor = MetadataExtractor()
        pdf_metadata = metadata_extractor.extract_from_pdf(args.pdf_file)
        
        if args.verbose:
            print("Metadados extraídos:")
            for key, value in pdf_metadata.items():
                print(f"  {key}: {value}")
        
        # 2. Processar PDF e extrair conteúdo
        print("📖 Processando conteúdo do PDF...")
        pdf_processor = PDFProcessor()
        pages_content = pdf_processor.extract_text_from_pdf(args.pdf_file)
        
        if not pages_content:
            print("❌ Erro: Não foi possível extrair conteúdo do PDF")
            sys.exit(1)
        
        print(f"✅ Processadas {len(pages_content)} páginas")
        
        # 3. Criar estrutura de conteúdo
        print("📚 Organizando conteúdo em capítulos...")
        content_structure = pdf_processor.create_epub_structure(pages_content)
        print(f"✅ Criados {content_structure['total_chapters']} capítulos")
        
        # 4. Preparar metadados finais
        final_title = args.title or pdf_metadata.get('title', 'Livro sem título')
        final_author = args.author or pdf_metadata.get('author', 'Autor desconhecido')
        
        if not final_title or final_title == 'Livro sem título':
            final_title = f"Livro convertido {datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        print(f"📝 Título: {final_title}")
        print(f"👤 Autor: {final_author}")
        
        # 5. Gerar EPUB
        print("📚 Gerando arquivo EPUB...")
        epub_generator = EPUBGenerator()
        
        # Metadados adicionais
        additional_metadata = {
            'subject': pdf_metadata.get('subject', ''),
            'creator': pdf_metadata.get('creator', ''),
            'publisher': config.DEFAULT_METADATA['publisher'],
            'rights': config.DEFAULT_METADATA['rights']
        }
        
        # Criar EPUB
        epub_book = epub_generator.create_epub(
            title=final_title,
            author=final_author,
            content_structure=content_structure,
            cover_image_path=args.cover,
            additional_metadata=additional_metadata
        )
        
        # 6. Salvar arquivo EPUB
        if args.output:
            output_path = args.output
        else:
            # Gerar nome baseado no título
            safe_title = metadata_extractor.get_safe_filename(final_title)
            output_path = f"{safe_title}.epub"
        
        # Garantir extensão .epub
        if not output_path.endswith('.epub'):
            output_path += '.epub'
        
        success = epub_generator.save_epub(output_path)
        
        if success:
            print(f"\n✅ Conversão concluída com sucesso!")
            print(f"📚 Arquivo EPUB: {output_path}")
            
            # Mostrar informações do arquivo
            file_size = os.path.getsize(output_path)
            print(f"📊 Tamanho: {file_size / 1024:.1f} KB")
            
            # Mostrar resumo
            print(f"\n📋 Resumo da conversão:")
            print(f"  • Páginas processadas: {len(pages_content)}")
            print(f"  • Capítulos criados: {content_structure['total_chapters']}")
            print(f"  • Título: {final_title}")
            print(f"  • Autor: {final_author}")
            if args.cover:
                print(f"  • Capa: Sim")
            else:
                print(f"  • Capa: Não")
            
        else:
            print("❌ Erro ao salvar arquivo EPUB")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Conversão cancelada pelo usuário")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Erro durante a conversão: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def show_help():
    """Mostra informações de ajuda"""
    print("""
📚 CONVERSOR PDF PARA EPUB COM METADADOS COMPLETOS
==================================================

Este script converte arquivos PDF para formato EPUB mantendo:
✅ Título do livro
✅ Nome do autor  
✅ Capa personalizada (opcional)
✅ Estrutura de capítulos
✅ Metadados completos

USO BÁSICO:
  python main.py arquivo.pdf

USO COM CAPA:
  python main.py arquivo.pdf -c capa.jpg

USO COMPLETO:
  python main.py arquivo.pdf -c capa.jpg -t "Meu Título" -a "Meu Autor" -o "meu_livro.epub"

ARGUMENTOS:
  pdf_file          Arquivo PDF para converter (obrigatório)
  -c, --cover       Imagem de capa (JPG/PNG)
  -o, --output      Nome do arquivo EPUB de saída
  -t, --title       Título personalizado
  -a, --author      Autor personalizado
  -v, --verbose     Modo verboso (mostra detalhes)
  -h, --help        Mostra esta ajuda

EXEMPLOS:
  python main.py livro.pdf
  python main.py livro.pdf -c capa.jpg -o "Meu Livro.epub"
  python main.py livro.pdf -t "Dom Casmurro" -a "Machado de Assis"

REQUISITOS:
  - Python 3.7+
  - Bibliotecas: PyPDF2, ebooklib, Pillow, beautifulsoup4
  - Instalar com: pip install -r requirements.txt
    """)


if __name__ == "__main__":
    if len(sys.argv) == 1 or '--help' in sys.argv or '-h' in sys.argv:
        show_help()
    else:
        main()


