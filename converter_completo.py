#!/usr/bin/env python3
"""Conversor PDF para EPUB com TÍTULO, AUTOR e CAPA"""

import PyPDF2
from ebooklib import epub
from PIL import Image
import sys
import os

def converter_pdf_para_epub(pdf_path, epub_path, titulo=None, autor=None, capa_path=None):
    """Converte PDF para EPUB com metadados completos"""

    print(f"📄 Lendo: {pdf_path}")

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
    print("📚 Criando EPUB...")
    book = epub.EpubBook()
    book.set_identifier('sulco-epub-001')

    # METADADOS
    book.set_title(titulo or 'Livro sem título')
    book.set_language('pt-BR')

    if autor:
        book.add_author(autor)
    else:
        book.add_author('Autor Desconhecido')

    print(f"   📝 Título: {titulo or 'Livro sem título'}")
    print(f"   👤 Autor: {autor or 'Autor Desconhecido'}")

    # 4. ADICIONAR CAPA (se fornecida)
    if capa_path and os.path.exists(capa_path):
        print(f"   🖼️  Adicionando capa: {capa_path}")
        try:
            # Processar imagem
            with Image.open(capa_path) as img:
                # Converter para RGB se necessário
                if img.mode != 'RGB':
                    img = img.convert('RGB')

                # Redimensionar se muito grande
                if img.width > 800 or img.height > 1200:
                    img.thumbnail((800, 1200), Image.Resampling.LANCZOS)

                # Salvar temporariamente
                temp_capa = 'temp_cover.jpg'
                img.save(temp_capa, 'JPEG', quality=90)

            # Adicionar ao EPUB
            with open(temp_capa, 'rb') as capa_file:
                capa_data = capa_file.read()

            book.set_cover('cover.jpg', capa_data)

            # Limpar arquivo temporário
            os.remove(temp_capa)
            print(f"   ✅ Capa adicionada!")

        except Exception as e:
            print(f"   ⚠️  Erro ao adicionar capa: {e}")
    else:
        print(f"   ⚠️  Sem capa fornecida")

    # 5. DIVIDIR EM CAPÍTULOS (cada 50 páginas)
    print("📖 Criando capítulos...")
    capitulos = []
    paginas_por_capitulo = 50

    for i in range(0, len(todo_texto), paginas_por_capitulo):
        chunk = todo_texto[i:i + paginas_por_capitulo]
        texto_capitulo = '\n\n'.join(chunk)

        cap_num = (i // paginas_por_capitulo) + 1

        c = epub.EpubHtml(
            title=f'Capítulo {cap_num}',
            file_name=f'cap{cap_num}.xhtml',
            lang='pt-BR'
        )

        # HTML formatado
        html = f'''<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title>Capítulo {cap_num}</title>
<style>
body {{
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 20px;
    text-align: justify;
}}
h1 {{
    color: #333;
    border-bottom: 2px solid #666;
    padding-bottom: 10px;
}}
</style>
</head>
<body>
<h1>Capítulo {cap_num}</h1>
<div>
{texto_capitulo.replace(chr(10), '<br/>\n')}
</div>
</body>
</html>'''

        c.content = html
        book.add_item(c)
        capitulos.append(c)

    print(f"   ✅ {len(capitulos)} capítulos criados")

    # 6. CONFIGURAR NAVEGAÇÃO
    print("🧭 Configurando navegação...")
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 7. SALVAR
    print(f"💾 Salvando: {epub_path}")
    epub.write_epub(epub_path, book)

    print(f"\n✅ SUCESSO!")
    print(f"   📚 Arquivo: {epub_path}")
    print(f"   📖 Capítulos: {len(capitulos)}")
    print(f"   📄 Páginas: {len(todo_texto)}")

    return True

if __name__ == "__main__":
    # Você pode mudar estes valores aqui:
    PDF_FILE = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"
    EPUB_FILE = "Sulco_Completo.epub"
    TITULO = "Sulco"  # ← MUDE AQUI
    AUTOR = "Seu Nome"  # ← MUDE AQUI
    CAPA = None  # ← Se tiver capa, coloque: "test_covers/capa.jpg"

    print("=" * 70)
    print("📚 CONVERSOR PDF → EPUB COM METADADOS")
    print("=" * 70)
    print()

    try:
        converter_pdf_para_epub(PDF_FILE, EPUB_FILE, TITULO, AUTOR, CAPA)
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
