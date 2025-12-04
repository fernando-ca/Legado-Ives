#!/usr/bin/env python3
"""
Script de diagnóstico para verificar extração de PDF
"""

import PyPDF2
import sys

def diagnosticar_pdf(pdf_path):
    """Diagnóstica extração de PDF"""
    print(f"🔍 Diagnóstico do PDF: {pdf_path}")
    print("=" * 70)

    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)

            print(f"\n📊 Informações Gerais:")
            print(f"  Total de páginas: {len(pdf_reader.pages)}")

            # Testar primeiras 3 páginas
            print(f"\n📄 Testando extração das primeiras 3 páginas:")
            print("-" * 70)

            for i in range(min(3, len(pdf_reader.pages))):
                page = pdf_reader.pages[i]
                text = page.extract_text()

                print(f"\n📖 Página {i+1}:")
                print(f"  Caracteres extraídos: {len(text)}")
                print(f"  Linhas: {len(text.split(chr(10)))}")

                if text.strip():
                    print(f"  Primeiros 200 caracteres:")
                    print(f"  {text[:200]}")
                    print(f"  ...")
                else:
                    print(f"  ⚠️  VAZIO - Nenhum texto extraído!")

            # Verificar se há texto em pelo menos 10 páginas aleatórias
            print(f"\n📊 Amostragem de 10 páginas:")
            print("-" * 70)

            import random
            total_pages = len(pdf_reader.pages)
            sample_pages = random.sample(range(total_pages), min(10, total_pages))

            vazias = 0
            com_texto = 0

            for page_num in sorted(sample_pages):
                page = pdf_reader.pages[page_num]
                text = page.extract_text()

                if text.strip():
                    com_texto += 1
                    status = "✅"
                else:
                    vazias += 1
                    status = "❌"

                print(f"  Página {page_num+1:3d}: {status} ({len(text)} chars)")

            print(f"\n📈 Resultado da Amostragem:")
            print(f"  Páginas com texto: {com_texto}/{len(sample_pages)}")
            print(f"  Páginas vazias: {vazias}/{len(sample_pages)}")

            if vazias > com_texto:
                print(f"\n⚠️  PROBLEMA DETECTADO:")
                print(f"  Este PDF parece ser escaneado (imagens) ou tem proteção.")
                print(f"  PyPDF2 não consegue extrair texto de PDFs escaneados.")
                print(f"\n💡 Soluções:")
                print(f"  1. Use um PDF com texto extraível (não escaneado)")
                print(f"  2. Use OCR para converter imagens em texto")
                print(f"  3. Experimente com outro PDF")
            elif com_texto > 0:
                print(f"\n✅ PDF parece ter texto extraível!")
                print(f"  O conversor deve funcionar.")

    except Exception as e:
        print(f"\n❌ Erro ao analisar PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

    diagnosticar_pdf(pdf_path)
