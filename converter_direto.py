#!/usr/bin/env python3
"""Conversor DIRETO - sem complicação"""

import PyPDF2
from ebooklib import epub
import sys

def converter_pdf_para_epub(pdf_path, epub_path):
    """Converte PDF para EPUB de forma direta"""

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
    book.set_title('Sulco')
    book.set_language('pt')
    book.add_author('Autor Desconhecido')

    # 4. DIVIDIR EM CAPÍTULOS (cada 50 páginas)
    capitulos = []
    paginas_por_capitulo = 50

    for i in range(0, len(todo_texto), paginas_por_capitulo):
        chunk = todo_texto[i:i + paginas_por_capitulo]
        texto_capitulo = '\n\n'.join(chunk)

        cap_num = (i // paginas_por_capitulo) + 1

        c = epub.EpubHtml(
            title=f'Capítulo {cap_num}',
            file_name=f'cap{cap_num}.xhtml',
            lang='pt'
        )

        # HTML simples
        html = f'''<html>
<head><title>Capítulo {cap_num}</title></head>
<body>
<h1>Capítulo {cap_num}</h1>
<div style="text-align: justify;">
{texto_capitulo.replace(chr(10), '<br/>')}
</div>
</body>
</html>'''

        c.content = html
        book.add_item(c)
        capitulos.append(c)

        print(f"   Capítulo {cap_num} criado")

    # 5. CONFIGURAR NAVEGAÇÃO
    print("🧭 Configurando navegação...")
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 6. SALVAR
    print(f"💾 Salvando: {epub_path}")
    epub.write_epub(epub_path, book)

    print(f"✅ SUCESSO! EPUB criado com {len(capitulos)} capítulos")
    return True

if __name__ == "__main__":
    pdf_file = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"
    epub_file = "Sulco.epub"

    try:
        converter_pdf_para_epub(pdf_file, epub_file)
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
