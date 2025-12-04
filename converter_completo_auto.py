#!/usr/bin/env python3
"""
🎉 CONVERSOR COMPLETO - 100% AUTOMÁTICO
Extrai: Título + Autor + CAPA automaticamente!
"""

import PyPDF2
import fitz  # PyMuPDF para extrair capa
from ebooklib import epub
from PIL import Image
import sys
import os
import re
import io
from pathlib import Path

def extrair_capa_automaticamente(pdf_path):
    """Extrai capa da página 1 do PDF automaticamente"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]  # Primeira página

        image_list = page.get_images()

        if image_list:
            # Extrair primeira (maior) imagem
            xref = image_list[0][0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            # Salvar temporariamente
            temp_capa = "temp_capa_auto.jpg"

            # Converter e redimensionar
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if img.width > 800 or img.height > 1200:
                img.thumbnail((800, 1200), Image.Resampling.LANCZOS)

            img.save(temp_capa, 'JPEG', quality=90)

            doc.close()
            return temp_capa

        doc.close()
        return None

    except Exception as e:
        print(f"   ⚠️  Não foi possível extrair capa: {e}")
        return None

def limpar_titulo(titulo):
    """Limpa título removendo datas, números, etc"""
    if not titulo:
        return titulo

    # Remover datas
    titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)
    # Remover palavras comuns
    titulo = re.sub(r'\b(diagramado|site|final|v\d+|version)\b', '', titulo, flags=re.IGNORECASE)
    # Remover padrões numéricos
    titulo = re.sub(r'\b\d{3,}\s*[a-z]?\s*\d{3,}\b', '', titulo, flags=re.IGNORECASE)
    # Limpar separadores
    titulo = re.sub(r'[-_]+', ' ', titulo)
    titulo = re.sub(r'\s+', ' ', titulo).strip()
    titulo = titulo.title()

    return titulo

def extrair_metadados(pdf_reader, pdf_path):
    """Extrai título e autor"""
    titulo = None
    autor = None

    # Tentar metadados
    metadata = pdf_reader.metadata
    if metadata:
        if metadata.title:
            titulo = metadata.title.strip()
        if metadata.author:
            autor = metadata.author.strip()

    # Tentar primeira página
    if not titulo:
        try:
            primeira_pagina = pdf_reader.pages[0].extract_text()
            if primeira_pagina:
                linhas = [l.strip() for l in primeira_pagina.split('\n') if l.strip()]
                for linha in linhas[:5]:
                    if 3 < len(linha) < 100:
                        titulo = linha
                        break
        except:
            pass

    # Usar nome do arquivo
    if not titulo:
        titulo = Path(pdf_path).stem

    # Limpar título
    titulo = limpar_titulo(titulo)

    # Autor padrão
    if not autor:
        autor = "Autor Desconhecido"

    return titulo, autor

def converter_pdf_completo(pdf_path):
    """Converte PDF para EPUB - TOTALMENTE AUTOMÁTICO"""

    print(f"\n📄 Analisando: {pdf_path}")
    print("=" * 70)

    if not os.path.exists(pdf_path):
        print(f"❌ PDF não encontrado!")
        return False

    # 1. ABRIR PDF
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        total_paginas = len(pdf.pages)

        print(f"📊 Total: {total_paginas} páginas")

        # 2. EXTRAIR METADADOS
        print(f"\n🔍 Extraindo metadados...")
        titulo, autor = extrair_metadados(pdf, pdf_path)

        print(f"   📝 Título: {titulo}")
        print(f"   👤 Autor: {autor}")

        # 3. PERGUNTAR SE QUER EDITAR
        print(f"\n❓ Editar metadados? (s/N): ", end='')
        try:
            resposta = input().strip().lower()
            if resposta in ['s', 'sim']:
                print(f"\n✏️  Editando (Enter = manter atual):")
                novo_titulo = input(f"   Título [{titulo}]: ").strip()
                novo_autor = input(f"   Autor [{autor}]: ").strip()

                if novo_titulo:
                    titulo = novo_titulo
                if novo_autor:
                    autor = novo_autor

                print(f"\n✅ Atualizado: {titulo} | {autor}")
        except:
            pass

        # 4. EXTRAIR CAPA AUTOMATICAMENTE
        print(f"\n🖼️  Extraindo capa da página 1...")
        capa_path = extrair_capa_automaticamente(pdf_path)

        if capa_path:
            print(f"   ✅ Capa extraída!")
        else:
            print(f"   ⚠️  Sem capa (continuando...)")

        # 5. EXTRAIR TEXTO
        print(f"\n📖 Extraindo texto...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            texto = page.extract_text()
            if texto.strip():
                todo_texto.append(texto)

            if (i + 1) % 100 == 0:
                print(f"   {i + 1}/{total_paginas} páginas...")

        print(f"   ✅ {len(todo_texto)} páginas extraídas")

    # 6. CRIAR EPUB
    print(f"\n📚 Gerando EPUB...")
    book = epub.EpubBook()
    book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
    book.set_title(titulo)
    book.set_language('pt-BR')
    book.add_author(autor)

    # 7. ADICIONAR CAPA
    if capa_path and os.path.exists(capa_path):
        try:
            with open(capa_path, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())
            os.remove(capa_path)  # Limpar temp
            print(f"   ✅ Capa adicionada!")
        except Exception as e:
            print(f"   ⚠️  Erro na capa: {e}")

    # 8. CRIAR CAPÍTULOS
    print(f"\n📖 Organizando capítulos...")
    capitulos = []
    paginas_por_capitulo = 50

    for i in range(0, len(todo_texto), paginas_por_capitulo):
        chunk = todo_texto[i:i + paginas_por_capitulo]
        cap_num = (i // paginas_por_capitulo) + 1

        c = epub.EpubHtml(
            title=f'Capítulo {cap_num}',
            file_name=f'cap{cap_num}.xhtml',
            lang='pt-BR'
        )

        texto_capitulo = '\n\n'.join(chunk)
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

    print(f"   ✅ {len(capitulos)} capítulos criados")

    # 9. NAVEGAÇÃO
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 10. SALVAR
    epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
    epub_nome = re.sub(r'[<>:"|?*]', '', epub_nome)

    print(f"\n💾 Salvando...")
    epub.write_epub(epub_nome, book)

    print(f"\n{'='*70}")
    print(f"✅ CONVERSÃO COMPLETA!")
    print(f"{'='*70}")
    print(f"📚 Arquivo: {epub_nome}")
    print(f"📝 Título: {titulo}")
    print(f"👤 Autor: {autor}")
    print(f"🖼️  Capa: {'Sim' if capa_path else 'Não'}")
    print(f"📖 Capítulos: {len(capitulos)}")
    print(f"📄 Páginas: {len(todo_texto)}")
    print(f"{'='*70}\n")

    return True

if __name__ == "__main__":
    print("="*70)
    print("🎉 CONVERSOR PDF → EPUB - 100% AUTOMÁTICO")
    print("="*70)
    print("Extrai automaticamente: Título + Autor + Capa\n")

    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        converter_pdf_completo(pdf_file)
    else:
        # Converter todos PDFs
        pasta = Path("test_pdfs")
        if not pasta.exists():
            print("❌ Pasta test_pdfs/ não encontrada!")
            sys.exit(1)

        pdfs = list(pasta.glob("*.pdf"))
        if not pdfs:
            print("❌ Nenhum PDF em test_pdfs/")
            sys.exit(1)

        print(f"📁 Encontrados {len(pdfs)} PDF(s)\n")

        for pdf_path in pdfs:
            try:
                converter_pdf_completo(str(pdf_path))
            except Exception as e:
                print(f"\n❌ Erro: {e}\n")
