#!/usr/bin/env python3
"""Conversor PDF para EPUB - Versão Final com Argumentos"""

import PyPDF2
from ebooklib import epub
from PIL import Image
import sys
import os
import argparse

def converter_pdf_para_epub(pdf_path, epub_path, titulo, autor, capa_path=None):
    """Converte PDF para EPUB com metadados completos"""

    print(f"\n📄 Lendo: {pdf_path}")

    # 1. LER PDF
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        total_paginas = len(pdf.pages)
        print(f"   Total: {total_paginas} páginas")

        # 2. EXTRAIR TEXTO
        print("📖 Extraindo texto...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            texto = page.extract_text()
            if texto.strip():
                todo_texto.append(texto)

            if (i + 1) % 100 == 0:
                print(f"   Processadas {i + 1}/{total_paginas} páginas...")

        print(f"✅ Extraídas {len(todo_texto)} páginas com texto")

    # 3. CRIAR EPUB
    print("\n📚 Criando EPUB...")
    book = epub.EpubBook()
    book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
    book.set_title(titulo)
    book.set_language('pt-BR')
    book.add_author(autor)

    print(f"   📝 Título: {titulo}")
    print(f"   👤 Autor: {autor}")

    # 4. ADICIONAR CAPA
    if capa_path and os.path.exists(capa_path):
        print(f"   🖼️  Processando capa...")
        try:
            with Image.open(capa_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                if img.width > 800 or img.height > 1200:
                    img.thumbnail((800, 1200), Image.Resampling.LANCZOS)
                temp_capa = 'temp_cover.jpg'
                img.save(temp_capa, 'JPEG', quality=90)

            with open(temp_capa, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())

            os.remove(temp_capa)
            print(f"   ✅ Capa adicionada!")
        except Exception as e:
            print(f"   ⚠️  Erro ao adicionar capa: {e}")

    # 5. CRIAR CAPÍTULOS
    print("\n📖 Criando capítulos...")
    capitulos = []
    paginas_por_capitulo = 50

    for i in range(0, len(todo_texto), paginas_por_capitulo):
        chunk = todo_texto[i:i + paginas_por_capitulo]
        cap_num = (i // paginas_por_capitulo) + 1

        c = epub.EpubHtml(
            title=f'Capítulo {cap_num}',
            file_name=f'cap{cap_num}.xhtml',
            lang='pt-BR'
        )

        html = f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Capítulo {cap_num}</title>
<style>
body {{ font-family: Georgia, serif; line-height: 1.6; margin: 20px; text-align: justify; }}
h1 {{ color: #333; border-bottom: 2px solid #666; padding-bottom: 10px; }}
</style>
</head>
<body>
<h1>Capítulo {cap_num}</h1>
<div>{'<br/>'.join(chunk)}</div>
</body>
</html>'''

        c.content = html
        book.add_item(c)
        capitulos.append(c)

    print(f"   ✅ {len(capitulos)} capítulos criados")

    # 6. NAVEGAÇÃO
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 7. SALVAR
    print(f"\n💾 Salvando: {epub_path}")
    epub.write_epub(epub_path, book)

    print(f"\n{'='*70}")
    print(f"✅ CONVERSÃO CONCLUÍDA COM SUCESSO!")
    print(f"{'='*70}")
    print(f"📚 Arquivo: {epub_path}")
    print(f"📝 Título: {titulo}")
    print(f"👤 Autor: {autor}")
    print(f"📖 Capítulos: {len(capitulos)}")
    print(f"📄 Páginas: {len(todo_texto)}")
    print(f"{'='*70}\n")

    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='Conversor PDF para EPUB com metadados completos',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Exemplos:

  Básico:
    python converter_final.py livro.pdf -t "Título" -a "Autor"

  Com capa:
    python converter_final.py livro.pdf -t "Sulco" -a "Nome Autor" -c capa.jpg

  Saída personalizada:
    python converter_final.py livro.pdf -t "Meu Livro" -a "Autor" -o meu_livro.epub
        '''
    )

    parser.add_argument('pdf', help='Arquivo PDF de entrada')
    parser.add_argument('-t', '--titulo', required=True, help='Título do livro')
    parser.add_argument('-a', '--autor', required=True, help='Autor do livro')
    parser.add_argument('-c', '--capa', help='Imagem de capa (JPG/PNG)')
    parser.add_argument('-o', '--output', help='Nome do arquivo EPUB de saída')

    args = parser.parse_args()

    # Validar PDF
    if not os.path.exists(args.pdf):
        print(f"❌ Erro: PDF não encontrado: {args.pdf}")
        sys.exit(1)

    # Validar capa (se fornecida)
    if args.capa and not os.path.exists(args.capa):
        print(f"❌ Erro: Capa não encontrada: {args.capa}")
        sys.exit(1)

    # Nome do output
    if args.output:
        epub_output = args.output
    else:
        epub_output = args.titulo.replace(' ', '_') + '.epub'

    print("=" * 70)
    print("📚 CONVERSOR PDF → EPUB COM METADADOS COMPLETOS")
    print("=" * 70)

    try:
        converter_pdf_para_epub(args.pdf, epub_output, args.titulo, args.autor, args.capa)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
