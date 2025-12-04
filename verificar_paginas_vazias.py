#!/usr/bin/env python3
"""Verifica quais páginas estão vazias"""

import PyPDF2

pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

print(f"🔍 Analisando: {pdf_path}")
print("=" * 70)

with open(pdf_path, 'rb') as f:
    pdf = PyPDF2.PdfReader(f)
    total = len(pdf.pages)

    print(f"Total de páginas: {total}\n")

    vazias = []
    com_texto = []

    for i, page in enumerate(pdf.pages):
        texto = page.extract_text()

        if texto.strip():
            com_texto.append(i + 1)
        else:
            vazias.append(i + 1)

    print(f"✅ Páginas com texto: {len(com_texto)}")
    print(f"❌ Páginas vazias: {len(vazias)}")

    if vazias:
        print(f"\n📄 Páginas vazias (números):")
        print(f"   {vazias}")

        print(f"\n💡 Por que estão vazias?")
        print(f"   - Páginas só com imagens (sem texto)")
        print(f"   - Páginas em branco (separadores)")
        print(f"   - Capas ou contracapas")
        print(f"   - Páginas com design gráfico")

        print(f"\n✅ Isso é NORMAL!")
        print(f"   {(len(com_texto)/total)*100:.1f}% das páginas têm texto extraível")
