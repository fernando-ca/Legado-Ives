"""
Extrator de metadados de arquivos PDF
"""

import PyPDF2
import re
from typing import Dict, Optional, Tuple


class MetadataExtractor:
    """Classe para extrair metadados de arquivos PDF"""
    
    def __init__(self):
        self.title_patterns = [
            r'título[:\s]+(.+)',
            r'title[:\s]+(.+)',
            r'livro[:\s]+(.+)',
            r'book[:\s]+(.+)'
        ]
        
        self.author_patterns = [
            r'autor[:\s]+(.+)',
            r'author[:\s]+(.+)',
            r'escritor[:\s]+(.+)',
            r'writer[:\s]+(.+)'
        ]
    
    def extract_from_pdf(self, pdf_path: str) -> Dict[str, str]:
        """
        Extrai metadados de um arquivo PDF
        
        Args:
            pdf_path: Caminho para o arquivo PDF
            
        Returns:
            Dicionário com metadados extraídos
        """
        metadata = {
            'title': '',
            'author': '',
            'subject': '',
            'creator': '',
            'producer': '',
            'creation_date': '',
            'modification_date': ''
        }
        
        try:
            with open(pdf_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                # Extrair metadados do PDF
                if pdf_reader.metadata:
                    pdf_metadata = pdf_reader.metadata
                    
                    metadata['title'] = pdf_metadata.get('/Title', '')
                    metadata['author'] = pdf_metadata.get('/Author', '')
                    metadata['subject'] = pdf_metadata.get('/Subject', '')
                    metadata['creator'] = pdf_metadata.get('/Creator', '')
                    metadata['producer'] = pdf_metadata.get('/Producer', '')
                    metadata['creation_date'] = str(pdf_metadata.get('/CreationDate', ''))
                    metadata['modification_date'] = str(pdf_metadata.get('/ModDate', ''))
                
                # Se não encontrou título/autor nos metadados, tenta extrair do texto
                if not metadata['title'] or not metadata['author']:
                    text_metadata = self._extract_from_text(pdf_reader)
                    if not metadata['title']:
                        metadata['title'] = text_metadata.get('title', '')
                    if not metadata['author']:
                        metadata['author'] = text_metadata.get('author', '')
                
                # Limpar e formatar metadados
                metadata = self._clean_metadata(metadata)
                
        except Exception as e:
            print(f"Erro ao extrair metadados do PDF: {e}")
        
        return metadata
    
    def _extract_from_text(self, pdf_reader) -> Dict[str, str]:
        """
        Extrai título e autor do texto do PDF (primeiras páginas)
        
        Args:
            pdf_reader: Objeto PdfReader
            
        Returns:
            Dicionário com título e autor extraídos do texto
        """
        text_metadata = {'title': '', 'author': ''}
        
        try:
            # Extrair texto das primeiras 3 páginas
            text = ""
            max_pages = min(3, len(pdf_reader.pages))
            
            for page_num in range(max_pages):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n"
            
            # Procurar por padrões de título e autor
            text_lower = text.lower()
            
            # Buscar título
            for pattern in self.title_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    text_metadata['title'] = match.group(1).strip()
                    break
            
            # Buscar autor
            for pattern in self.author_patterns:
                match = re.search(pattern, text_lower, re.IGNORECASE)
                if match:
                    text_metadata['author'] = match.group(1).strip()
                    break
            
        except Exception as e:
            print(f"Erro ao extrair metadados do texto: {e}")
        
        return text_metadata
    
    def _clean_metadata(self, metadata: Dict[str, str]) -> Dict[str, str]:
        """
        Limpa e formata os metadados extraídos
        
        Args:
            metadata: Dicionário com metadados brutos
            
        Returns:
            Dicionário com metadados limpos
        """
        cleaned = {}
        
        for key, value in metadata.items():
            if isinstance(value, str):
                # Remover caracteres especiais e quebras de linha
                cleaned_value = re.sub(r'[\r\n\t]+', ' ', value)
                cleaned_value = re.sub(r'\s+', ' ', cleaned_value)
                cleaned_value = cleaned_value.strip()
                
                # Remover prefixos comuns
                if key == 'title':
                    cleaned_value = re.sub(r'^(título|title|livro|book)[:\s]*', '', cleaned_value, flags=re.IGNORECASE)
                elif key == 'author':
                    cleaned_value = re.sub(r'^(autor|author|escritor|writer)[:\s]*', '', cleaned_value, flags=re.IGNORECASE)
                
                cleaned[key] = cleaned_value
            else:
                cleaned[key] = str(value) if value else ''
        
        return cleaned
    
    def get_safe_filename(self, title: str, max_length: int = 50) -> str:
        """
        Gera um nome de arquivo seguro a partir do título
        
        Args:
            title: Título do livro
            max_length: Comprimento máximo do nome
            
        Returns:
            Nome de arquivo seguro
        """
        if not title:
            return "livro_sem_titulo"
        
        # Remover caracteres especiais
        safe_name = re.sub(r'[^\w\s-]', '', title)
        safe_name = re.sub(r'[-\s]+', '_', safe_name)
        safe_name = safe_name.strip('_')
        
        # Limitar comprimento
        if len(safe_name) > max_length:
            safe_name = safe_name[:max_length].rstrip('_')
        
        return safe_name or "livro_sem_titulo"


