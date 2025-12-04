#!/usr/bin/env python3
"""Teste simples e direto"""

import PyPDF2
from ebooklib import epub

# 1. LER PDF
print("1. Lendo PDF...")
with open("test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf", 'rb') as f:
    pdf = PyPDF2.PdfReader(f)

    # Pegar texto da página 62 (sabemos que tem conteúdo)
    texto = pdf.pages[61].extract_text()
    print(f"   Texto extraído: {len(texto)} caracteres")
    print(f"   Primeira linha: {texto[:100]}")

# 2. CRIAR EPUB
print("\n2. Criando EPUB...")
book = epub.EpubBook()
book.set_identifier('test123')
book.set_title('Sulco')
book.set_language('pt')
book.add_author('Teste')

# 3. ADICIONAR CAPÍTULO
print("3. Adicionando capítulo...")
c1 = epub.EpubHtml(title='Capítulo 1', file_name='cap1.xhtml', lang='pt')
c1.content = f'<html><body><h1>Capítulo 1</h1><p>{texto}</p></body></html>'
book.add_item(c1)

# 4. CONFIGURAR NAVEGAÇÃO
print("4. Configurando navegação...")
book.toc = (c1,)
book.spine = ['nav', c1]
book.add_item(epub.EpubNcx())
book.add_item(epub.EpubNav())

# 5. SALVAR
print("5. Salvando EPUB...")
epub.write_epub('teste_sulco.epub', book)
print("✅ SUCESSO! Arquivo: teste_sulco.epub")
