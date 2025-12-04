#!/usr/bin/env python3
"""
Conversor 100% automático SEM INPUT do usuário
"""
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')

import PyPDF2
import fitz  # PyMuPDF
from ebooklib import epub
from PIL import Image
import os
import re
import io
from pathlib import Path

def extrair_capa_automaticamente(pdf_path):
    """Extrai capa da página 1 do PDF automaticamente"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        image_list = page.get_images()

        if image_list:
            xref = image_list[0][0]
            base_image = doc.extract_image(xref)
            image_bytes = base_image["image"]

            temp_capa = "temp_capa_auto.jpg"
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
        print(f"   Aviso: Nao foi possivel extrair capa: {e}")
        return None

def limpar_titulo(titulo):
    """Limpa título removendo datas, números, etc"""
    if not titulo:
        return titulo

    titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)
    titulo = re.sub(r'\b(diagramado|site|final|v\d+|version)\b', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\b\d{3,}\s*[a-z]?\s*\d{3,}\b', '', titulo, flags=re.IGNORECASE)
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
        if metadata.title and metadata.title.strip() not in ['', 'Kodak Capture Pro Software']:
            titulo = metadata.title.strip()
        if metadata.author and metadata.author.strip() not in ['', 'Kodak Capture Pro Software']:
            autor = metadata.author.strip()

    # Tentar primeira página - busca inteligente
    try:
        primeira_pagina = pdf_reader.pages[0].extract_text()
        if primeira_pagina:
            linhas = [l.strip() for l in primeira_pagina.split('\n') if l.strip()]

            # Primeira passada: identificar linhas candidatas
            candidatos_autor = []
            candidatos_titulo = []

            for i, linha in enumerate(linhas[:25]):
                linha_upper = linha.upper()

                # Pular linhas indesejadas
                if re.search(r'\d+[=\s]*EDICAO', linha_upper):
                    continue
                if any(palavra in linha_upper for palavra in ['KODAK', 'COPYRIGHT', 'LIVRARIA', 'EDITORA']):
                    continue
                if len(linha) < 5 or len(linha) > 100:
                    continue

                # Linhas em maiúsculas são candidatas
                if linha == linha.upper():
                    palavras = linha.split()

                    # Candidato a autor: nomes próprios (2-5 palavras)
                    if 2 <= len(palavras) <= 5:
                        # Verificar se parece um nome (não tem palavras comuns de título)
                        if not any(palavra in linha_upper for palavra in ['TEORIA', 'PODER', 'BREVE', 'LIVRO', 'HISTORIA', 'MANUAL', 'GUIA', 'PREFACIO']):
                            candidatos_autor.append((i, linha))

                    # Candidato a título: frases (2-15 palavras)
                    if 2 <= len(palavras) <= 15:
                        # Verificar se parece um título (tem palavras substantivas)
                        if any(palavra in linha_upper for palavra in ['TEORIA', 'PODER', 'BREVE', 'UMA', 'HISTORIA', 'MANUAL', 'GUIA', 'TRATADO']):
                            candidatos_titulo.append((i, linha))

            # Processar candidatos
            # Autor: primeiro nome encontrado
            if candidatos_autor and not autor:
                autor = candidatos_autor[0][1].title()

            # Título: frase após o autor ou primeira frase substantiva
            if candidatos_titulo and not titulo:
                # Se tem autor, pegar título que vem depois
                if candidatos_autor:
                    idx_autor = candidatos_autor[0][0]
                    for idx, linha in candidatos_titulo:
                        if idx > idx_autor:
                            titulo = linha.title()
                            break
                # Se não tem autor, pegar primeiro candidato
                if not titulo:
                    titulo = candidatos_titulo[0][1].title()

            # Fallback: procurar qualquer linha significativa
            if not titulo:
                for linha in linhas[:15]:
                    if re.search(r'\d+[=\s]*EDICAO', linha.upper()):
                        continue
                    if 10 < len(linha) < 100:
                        titulo = linha
                        break

    except Exception as e:
        print(f"   Aviso ao extrair da primeira pagina: {e}")

    # Usar nome do arquivo se ainda não tiver
    if not titulo:
        titulo = Path(pdf_path).stem
        # Remover prefixo "LIVRO-" se existir
        titulo = re.sub(r'^LIVRO[-_]', '', titulo, flags=re.IGNORECASE)

    titulo = limpar_titulo(titulo) if titulo else "Livro Sem Titulo"

    if not autor:
        autor = "Autor Desconhecido"

    return titulo, autor

def converter_pdf_completo(pdf_path):
    """Converte PDF para EPUB - TOTALMENTE AUTOMATICO"""

    print(f"\nAnalisando: {pdf_path}")
    print("=" * 70)

    if not os.path.exists(pdf_path):
        print(f"Erro: PDF nao encontrado!")
        return False

    # 1. ABRIR PDF
    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        total_paginas = len(pdf.pages)

        print(f"Total: {total_paginas} paginas")

        # 2. EXTRAIR METADADOS
        print(f"\nExtraindo metadados...")
        titulo, autor = extrair_metadados(pdf, pdf_path)

        print(f"   Titulo: {titulo}")
        print(f"   Autor: {autor}")

        # 3. EXTRAIR CAPA AUTOMATICAMENTE
        print(f"\nExtraindo capa da pagina 1...")
        capa_path = extrair_capa_automaticamente(pdf_path)

        if capa_path:
            print(f"   Capa extraida com sucesso!")
        else:
            print(f"   Sem capa (continuando...)")

        # 4. EXTRAIR TEXTO
        print(f"\nExtraindo texto...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            texto = page.extract_text()
            if texto.strip():
                todo_texto.append(texto)

            if (i + 1) % 50 == 0:
                print(f"   {i + 1}/{total_paginas} paginas...")

        print(f"   {len(todo_texto)} paginas com texto extraidas")

    # 5. CRIAR EPUB
    print(f"\nGerando EPUB...")
    book = epub.EpubBook()
    book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
    book.set_title(titulo)
    book.set_language('pt-BR')
    book.add_author(autor)

    # 6. ADICIONAR CAPA
    if capa_path and os.path.exists(capa_path):
        try:
            with open(capa_path, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())
            os.remove(capa_path)
            print(f"   Capa adicionada!")
        except Exception as e:
            print(f"   Erro na capa: {e}")

    # 7. CRIAR CAPÍTULOS
    print(f"\nOrganizando capitulos...")
    capitulos = []
    paginas_por_capitulo = 50

    for i in range(0, len(todo_texto), paginas_por_capitulo):
        chunk = todo_texto[i:i + paginas_por_capitulo]
        cap_num = (i // paginas_por_capitulo) + 1

        c = epub.EpubHtml(
            title=f'Capitulo {cap_num}',
            file_name=f'cap{cap_num}.xhtml',
            lang='pt-BR'
        )

        texto_capitulo = '\n\n'.join(chunk)
        html = f'''<html>
<head><title>Capitulo {cap_num}</title></head>
<body>
<h1>Capitulo {cap_num}</h1>
<div style="text-align: justify;">
{texto_capitulo.replace(chr(10), '<br/>')}
</div>
</body>
</html>'''

        c.content = html
        book.add_item(c)
        capitulos.append(c)

    print(f"   {len(capitulos)} capitulos criados")

    # 8. NAVEGAÇÃO
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # 9. SALVAR
    epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
    epub_nome = re.sub(r'[<>:"|?*]', '', epub_nome)

    print(f"\nSalvando...")
    epub.write_epub(epub_nome, book)

    print(f"\n{'='*70}")
    print(f"CONVERSAO COMPLETA!")
    print(f"{'='*70}")
    print(f"Arquivo: {epub_nome}")
    print(f"Titulo: {titulo}")
    print(f"Autor: {autor}")
    print(f"Capa: {'Sim' if capa_path else 'Nao'}")
    print(f"Capitulos: {len(capitulos)}")
    print(f"Paginas: {len(todo_texto)}")
    print(f"{'='*70}\n")

    return True

if __name__ == "__main__":
    pdf_path = r"c:\Users\caber\Documents\devops\Legado Ives\test_pdfs\LIVRO-Uma-breve-teoria-do-Poder.pdf"

    print("="*70)
    print("CONVERSOR PDF -> EPUB - 100% AUTOMATICO (SEM INPUT)")
    print("="*70)
    print()

    try:
        converter_pdf_completo(pdf_path)
    except Exception as e:
        print(f"\nErro: {e}")
        import traceback
        traceback.print_exc()
