#!/usr/bin/env python3
"""Busca completa por autor no PDF"""

import PyPDF2
import re

pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

print("🔍 Buscando autor no PDF (primeiras 30 páginas)...\n")

with open(pdf_path, 'rb') as f:
    pdf = PyPDF2.PdfReader(f)

    # Padrões para encontrar autor
    padroes = [
        r'(?:autor|author|escrito\s+por|written\s+by|por)[\s:]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)',
        r'([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3})\s*\n\s*(?:autor|author)',
        r'©\s*\d{4}\s+(?:por|by)?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)',
        r'todos\s+os\s+direitos\s+reservados.*?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)+)',
    ]

    encontrou = False

    # Buscar nas primeiras 30 páginas
    for i in range(min(30, len(pdf.pages))):
        texto = pdf.pages[i].extract_text()

        if not texto.strip():
            continue

        # Tentar cada padrão
        for padrao in padroes:
            matches = re.findall(padrao, texto, re.IGNORECASE | re.MULTILINE)
            if matches:
                print(f"📄 Página {i+1} - Padrão encontrado:")
                for match in matches:
                    print(f"   👤 Possível autor: {match}")
                encontrou = True

        # Mostrar conteúdo de páginas com palavras-chave
        texto_lower = texto.lower()
        if any(palavra in texto_lower for palavra in ['autor', 'author', 'escrito', 'written', '©', 'copyright', 'direitos']):
            print(f"\n{'='*70}")
            print(f"📄 PÁGINA {i+1} (contém palavras-chave)")
            print(f"{'='*70}")
            linhas = [l.strip() for l in texto.split('\n') if l.strip()]
            for linha in linhas[:30]:
                print(f"   {linha}")
            print()

    if not encontrou:
        print("\n⚠️  Nenhum padrão de autor encontrado automaticamente")
        print("\n💡 Isso é normal! Muitos PDFs não têm o autor nos metadados.")
        print("   Soluções:")
        print("   1. Use modo interativo (digite S) para adicionar manualmente")
        print("   2. Renomeie o PDF: 'Sulco - Nome do Autor.pdf'")
        print("   3. Deixe 'Autor Desconhecido' (pode editar depois no leitor)")
