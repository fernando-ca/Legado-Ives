#!/usr/bin/env python3
"""Extrair capa usando PyMuPDF"""

import fitz  # PyMuPDF
from PIL import Image
import io

pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

print("🖼️  Extraindo capa da página 1 com PyMuPDF...\n")

try:
    doc = fitz.open(pdf_path)
    page = doc[0]  # Primeira página

    # Pegar lista de imagens
    image_list = page.get_images()

    print(f"✅ Encontradas {len(image_list)} imagens na página 1\n")

    if image_list:
        # Pegar a primeira (maior) imagem
        xref = image_list[0][0]  # ID da imagem
        base_image = doc.extract_image(xref)

        image_bytes = base_image["image"]
        image_ext = base_image["ext"]

        print(f"📊 Informações:")
        print(f"   Formato: {image_ext}")
        print(f"   Tamanho: {len(image_bytes)} bytes")

        # Salvar
        capa_file = f"capa_extraida.{image_ext}"
        with open(capa_file, "wb") as f:
            f.write(image_bytes)

        print(f"\n✅ CAPA EXTRAÍDA COM SUCESSO!")
        print(f"📁 Arquivo: {capa_file}")

        # Verificar dimensões
        img = Image.open(io.BytesIO(image_bytes))
        print(f"🖼️  Dimensões: {img.width}x{img.height} pixels")
        print(f"\n🎉 Agora posso automatizar isso no conversor!")

    else:
        print("❌ Nenhuma imagem encontrada")

    doc.close()

except Exception as e:
    print(f"❌ Erro: {e}")
    print("\n⚠️  PyMuPDF pode não estar instalado.")
    print("   Execute: pip install PyMuPDF")
