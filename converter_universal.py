#!/usr/bin/env python3
"""
CONVERSOR UNIVERSAL PDF -> EPUB
Funciona com QUALQUER formato de PDF
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
            # Pegar a maior imagem da primeira página
            maior_img = None
            maior_tamanho = 0

            for img_index in range(min(3, len(image_list))):  # Verificar até 3 imagens
                xref = image_list[img_index][0]
                try:
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]

                    # Verificar tamanho
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
        print(f"   Aviso: Nao foi possivel extrair capa: {e}")
        return None

def limpar_texto(texto):
    """Limpa texto removendo caracteres estranhos"""
    if not texto:
        return texto

    # Remover caracteres de controle
    texto = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f-\x9f]', '', texto)
    # Normalizar espaços
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()

def extrair_titulo_inteligente(linhas):
    """Extrai título de forma inteligente analisando padrões"""
    candidatos = []

    for i, linha in enumerate(linhas[:30]):  # Analisar primeiras 30 linhas
        linha = limpar_texto(linha)
        if not linha or len(linha) < 3:
            continue

        # Remover números de página no início (ex: "1MINHAS" -> "MINHAS")
        linha = re.sub(r'^\d+', '', linha).strip()
        if not linha:
            continue

        # Tentar combinar com próximas linhas se formarem um título
        linhas_combinadas = [linha]
        if i + 1 < len(linhas[:30]):
            for j in range(i + 1, min(i + 4, len(linhas[:30]))):  # Até 3 linhas seguintes
                proxima = limpar_texto(linhas[j])
                proxima = re.sub(r'^\d+|^[�•]', '', proxima).strip()  # Remover números e bullets

                if proxima and len(proxima) < 40:
                    # Remover aspas/quotes estranhas
                    proxima = re.sub(r'[�""\'"]', '', proxima).strip()
                    if proxima:
                        linhas_combinadas.append(proxima)
                        if len(' '.join(linhas_combinadas)) > 60:  # Não combinar muito
                            break
                else:
                    break

        # Processar linha individual
        linha_upper = linha.upper()
        palavras = linha.split()

        # Se conseguiu combinar linhas, adicionar como candidato de alta prioridade
        if len(linhas_combinadas) > 1:
            titulo_combinado = ' '.join(linhas_combinadas)
            # Título combinado tem pontuação extra
            candidatos.append((10, i, titulo_combinado))  # Score alto para títulos combinados

        # Pular linhas indesejadas
        if any(palavra in linha_upper for palavra in [
            'KODAK', 'COPYRIGHT', '©', 'TODOS OS DIREITOS',
            'ISBN', 'PRINTED', 'PUBLISHED'
        ]):
            continue

        # Pular linhas que são apenas números ou datas
        if re.match(r'^[\d\s\-/]+$', linha):
            continue

        # Pular linhas de edição
        if re.search(r'\d+[ªº°]?\s*(EDICAO|EDIÇAO|EDITION)', linha_upper):
            continue

        score = 0

        # Linhas em maiúsculas têm mais pontos
        if linha == linha.upper() and len(palavras) >= 2:
            score += 3

        # Tamanho ideal para título (10-80 caracteres)
        if 10 <= len(linha) <= 80:
            score += 2

        # Palavras-chave comuns em títulos
        palavras_chave_titulo = [
            'TEORIA', 'PODER', 'HISTORIA', 'MANUAL', 'GUIA', 'TRATADO',
            'INTRODUCAO', 'FUNDAMENTOS', 'PRINCIPIOS', 'ESTUDO', 'ENSAIO',
            'ANALISE', 'BREVE', 'COMPLETO', 'PRATICO', 'MODERNO',
            'REFLEXOES', 'PENSAMENTOS', 'SOBRE'
        ]
        tem_palavra_chave = any(palavra in linha_upper for palavra in palavras_chave_titulo)

        # Linha muito curta (1 palavra) em maiúsculas pode ser título também (ex: SULCO)
        if len(palavras) == 1 and linha == linha.upper() and 3 <= len(linha) <= 30:
            score += 2

        if tem_palavra_chave:
            score += 3

        # Tem artigos ou preposições (comum em títulos)
        if any(palavra.lower() in ['uma', 'o', 'a', 'do', 'da', 'de', 'em'] for palavra in palavras):
            score += 1

        # Não é muito curto nem muito longo
        if 2 <= len(palavras) <= 15:
            score += 1

        # Evitar linhas que parecem nomes de autor (só sobrenomes)
        if len(palavras) <= 5 and all(palavra.isupper() or palavra.istitle() for palavra in palavras):
            # Pode ser um nome
            if not any(palavra in linha_upper for palavra in palavras_chave_titulo):
                score -= 2

        if score > 0:
            candidatos.append((score, i, linha))

    # Ordenar por score (maior primeiro)
    candidatos.sort(reverse=True, key=lambda x: x[0])

    if candidatos:
        return candidatos[0][2]  # Retornar linha com maior score

    return None

def extrair_autor_inteligente(linhas):
    """Extrai autor de forma inteligente"""
    candidatos = []

    for i, linha in enumerate(linhas[:30]):
        linha = limpar_texto(linha)
        if not linha or len(linha) < 3:
            continue

        # Remover números de página no início
        linha = re.sub(r'^\d+', '', linha).strip()
        if not linha or len(linha) < 3:
            continue

        linha_upper = linha.upper()
        palavras = linha.split()

        # Pular linhas indesejadas
        if any(palavra in linha_upper for palavra in [
            'KODAK', 'COPYRIGHT', 'EDITORA', 'LIVRARIA', 'PUBLISHER',
            'PREFACIO', 'APRESENTACAO', 'ISBN', 'REFLEXOES', 'REFLEXÕES',
            'SOBRE', 'MINHAS', 'PENSAMENTOS'
        ]):
            continue

        score = 0

        # Nome em maiúsculas (2-5 palavras)
        if linha == linha.upper() and 2 <= len(palavras) <= 5:
            score += 3

        # Tamanho típico de nome (10-50 caracteres)
        if 10 <= len(linha) <= 50:
            score += 1

        # Todas as palavras começam com maiúscula (nome próprio)
        if all(palavra[0].isupper() for palavra in palavras if palavra):
            score += 2

        # Tem palavras conectoras típicas de nomes brasileiros
        if any(palavra.lower() in ['da', 'de', 'do', 'dos', 'das'] for palavra in palavras):
            score += 2

        # Não tem pontuação estranha
        if not re.search(r'[!?.,;:]', linha):
            score += 1

        # Evitar linhas que parecem títulos
        palavras_chave_titulo = [
            'TEORIA', 'PODER', 'HISTORIA', 'MANUAL', 'GUIA', 'LIVRO',
            'UMA', 'BREVE', 'COMPLETO'
        ]
        if any(palavra in linha_upper for palavra in palavras_chave_titulo):
            score -= 3

        if score > 0:
            candidatos.append((score, i, linha))

    candidatos.sort(reverse=True, key=lambda x: x[0])

    if candidatos:
        return candidatos[0][2]

    return None

def extrair_metadados_universal(pdf_reader, pdf_path):
    """Extrai título e autor de forma universal"""
    titulo = None
    autor = None

    # 1. Tentar metadados do PDF
    try:
        metadata = pdf_reader.metadata
        if metadata:
            # Filtrar valores inválidos/genéricos
            valores_invalidos = [
                '', 'untitled', 'documento', 'document',
                'kodak capture pro software', 'microsoft word',
                'adobe acrobat', 'pdf', 'unknown'
            ]

            if metadata.title:
                titulo_meta = metadata.title.strip()
                if titulo_meta.lower() not in valores_invalidos:
                    titulo = titulo_meta

            if metadata.author:
                autor_meta = metadata.author.strip()
                if autor_meta.lower() not in valores_invalidos:
                    autor = autor_meta
    except:
        pass

    # 2. Tentar extrair das primeiras páginas
    try:
        # Coletar texto das primeiras 5 páginas (algumas capas são apenas imagens)
        texto_inicial = []
        max_paginas = min(5, len(pdf_reader.pages))

        for page_num in range(max_paginas):
            try:
                texto_pagina = pdf_reader.pages[page_num].extract_text()
                if texto_pagina and texto_pagina.strip():
                    texto_inicial.append(texto_pagina)
            except:
                continue

        if texto_inicial:
            # Juntar texto de todas as páginas analisadas
            texto_completo = '\n'.join(texto_inicial)
            linhas = [l.strip() for l in texto_completo.split('\n') if l.strip()]

            # Extrair título se não foi encontrado nos metadados
            if not titulo:
                titulo = extrair_titulo_inteligente(linhas)

            # Extrair autor se não foi encontrado nos metadados
            if not autor:
                autor = extrair_autor_inteligente(linhas)
    except Exception as e:
        print(f"   Aviso ao analisar paginas iniciais: {e}")

    # 3. Fallback: usar nome do arquivo para título
    if not titulo:
        titulo = Path(pdf_path).stem
        # Limpar nome do arquivo
        titulo = re.sub(r'^(LIVRO|BOOK|PDF)[-_\s]*', '', titulo, flags=re.IGNORECASE)
        titulo = re.sub(r'[-_]', ' ', titulo)
        titulo = re.sub(r'\d{4}[-_]?\d{2}[-_]?\d{2}', '', titulo)  # Remover datas
        titulo = re.sub(r'\s+', ' ', titulo).strip()

    # 4. Normalizar título
    if titulo:
        titulo = limpar_texto(titulo)
        # Capitalizar se estiver tudo em maiúsculas ou minúsculas
        if titulo == titulo.upper() or titulo == titulo.lower():
            titulo = titulo.title()

    # 5. Normalizar autor
    if autor:
        autor = limpar_texto(autor)
        if autor == autor.upper():
            autor = autor.title()
    else:
        autor = "Autor Desconhecido"

    return titulo, autor

def converter_pdf_universal(pdf_path):
    """Converte qualquer PDF para EPUB"""

    print(f"\nAnalisando: {Path(pdf_path).name}")
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
        titulo, autor = extrair_metadados_universal(pdf, pdf_path)

        print(f"   Titulo: {titulo}")
        print(f"   Autor: {autor}")

        # 3. EXTRAIR CAPA
        print(f"\nExtraindo capa...")
        capa_path = extrair_capa_automaticamente(pdf_path)

        if capa_path:
            print(f"   Capa extraida!")
        else:
            print(f"   Sem capa (continuando...)")

        # 4. EXTRAIR TEXTO
        print(f"\nExtraindo texto...")
        todo_texto = []

        for i, page in enumerate(pdf.pages):
            try:
                texto = page.extract_text()
                if texto and texto.strip():
                    todo_texto.append(limpar_texto(texto))
            except:
                continue

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
            print(f"   Aviso capa: {e}")

    # 7. CRIAR CAPÍTULOS
    print(f"\nOrganizando capitulos...")
    capitulos = []

    # Calcular páginas por capítulo (max 50, min 10)
    if total_paginas < 50:
        paginas_por_capitulo = max(10, total_paginas // 3)
    else:
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
        # Converter PDF específico
        pdf_file = sys.argv[1]
        converter_pdf_universal(pdf_file)
    else:
        # Converter todos os PDFs na pasta test_pdfs
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
                import traceback
                traceback.print_exc()
