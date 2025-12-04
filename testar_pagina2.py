#!/usr/bin/env python3
"""Testar extração da página 2 para encontrar autor"""

import PyPDF2

pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

print("🔍 Analisando primeiras páginas para encontrar autor...\n")

with open(pdf_path, 'rb') as f:
    pdf = PyPDF2.PdfReader(f)

    # Testar páginas 1-5
    for i in range(min(5, len(pdf.pages))):
        print(f"{'='*70}")
        print(f"📄 PÁGINA {i+1}")
        print(f"{'='*70}")

        texto = pdf.pages[i].extract_text()

        if texto.strip():
            linhas = texto.split('\n')
            print(f"Primeiras 20 linhas:\n")
            for j, linha in enumerate(linhas[:20], 1):
                if linha.strip():
                    print(f"{j:2d}. {linha.strip()}")
            print()
        else:
            print("⚠️  Página vazia\n")
