#!/usr/bin/env python3
"""
Wrapper para executar o conversor com encoding correto
"""
import sys
import os

# Forçar UTF-8
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Importar e executar o conversor
from converter_completo_auto import converter_pdf_completo

if __name__ == "__main__":
    pdf_path = r"c:\Users\caber\Documents\devops\Legado Ives\test_pdfs\LIVRO-Uma-breve-teoria-do-Poder.pdf"

    print("=" * 70)
    print("CONVERSOR PDF -> EPUB - 100% AUTOMATICO")
    print("=" * 70)
    print("Extrai automaticamente: Titulo + Autor + Capa\n")

    try:
        converter_pdf_completo(pdf_path)
    except Exception as e:
        print(f"\nErro: {e}")
        import traceback
        traceback.print_exc()
