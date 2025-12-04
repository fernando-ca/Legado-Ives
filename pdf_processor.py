"""
Processador de arquivos PDF para conversão
"""

import PyPDF2
from typing import List, Dict, Tuple
import re
from bs4 import BeautifulSoup


class PDFProcessor:
    """Classe para processar arquivos PDF e extrair conteúdo"""
    
    def __init__(self):
        self.text_cleanup_patterns = [
            (r'[ \t]+', ' '),  # Múltiplos espaços e tabs (mas mantém quebras de linha)
            (r'\n{3,}', '\n\n'),  # Três ou mais quebras de linha -> duas
        ]
    
    def extract_text_from_pdf(self, pdf_path: str) -> List[Dict[str, str]]:
        """
        Extrai texto de todas as páginas do PDF
        
        Args:
            pdf_path: Caminho para o arquivo PDF
            
        Returns:
            Lista de dicionários com texto de cada página
        """
        pages_content = []
        
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num, page in enumerate(pdf_reader.pages):
                    try:
                        # Extrair texto da página
                        raw_text = page.extract_text()
                        
                        # Limpar e processar texto
                        cleaned_text = self._clean_text(raw_text)
                        
                        # Dividir em parágrafos
                        paragraphs = self._split_into_paragraphs(cleaned_text)
                        
                        # Criar HTML simples para a página
                        html_content = self._create_html_content(paragraphs, page_num + 1)
                        
                        pages_content.append({
                            'page_number': page_num + 1,
                            'raw_text': raw_text,
                            'cleaned_text': cleaned_text,
                            'html_content': html_content,
                            'paragraphs': paragraphs
                        })
                        
                    except Exception as e:
                        print(f"Erro ao processar página {page_num + 1}: {e}")
                        pages_content.append({
                            'page_number': page_num + 1,
                            'raw_text': '',
                            'cleaned_text': '',
                            'html_content': f'<p>Erro ao processar página {page_num + 1}</p>',
                            'paragraphs': []
                        })
                        
        except Exception as e:
            print(f"Erro ao abrir arquivo PDF: {e}")
            return []
        
        return pages_content
    
    def _clean_text(self, text: str) -> str:
        """
        Limpa e formata o texto extraído
        
        Args:
            text: Texto bruto extraído do PDF
            
        Returns:
            Texto limpo e formatado
        """
        if not text:
            return ""
        
        # Aplicar padrões de limpeza
        cleaned = text
        for pattern, replacement in self.text_cleanup_patterns:
            cleaned = re.sub(pattern, replacement, cleaned)
        
        # Remover linhas muito curtas (provavelmente ruído)
        lines = cleaned.split('\n')
        filtered_lines = []
        
        for line in lines:
            line = line.strip()
            if len(line) > 0:  # Manter todas as linhas não vazias
                filtered_lines.append(line)
        
        return '\n'.join(filtered_lines)
    
    def _split_into_paragraphs(self, text: str) -> List[str]:
        """
        Divide o texto em parágrafos
        
        Args:
            text: Texto limpo
            
        Returns:
            Lista de parágrafos
        """
        if not text:
            return []
        
        # Dividir por quebras de linha duplas
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Filtrar parágrafos vazios ou muito curtos
        filtered_paragraphs = []
        for para in paragraphs:
            para = para.strip()
            if len(para) > 10:  # Manter parágrafos com mais de 10 caracteres
                filtered_paragraphs.append(para)
        
        return filtered_paragraphs
    
    def _create_html_content(self, paragraphs: List[str], page_number: int) -> str:
        """
        Cria conteúdo HTML para uma página
        
        Args:
            paragraphs: Lista de parágrafos
            page_number: Número da página
            
        Returns:
            Conteúdo HTML da página
        """
        if not paragraphs:
            return f'<div class="page" id="page-{page_number}"><p>Página {page_number} vazia</p></div>'
        
        html_parts = [f'<div class="page" id="page-{page_number}">']
        
        for para in paragraphs:
            # Detectar títulos (linhas curtas em maiúsculas ou com padrões específicos)
            if self._is_title(para):
                html_parts.append(f'<h2 class="chapter-title">{para}</h2>')
            else:
                html_parts.append(f'<p class="paragraph">{para}</p>')
        
        html_parts.append('</div>')
        
        return '\n'.join(html_parts)
    
    def _is_title(self, text: str) -> bool:
        """
        Detecta se um texto é um título
        
        Args:
            text: Texto para analisar
            
        Returns:
            True se for provavelmente um título
        """
        if not text or len(text) > 100:
            return False
        
        # Padrões que indicam título
        title_patterns = [
            r'^CAPÍTULO\s+\d+',
            r'^CHAPTER\s+\d+',
            r'^[IVX]+\.',  # Números romanos
            r'^\d+\.',     # Números
            r'^[A-Z][A-Z\s]+$',  # Tudo em maiúsculas
        ]
        
        for pattern in title_patterns:
            if re.match(pattern, text.strip(), re.IGNORECASE):
                return True
        
        return False
    
    def create_epub_structure(self, pages_content: List[Dict[str, str]]) -> Dict[str, str]:
        """
        Cria a estrutura de conteúdo para o EPUB
        
        Args:
            pages_content: Lista com conteúdo das páginas
            
        Returns:
            Dicionário com estrutura do EPUB
        """
        # Criar índice de capítulos
        chapters = []
        current_chapter = []
        chapter_number = 1
        
        for page in pages_content:
            paragraphs = page['paragraphs']
            
            for para in paragraphs:
                if self._is_title(para):
                    # Se já temos conteúdo no capítulo atual, salvar
                    if current_chapter:
                        chapters.append({
                            'title': f'Capítulo {chapter_number}',
                            'content': '\n\n'.join(current_chapter),
                            'html': self._create_chapter_html(current_chapter, chapter_number)
                        })
                        chapter_number += 1
                        current_chapter = []
                    
                    # Começar novo capítulo
                    current_chapter.append(para)
                else:
                    current_chapter.append(para)
        
        # Adicionar último capítulo se houver conteúdo
        if current_chapter:
            chapters.append({
                'title': f'Capítulo {chapter_number}',
                'content': '\n\n'.join(current_chapter),
                'html': self._create_chapter_html(current_chapter, chapter_number)
            })
        
        # Se não encontrou capítulos, criar um único capítulo com todo o conteúdo
        if not chapters:
            all_content = []
            for page in pages_content:
                all_content.extend(page['paragraphs'])
            
            chapters.append({
                'title': 'Conteúdo',
                'content': '\n\n'.join(all_content),
                'html': self._create_chapter_html(all_content, 1)
            })
        
        return {
            'chapters': chapters,
            'total_pages': len(pages_content),
            'total_chapters': len(chapters)
        }
    
    def _create_chapter_html(self, paragraphs: List[str], chapter_number: int) -> str:
        """
        Cria HTML para um capítulo
        
        Args:
            paragraphs: Lista de parágrafos do capítulo
            chapter_number: Número do capítulo
            
        Returns:
            HTML do capítulo
        """
        html_parts = [f'<div class="chapter" id="chapter-{chapter_number}">']
        
        for i, para in enumerate(paragraphs):
            if i == 0 and self._is_title(para):
                html_parts.append(f'<h1 class="chapter-title">{para}</h1>')
            elif self._is_title(para):
                html_parts.append(f'<h2 class="section-title">{para}</h2>')
            else:
                html_parts.append(f'<p class="paragraph">{para}</p>')
        
        html_parts.append('</div>')
        
        return '\n'.join(html_parts)


