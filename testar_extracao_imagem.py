#!/usr/bin/env python3
"""Testar se consegue extrair imagens do PDF"""

import PyPDF2
from PIL import Image
import io

pdf_path = "test_pdfs/Sulco-001-a-607-diagramado-site-2025-09-09.pdf"

print("🔍 Tentando extrair imagens da página 1 (capa)...\n")

try:
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        page = pdf.pages[0]  # Primeira página (capa)

        print("📄 Analisando página 1...")

        # Tentar extrair imagens (método PyPDF2)
        if '/XObject' in page['/Resources']:
            xObject = page['/Resources']['/XObject'].get_object()

            print(f"✅ Encontrados {len(xObject)} objetos na página\n")

            img_count = 0
            for obj_name in xObject:
                obj = xObject[obj_name]

                if obj['/Subtype'] == '/Image':
                    img_count += 1
                    print(f"🖼️  Imagem {img_count} encontrada: {obj_name}")

                    try:
                        # Extrair dados da imagem
                        size = (obj['/Width'], obj['/Height'])
                        data = obj.get_data()

                        print(f"   Tamanho: {size[0]}x{size[1]} pixels")
                        print(f"   Dados: {len(data)} bytes")

                        # Salvar imagem
                        if obj['/ColorSpace'] == '/DeviceRGB':
                            mode = "RGB"
                        else:
                            mode = "P"

                        img = Image.frombytes(mode, size, data)
                        img_file = f'capa_extraida_{img_count}.jpg'
                        img.save(img_file)
                        print(f"   ✅ Salva como: {img_file}\n")

                    except Exception as e:
                        print(f"   ⚠️  Erro ao processar: {e}\n")

            if img_count == 0:
                print("❌ Nenhuma imagem encontrada na página 1")
                print("\n💡 A capa pode ser:")
                print("   - Um PDF vetorial (não é imagem bitmap)")
                print("   - Estar em outra página")
                print("   - Estar embutida de forma diferente")

        else:
            print("❌ Página 1 não tem XObject (sem imagens)")

except Exception as e:
    print(f"❌ Erro: {e}")

print("\n" + "="*70)
print("📝 CONCLUSÃO:")
print("="*70)
print("Se extraiu imagens acima, posso automatizar!")
print("Se não extraiu, é melhor fornecer capa manualmente.")
