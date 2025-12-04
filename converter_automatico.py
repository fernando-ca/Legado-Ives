#!/usr/bin/env python3
"""
Conversor AUTOMÁTICO PDF → EPUB
Extrai título e autor automaticamente do PDF
"""

import PyPDF2
from ebooklib import epub
from PIL import Image
import sys
import os
import re
from pathlib import Path

def extrair_metadados_automaticamente(pdf_reader, pdf_path):
    """Extrai título e autor automaticamente do PDF"""

    titulo = None
    autor = None

    # 1. TENTAR METADADOS DO PDF
    metadata = pdf_reader.metadata
    if metadata:
        if metadata.title:
            titulo = metadata.title.strip()
        if metadata.author:
            autor = metadata.author.strip()

    # 2. TENTAR PRIMEIRA PÁGINA (geralmente tem título/autor)
    if not titulo or not autor:
        try:
            primeira_pagina = pdf_reader.pages[0].extract_text()
            linhas = [l.strip() for l in primeira_pagina.split('\n') if l.strip()]

            # Procurar título (primeira linha significativa)
            if not titulo and linhas:
                for linha in linhas[:5]:  # Primeiras 5 linhas
                    if len(linha) > 3 and len(linha) < 100:
                        titulo = linha
                        break

            # Procurar autor (padrões comuns)
            if not autor:
                padroes_autor = [
                    r'(?:por|by|autor|author):\s*(.+)',
                    r'(?:escrito por|written by)\s*(.+)',
                ]
                texto_busca = '\n'.join(linhas[:10])
                for padrao in padroes_autor:
                    match = re.search(padrao, texto_busca, re.IGNORECASE)
                    if match:
                        autor = match.group(1).strip()
                        break

        except Exception as e:
            print(f"   ⚠️  Erro ao extrair da primeira página: {e}")

    # 3. USAR NOME DO ARQUIVO COMO FALLBACK PARA TÍTULO
    if not titulo:
        titulo = Path(pdf_path).stem  # Nome do arquivo sem extensão

    # LIMPAR TÍTULO (remover datas, números, padrões comuns)
    if titulo:
        # Remover padrões de data (2025-09-09, 20250909, etc)
        titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)
        # Remover "diagramado", "site", etc
        titulo = re.sub(r'\b(diagramado|site|final|v\d+|version)\b', '', titulo, flags=re.IGNORECASE)
        # Remover padrões como "001-a-607", "001 a 607"
        titulo = re.sub(r'\b\d{3,}\s*[a-z]?\s*\d{3,}\b', '', titulo, flags=re.IGNORECASE)
        # Substituir separadores por espaços
        titulo = re.sub(r'[-_]+', ' ', titulo)
        # Limpar múltiplos espaços
        titulo = re.sub(r'\s+', ' ', titulo).strip()
        # Capitalizar primeira letra de cada palavra
        titulo = titulo.title()

    # 4. FALLBACK PARA AUTOR
    if not autor:
        autor = "Autor Desconhecido"

    return titulo, autor

def buscar_capa_automatica(pdf_path):
    """Busca capa automaticamente na pasta"""

    pasta = Path(pdf_path).parent
    nome_pdf = Path(pdf_path).stem.lower()

    # Procurar em test_covers/
    pasta_covers = Path("test_covers")
    if pasta_covers.exists():
        for ext in ['jpg', 'jpeg', 'png']:
            # Tentar nome exato
            capa = pasta_covers / f"{nome_pdf}.{ext}"
            if capa.exists():
                return str(capa)

            # Tentar "capa.jpg"
            capa_generica = pasta_covers / f"capa.{ext}"
            if capa_generica.exists():
                return str(capa_generica)

    return None

def converter_pdf_automatico(pdf_path):
    """Converte PDF automaticamente extraindo metadados"""

    print(f"\n📄 Analisando: {pdf_path}")
    print("=" * 70)

    if not os.path.exists(pdf_path):
        print(f"❌ Erro: PDF não encontrado!")
        return False

    # 1. ABRIR PDF E EXTRAIR METADADOS
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        total_paginas = len(pdf.pages)

        print(f"📊 Total de páginas: {total_paginas}")

        # EXTRAIR TÍTULO E AUTOR AUTOMATICAMENTE
        print("\n🔍 Extraindo metadados automaticamente...")
        titulo, autor = extrair_metadados_automaticamente(pdf, pdf_path)

        print(f"   📝 Título detectado: {titulo}")
        print(f"   👤 Autor detectado: {autor}")

        # PERGUNTAR SE QUER EDITAR
        print(f"\n❓ Deseja editar os metadados? (s/N): ", end='')
        try:
            resposta = input().strip().lower()
            if resposta == 's' or resposta == 'sim':
                print(f"\n✏️  Editando metadados (deixe em branco para manter o atual):")
                novo_titulo = input(f"   Título [{titulo}]: ").strip()
                novo_autor = input(f"   Autor [{autor}]: ").strip()

                if novo_titulo:
                    titulo = novo_titulo
                if novo_autor:
                    autor = novo_autor

                print(f"\n✅ Metadados atualizados!")
                print(f"   📝 Título: {titulo}")
                print(f"   👤 Autor: {autor}")
        except:
            print(f"   ⏭️  Mantendo metadados detectados...")

        # BUSCAR CAPA AUTOMATICAMENTE
        capa_path = buscar_capa_automatica(pdf_path)
        if capa_path:
            print(f"   🖼️  Capa encontrada: {capa_path}")
        else:
            print(f"   ⚠️  Capa não encontrada (continuando sem capa)")

        # 2. EXTRAIR TEXTO
        print(f"\n📖 Extraindo texto das páginas...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            texto = page.extract_text()
            if texto.strip():
                todo_texto.append(texto)

            if (i + 1) % 100 == 0:
                print(f"   Processadas {i + 1}/{total_paginas} páginas...")

        print(f"   ✅ {len(todo_texto)} páginas com texto extraído")

    # 3. CRIAR EPUB
    print(f"\n📚 Gerando EPUB...")
    book = epub.EpubBook()
    book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
    book.set_title(titulo)
    book.set_language('pt-BR')
    book.add_author(autor)

    # 4. ADICIONAR CAPA (se encontrada)
    if capa_path:
        try:
            with Image.open(capa_path) as img:
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                if img.width > 800 or img.height > 1200:
                    img.thumbnail((800, 1200), Image.Resampling.LANCZOS)

                temp_capa = 'temp_cover.jpg'
                img.save(temp_capa, 'JPEG', quality=90)

            with open(temp_capa, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())

            os.remove(temp_capa)
            print(f"   ✅ Capa adicionada!")
        except Exception as e:
            print(f"   ⚠️  Erro ao processar capa: {e}")

    # 5. CRIAR CAPÍTULOS
    print(f"\n📖 Organizando em capítulos...")
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

        # Criar HTML simples (igual ao converter_direto.py que funcionou)
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

    # 6. NAVEGAÇÃO
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 7. SALVAR
    epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
    epub_nome = re.sub(r'[<>:"|?*]', '', epub_nome)  # Remover caracteres inválidos

    print(f"\n💾 Salvando EPUB...")
    epub.write_epub(epub_nome, book)

    print(f"\n{'='*70}")
    print(f"✅ CONVERSÃO CONCLUÍDA COM SUCESSO!")
    print(f"{'='*70}")
    print(f"📚 Arquivo: {epub_nome}")
    print(f"📝 Título: {titulo}")
    print(f"👤 Autor: {autor}")
    print(f"🖼️  Capa: {'Sim' if capa_path else 'Não'}")
    print(f"📖 Capítulos: {len(capitulos)}")
    print(f"📄 Páginas: {len(todo_texto)}")
    print(f"{'='*70}\n")

    return True

def converter_todos_pdfs_na_pasta():
    """Converte TODOS os PDFs na pasta test_pdfs/"""

    pasta = Path("test_pdfs")

    if not pasta.exists():
        print("❌ Pasta test_pdfs/ não encontrada!")
        return

    pdfs = list(pasta.glob("*.pdf"))

    if not pdfs:
        print("❌ Nenhum PDF encontrado em test_pdfs/")
        return

    print(f"\n{'='*70}")
    print(f"📚 CONVERSOR AUTOMÁTICO - MODO LOTE")
    print(f"{'='*70}")
    print(f"📁 Encontrados {len(pdfs)} PDF(s) em test_pdfs/\n")

    sucesso = 0
    erros = 0

    for pdf_path in pdfs:
        try:
            converter_pdf_automatico(str(pdf_path))
            sucesso += 1
        except Exception as e:
            print(f"\n❌ Erro ao converter {pdf_path.name}: {e}")
            erros += 1

        print()  # Linha em branco entre conversões

    print(f"\n{'='*70}")
    print(f"📊 RESULTADO FINAL")
    print(f"{'='*70}")
    print(f"✅ Sucesso: {sucesso}")
    print(f"❌ Erros: {erros}")
    print(f"{'='*70}\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Converter PDF específico
        pdf_file = sys.argv[1]
        converter_pdf_automatico(pdf_file)
    else:
        # Converter TODOS os PDFs em test_pdfs/
        converter_todos_pdfs_na_pasta()
