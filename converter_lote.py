#!/usr/bin/env python3
"""
📚 CONVERSOR EM LOTE - 50+ LIVROS
Com planilha CSV para gerenciar metadados
"""

import PyPDF2
import fitz
from ebooklib import epub
from PIL import Image
import os
import re
import io
import csv
from pathlib import Path
from datetime import datetime

def extrair_capa_auto(pdf_path):
    """Extrai capa da página 1"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        image_list = page.get_images()

        if image_list:
            xref = image_list[0][0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            temp_capa = f"temp_capa_{Path(pdf_path).stem}.jpg"
            img = Image.open(io.BytesIO(image_bytes))
            if img.mode != 'RGB':
                img = img.convert('RGB')
            if img.width > 800 or img.height > 1200:
                img.thumbnail((800, 1200), Image.Resampling.LANCZOS)
            img.save(temp_capa, 'JPEG', quality=90)

            doc.close()
            return temp_capa

        doc.close()
    except:
        pass
    return None

def limpar_titulo(titulo):
    """Limpa título"""
    titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)
    titulo = re.sub(r'\b(diagramado|site|final|v\d+)\b', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\b\d{3,}\s*[a-z]?\s*\d{3,}\b', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'[-_]+', ' ', titulo)
    titulo = re.sub(r'\s+', ' ', titulo).strip()
    return titulo.title()

def converter_pdf_silencioso(pdf_path, titulo=None, autor=None, mostrar_progresso=False):
    """Converte PDF silenciosamente (para lote)"""

    if mostrar_progresso:
        print(f"  📄 {Path(pdf_path).name}...", end='', flush=True)

    try:
        # Extrair metadados
        with open(pdf_path, 'rb') as f:
            pdf = PyPDF2.PdfReader(f)

            if not titulo:
                metadata = pdf.metadata
                if metadata and metadata.title:
                    titulo = metadata.title.strip()
                else:
                    titulo = Path(pdf_path).stem
                titulo = limpar_titulo(titulo)

            if not autor:
                if metadata and metadata.author:
                    autor = metadata.author.strip()
                else:
                    autor = "Autor Desconhecido"

            # Extrair texto
            todo_texto = []
            for page in pdf.pages:
                texto = page.extract_text()
                if texto.strip():
                    todo_texto.append(texto)

        # Extrair capa
        capa_path = extrair_capa_auto(pdf_path)

        # Criar EPUB
        book = epub.EpubBook()
        book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
        book.set_title(titulo)
        book.set_language('pt-BR')
        book.add_author(autor)

        # Adicionar capa
        if capa_path and os.path.exists(capa_path):
            with open(capa_path, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())
            os.remove(capa_path)

        # Criar capítulos
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

        # Navegação
        book.toc = tuple(capitulos)
        book.spine = ['nav'] + capitulos
        book.add_item(epub.EpubNcx())
        book.add_item(epub.EpubNav())

        # Salvar
        epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
        epub_nome = re.sub(r'[<>:"|?*]', '', epub_nome)

        # Salvar em pasta output_epubs/
        output_dir = Path("output_epubs")
        output_dir.mkdir(exist_ok=True)
        epub_path = output_dir / epub_nome

        epub.write_epub(str(epub_path), book)

        if mostrar_progresso:
            print(f" ✅")

        return {
            'sucesso': True,
            'pdf': Path(pdf_path).name,
            'epub': epub_nome,
            'titulo': titulo,
            'autor': autor,
            'paginas': len(todo_texto),
            'capitulos': len(capitulos),
            'capa': bool(capa_path)
        }

    except Exception as e:
        if mostrar_progresso:
            print(f" ❌ {str(e)[:50]}")
        return {
            'sucesso': False,
            'pdf': Path(pdf_path).name,
            'erro': str(e)
        }

def ler_planilha_metadados(csv_path="metadados.csv"):
    """Lê planilha CSV com metadados dos livros"""
    metadados = {}

    if not os.path.exists(csv_path):
        return metadados

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pdf_nome = row.get('PDF', '').strip()
            if pdf_nome:
                metadados[pdf_nome] = {
                    'titulo': row.get('Título', '').strip(),
                    'autor': row.get('Autor', '').strip()
                }

    return metadados

def criar_planilha_exemplo():
    """Cria planilha CSV de exemplo"""
    csv_path = "metadados.csv"

    if os.path.exists(csv_path):
        print(f"⚠️  {csv_path} já existe. Não foi sobrescrito.")
        return

    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['PDF', 'Título', 'Autor'])
        writer.writerow(['exemplo1.pdf', 'Dom Casmurro', 'Machado de Assis'])
        writer.writerow(['exemplo2.pdf', 'O Cortiço', 'Aluísio Azevedo'])
        writer.writerow(['', '', ''])

    print(f"✅ Criado: {csv_path}")
    print(f"   Edite este arquivo no Excel com os dados dos seus livros!")

def converter_lote():
    """Converte todos os PDFs em test_pdfs/"""

    print("=" * 70)
    print("📚 CONVERSOR EM LOTE - 50+ LIVROS")
    print("=" * 70)
    print()

    # Verificar pasta
    pasta_pdfs = Path("test_pdfs")
    if not pasta_pdfs.exists():
        print("❌ Pasta test_pdfs/ não encontrada!")
        return

    # Listar PDFs
    pdfs = list(pasta_pdfs.glob("*.pdf"))
    if not pdfs:
        print("❌ Nenhum PDF encontrado em test_pdfs/")
        return

    print(f"📁 Encontrados: {len(pdfs)} PDF(s)")

    # Ler metadados da planilha
    metadados = ler_planilha_metadados()
    if metadados:
        print(f"📊 Planilha: {len(metadados)} livros com metadados")
    else:
        print(f"⚠️  Sem planilha metadados.csv (usando detecção automática)")

    print(f"\n🚀 Iniciando conversões...")
    print("-" * 70)

    # Converter todos
    resultados = []
    inicio = datetime.now()

    for i, pdf_path in enumerate(pdfs, 1):
        print(f"{i:3d}/{len(pdfs)}", end=' ')

        # Buscar metadados na planilha
        pdf_nome = pdf_path.name
        meta = metadados.get(pdf_nome, {})
        titulo = meta.get('titulo') or None
        autor = meta.get('autor') or None

        # Converter
        resultado = converter_pdf_silencioso(
            str(pdf_path),
            titulo=titulo,
            autor=autor,
            mostrar_progresso=True
        )
        resultados.append(resultado)

    # Relatório final
    tempo_total = (datetime.now() - inicio).total_seconds()

    print()
    print("=" * 70)
    print("📊 RELATÓRIO FINAL")
    print("=" * 70)

    sucesso = [r for r in resultados if r['sucesso']]
    erros = [r for r in resultados if not r['sucesso']]

    print(f"\n✅ Sucessos: {len(sucesso)}/{len(resultados)}")
    print(f"❌ Erros: {len(erros)}/{len(resultados)}")
    print(f"⏱️  Tempo total: {tempo_total:.1f}s")
    print(f"⚡ Média: {tempo_total/len(resultados):.1f}s por livro")

    if sucesso:
        print(f"\n✅ LIVROS CONVERTIDOS:")
        for r in sucesso:
            print(f"  📚 {r['titulo']}")
            print(f"     Autor: {r['autor']}")
            print(f"     EPUB: {r['epub']}")
            print(f"     Páginas: {r['paginas']} | Capítulos: {r['capitulos']} | Capa: {'Sim' if r['capa'] else 'Não'}")
            print()

    if erros:
        print(f"\n❌ ERROS:")
        for r in erros:
            print(f"  • {r['pdf']}: {r['erro']}")

    print(f"\n📁 EPUBs salvos em: output_epubs/")
    print("=" * 70)

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--criar-planilha":
        criar_planilha_exemplo()
    else:
        converter_lote()
