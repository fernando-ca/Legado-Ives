#!/usr/bin/env python3
"""
CONVERSOR UNIVERSAL FINAL PDF -> EPUB
Sistema de pontuação inteligente para funcionar com qualquer PDF
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
    """Extrai capa da primeira página do PDF"""
    try:
        doc = fitz.open(pdf_path)
        page = doc[0]
        image_list = page.get_images()

        if image_list:
            maior_img = None
            maior_tamanho = 0

            for img_index in range(min(3, len(image_list))):
                try:
                    xref = image_list[img_index][0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    img = Image.open(io.BytesIO(image_bytes))
                    tamanho = img.width * img.height

                    if tamanho > maior_tamanho:
                        maior_tamanho = tamanho
                        maior_img = img
                except:
                    continue

            if maior_img:
                temp_capa = "temp_capa_auto.jpg"
                if maior_img.mode != 'RGB':
                    maior_img = maior_img.convert('RGB')
                if maior_img.width > 800 or maior_img.height > 1200:
                    maior_img.thumbnail((800, 1200), Image.Resampling.LANCZOS)
                maior_img.save(temp_capa, 'JPEG', quality=90)
                doc.close()
                return temp_capa

        doc.close()
        return None
    except Exception as e:
        return None

def limpar_linha(linha):
    """Limpa uma linha de texto"""
    if not linha:
        return ""

    # Remover caracteres de controle
    linha = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', linha)
    # Remover número de página no início
    linha = re.sub(r'^\d+', '', linha)
    # Remover bullets e caracteres estranhos
    linha = re.sub(r'^[�•\-\*\s]+', '', linha)
    # Remover aspas/quotes estranhas
    linha = re.sub(r'[�""]+', '', linha)
    # Normalizar espaços
    linha = re.sub(r'\s+', ' ', linha)
    return linha.strip()

def extrair_metadados_simples(pdf_reader, pdf_path):
    """Extrai metadados de forma simples e robusta"""

    titulo = None
    autor = None

    # 1. Tentar metadados do PDF
    try:
        metadata = pdf_reader.metadata
        if metadata:
            valores_invalidos = ['', 'untitled', 'documento', 'document',
                                  'kodak capture pro software', 'microsoft word',
                                  'adobe acrobat', 'pdf', 'unknown']

            if metadata.title and metadata.title.strip().lower() not in valores_invalidos:
                titulo = metadata.title.strip()
            if metadata.author and metadata.author.strip().lower() not in valores_invalidos:
                autor = metadata.author.strip()
    except:
        pass

    # 2. Analisar primeiras 5 páginas
    if not titulo or not autor:
        try:
            # Coletar linhas das primeiras 5 páginas
            todas_linhas = []
            for page_num in range(min(5, len(pdf_reader.pages))):
                try:
                    texto = pdf_reader.pages[page_num].extract_text()
                    if texto:
                        linhas = [limpar_linha(l) for l in texto.split('\n')]
                        linhas = [l for l in linhas if l and len(l) >= 3]
                        todas_linhas.extend(linhas[:15])  # Máx 15 linhas por página
                except:
                    continue

            # Buscar título
            if not titulo:
                titulo = encontrar_titulo(todas_linhas)

            # Buscar autor
            if not autor:
                autor = encontrar_autor(todas_linhas)

        except:
            pass

    # 3. Fallback
    if not titulo:
        titulo = Path(pdf_path).stem
        titulo = re.sub(r'^(LIVRO|BOOK|PDF)[-_\s]*', '', titulo, flags=re.IGNORECASE)
        titulo = re.sub(r'[-_]', ' ', titulo)
        titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)
        titulo = re.sub(r'\s+', ' ', titulo).strip()

    # 4. Normalizar
    if titulo:
        if titulo == titulo.upper() or titulo == titulo.lower():
            titulo = titulo.title()

    if autor:
        if autor == autor.upper():
            autor = autor.title()
    else:
        autor = "Autor Desconhecido"

    return titulo, autor

def encontrar_titulo(linhas):
    """Encontra o título mais provável"""
    candidatos = []

    for i, linha in enumerate(linhas[:40]):
        if not linha or len(linha) < 3:
            continue

        score = 0
        linha_upper = linha.upper()
        palavras = linha.split()

        # Ignorar linhas inválidas
        if any(x in linha_upper for x in ['KODAK', 'COPYRIGHT', '©', 'ISBN', 'TODOS OS DIREITOS']):
            continue
        if re.match(r'^[\d\s\-/\.]+$', linha):  # Só números/datas
            continue
        if re.search(r'\d+[ªº°]?\s*(EDICAO|EDIÇAO)', linha_upper):
            continue

        # SCORE: Linhas em maiúsculas
        if linha == linha.upper():
            score += 2

        # SCORE: Tamanho ideal
        if 10 <= len(linha) <= 70:
            score += 3
        elif len(linha) < 10:
            score -= 1

        # SCORE: Número de palavras
        if 2 <= len(palavras) <= 12:
            score += 2

        # SCORE: Palavras-chave de título
        palavras_chave = ['TEORIA', 'PODER', 'HISTORIA', 'MANUAL', 'GUIA',
                          'BREVE', 'ENSAIO', 'TRATADO', 'SULCO', 'REFLEXOES', 'REFLEXÕES']
        if any(p in linha_upper for p in palavras_chave):
            score += 4

        # SCORE: Tem artigos
        if any(p.lower() in ['uma', 'o', 'a', 'do', 'da'] for p in palavras):
            score += 1

        # SCORE: Posição (primeiras linhas têm prioridade)
        if i < 10:
            score += 1

        # NEGATIVO: Parece nome de pessoa
        if 2 <= len(palavras) <= 5 and all(p[0].isupper() for p in palavras if p):
            if not any(p in linha_upper for p in palavras_chave):
                score -= 2

        if score > 0:
            candidatos.append((score, i, linha))

    # Ordenar por score
    candidatos.sort(reverse=True, key=lambda x: (x[0], -x[1]))

    return candidatos[0][2] if candidatos else None

def encontrar_autor(linhas):
    """Encontra o autor mais provável"""
    candidatos = []

    for i, linha in enumerate(linhas[:40]):
        if not linha or len(linha) < 5:
            continue

        score = 0
        linha_upper = linha.upper()
        palavras = linha.split()

        # Ignorar linhas inválidas (incluindo virtudes/capítulos comuns)
        palavras_invalidas = ['KODAK', 'COPYRIGHT', 'EDITORA', 'LIVRARIA',
                               'PREFACIO', 'PREFÁCIO', 'ISBN', 'REFLEXOES',
                               'REFLEXÕES', 'TEORIA', 'PODER', 'SOBRE', 'MINHAS',
                               'PENSAMENTOS', 'BREVE', 'GENEROSIDADE', 'HUMILDADE',
                               'PACIENCIA', 'PACIÊNCIA', 'FE', 'FÉ', 'ESPERANCA',
                               'ESPERANÇA', 'CARIDADE', 'AMOR', 'JUSTICA', 'JUSTIÇA',
                               'PRUDENCIA', 'PRUDÊNCIA', 'TEMPERANCA', 'TEMPERANÇA',
                               'FORTALEZA', 'CAPITULO', 'CAPÍTULO', 'PARTE']
        if any(x in linha_upper for x in palavras_invalidas):
            continue

        # Se a linha é apenas uma palavra (provavelmente um capítulo/virtude)
        if len(palavras) == 1 and len(linha) < 20:
            continue

        # SCORE: Nome em maiúsculas (padrão comum)
        if linha == linha.upper() and 2 <= len(palavras) <= 5:
            score += 4

        # SCORE: Tamanho típico de nome
        if 10 <= len(linha) <= 50:
            score += 2

        # SCORE: Todas palavras começam com maiúscula
        if all(p[0].isupper() for p in palavras if p):
            score += 3

        # SCORE: Tem conectores de nomes brasileiros
        if any(p.lower() in ['da', 'de', 'do', 'dos', 'das', 'e'] for p in palavras):
            score += 3

        # SCORE: Não tem pontuação estranha
        if not re.search(r'[!?.,;:"]', linha):
            score += 1

        # SCORE: Posição (autores geralmente aparecem cedo)
        if i < 15:
            score += 1

        if score > 0:
            candidatos.append((score, i, linha))

    candidatos.sort(reverse=True, key=lambda x: (x[0], -x[1]))

    return candidatos[0][2] if candidatos else None

def converter_pdf_universal(pdf_path):
    """Converte qualquer PDF para EPUB"""

    print(f"\nAnalisando: {Path(pdf_path).name}")
    print("=" * 70)

    if not os.path.exists(pdf_path):
        print(f"Erro: PDF nao encontrado!")
        return False

    with open(pdf_path, 'rb') as f:
        pdf = PyPDF2.PdfReader(f)
        total_paginas = len(pdf.pages)

        print(f"Total: {total_paginas} paginas")

        # METADADOS
        print(f"\nExtraindo metadados...")
        titulo, autor = extrair_metadados_simples(pdf, pdf_path)
        print(f"   Titulo: {titulo}")
        print(f"   Autor: {autor}")

        # CAPA
        print(f"\nExtraindo capa...")
        capa_path = extrair_capa_automaticamente(pdf_path)
        if capa_path:
            print(f"   Capa extraida!")
        else:
            print(f"   Sem capa")

        # TEXTO
        print(f"\nExtraindo texto...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            try:
                texto = page.extract_text()
                if texto and texto.strip():
                    # Limpar texto
                    texto = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', texto)
                    texto = re.sub(r'\s+', ' ', texto)
                    todo_texto.append(texto.strip())
            except:
                continue

            if (i + 1) % 50 == 0:
                print(f"   {i + 1}/{total_paginas} paginas...")

        print(f"   {len(todo_texto)} paginas extraidas")

    # EPUB
    print(f"\nGerando EPUB...")
    book = epub.EpubBook()
    book.set_identifier(f'epub-{titulo.replace(" ", "-").lower()}')
    book.set_title(titulo)
    book.set_language('pt-BR')
    book.add_author(autor)

    # CAPA
    if capa_path and os.path.exists(capa_path):
        try:
            with open(capa_path, 'rb') as capa_file:
                book.set_cover('cover.jpg', capa_file.read())
            os.remove(capa_path)
            print(f"   Capa adicionada!")
        except:
            pass

    # CAPÍTULOS
    print(f"\nOrganizando capitulos...")
    capitulos = []
    paginas_por_capitulo = 50 if total_paginas >= 100 else max(10, total_paginas // 5)

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

    # NAVEGAÇÃO
    book.toc = tuple(capitulos)
    book.spine = ['nav'] + capitulos
    book.add_item(epub.EpubNcx())
    book.add_item(epub.EpubNav())

    # SALVAR
    epub_nome = titulo.replace(' ', '_').replace('/', '-') + '.epub'
    epub_nome = re.sub(r'[<>:"|?*\\]', '', epub_nome)

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
    print("="*70)
    print("CONVERSOR UNIVERSAL PDF -> EPUB")
    print("="*70)
    print()

    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        converter_pdf_universal(pdf_file)
    else:
        pasta = Path("test_pdfs")
        if not pasta.exists():
            print("Erro: Pasta test_pdfs/ nao encontrada!")
            sys.exit(1)

        pdfs = list(pasta.glob("*.pdf"))
        if not pdfs:
            print("Erro: Nenhum PDF em test_pdfs/")
            sys.exit(1)

        print(f"Encontrados {len(pdfs)} PDF(s)\n")

        for pdf_path in pdfs:
            try:
                converter_pdf_universal(str(pdf_path))
            except Exception as e:
                print(f"\nErro ao converter {pdf_path.name}: {e}\n")
