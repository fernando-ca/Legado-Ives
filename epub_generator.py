"""
Gerador de arquivos EPUB com metadados completos
"""

from ebooklib import epub
from PIL import Image
import os
from typing import Dict, List, Optional
from datetime import datetime
import config


class EPUBGenerator:
    """Classe para gerar arquivos EPUB com metadados completos"""
    
    def __init__(self):
        self.book = None
        self.config = config
        
    def create_epub(self, 
                   title: str, 
                   author: str, 
                   content_structure: Dict, 
                   cover_image_path: Optional[str] = None,
                   additional_metadata: Optional[Dict] = None) -> epub.EpubBook:
        """
        Cria um arquivo EPUB com metadados completos
        
        Args:
            title: Título do livro
            author: Autor do livro
            content_structure: Estrutura de conteúdo (capítulos)
            cover_image_path: Caminho para imagem de capa (opcional)
            additional_metadata: Metadados adicionais (opcional)
            
        Returns:
            Objeto EpubBook configurado
        """
        # Criar novo livro EPUB
        self.book = epub.EpubBook()
        
        # Configurar metadados básicos
        self._set_basic_metadata(title, author, additional_metadata)
        
        # Adicionar capa se fornecida
        if cover_image_path and os.path.exists(cover_image_path):
            self._add_cover(cover_image_path)
        
        # Adicionar capítulos
        self._add_chapters(content_structure['chapters'])
        
        # Configurar navegação
        self._setup_navigation()
        
        # Adicionar CSS
        self._add_styles()
        
        return self.book
    
    def _set_basic_metadata(self, title: str, author: str, additional_metadata: Optional[Dict] = None):
        """Configura metadados básicos do livro"""
        # Metadados obrigatórios
        self.book.set_identifier(f"book_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        self.book.set_title(title)
        self.book.set_language(self.config.DEFAULT_METADATA['language'])
        
        # Autor
        if author:
            self.book.add_author(author)
        
        # Metadados adicionais
        metadata = additional_metadata or {}
        
        if metadata.get('subject'):
            self.book.set_subject(metadata['subject'])
        
        if metadata.get('creator'):
            self.book.add_metadata('DC', 'creator', metadata['creator'])
        
        if metadata.get('publisher'):
            self.book.add_metadata('DC', 'publisher', metadata['publisher'])
        else:
            self.book.add_metadata('DC', 'publisher', self.config.DEFAULT_METADATA['publisher'])
        
        if metadata.get('rights'):
            self.book.add_metadata('DC', 'rights', metadata['rights'])
        else:
            self.book.add_metadata('DC', 'rights', self.config.DEFAULT_METADATA['rights'])
        
        # Data de criação
        self.book.add_metadata('DC', 'date', datetime.now().strftime('%Y-%m-%d'))
        
        # Descrição
        description = f"Livro convertido de PDF: {title}"
        if author:
            description += f" por {author}"
        self.book.add_metadata('DC', 'description', description)
    
    def _add_cover(self, cover_image_path: str):
        """Adiciona capa ao livro"""
        try:
            # Processar imagem da capa
            processed_image_path = self._process_cover_image(cover_image_path)
            
            # Adicionar imagem da capa
            with open(processed_image_path, 'rb') as cover_file:
                cover_image = cover_file.read()
            
            # Criar item da capa
            cover_item = epub.EpubItem(
                uid="cover",
                file_name="cover.jpg",
                media_type="image/jpeg",
                content=cover_image
            )
            self.book.add_item(cover_item)
            
            # Definir como capa
            self.book.set_cover("cover.jpg", cover_image)
            
            # Limpar arquivo temporário se foi criado
            if processed_image_path != cover_image_path:
                os.remove(processed_image_path)
                
        except Exception as e:
            print(f"Erro ao adicionar capa: {e}")
    
    def _process_cover_image(self, image_path: str) -> str:
        """Processa imagem da capa para tamanho adequado"""
        try:
            with Image.open(image_path) as img:
                # Converter para RGB se necessário
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                
                # Redimensionar se necessário
                max_width = self.config.COVER_SETTINGS['max_width']
                max_height = self.config.COVER_SETTINGS['max_height']
                
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Salvar imagem processada
                processed_path = f"temp_cover_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
                img.save(processed_path, 
                        format=self.config.COVER_SETTINGS['format'],
                        quality=self.config.COVER_SETTINGS['quality'],
                        optimize=True)
                
                return processed_path
                
        except Exception as e:
            print(f"Erro ao processar imagem da capa: {e}")
            return image_path  # Retornar caminho original se houver erro
    
    def _add_chapters(self, chapters: List[Dict]):
        """Adiciona capítulos ao livro"""
        for i, chapter in enumerate(chapters, 1):
            # Criar capítulo
            chapter_item = epub.EpubHtml(
                title=chapter['title'],
                file_name=f"chapter_{i:03d}.xhtml",
                lang=self.config.DEFAULT_METADATA['language']
            )
            
            # Adicionar conteúdo HTML
            chapter_item.content = self._create_chapter_html(chapter['html'], chapter['title'])
            
            # Adicionar ao livro
            self.book.add_item(chapter_item)
            
            # Adicionar à tabela de conteúdos
            self.book.toc.append(chapter_item)
    
    def _create_chapter_html(self, content: str, title: str) -> str:
        """Cria HTML completo para um capítulo"""
        return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>{title}</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    {content}
</body>
</html>"""
    
    def _setup_navigation(self):
        """Configura navegação do livro"""
        # Adicionar página de título
        title_page = epub.EpubHtml(
            title="Página de Título",
            file_name="title_page.xhtml",
            lang=self.config.DEFAULT_METADATA['language']
        )
        title_page.content = self._create_title_page()
        self.book.add_item(title_page)
        
        # Configurar spine (ordem de leitura)
        self.book.spine = ['nav', title_page] + [item for item in self.book.toc if hasattr(item, 'file_name')]
        
        # Adicionar navegação
        self.book.add_item(epub.EpubNcx())
        self.book.add_item(epub.EpubNav())
    
    def _create_title_page(self) -> str:
        """Cria página de título"""
        title = self.book.get_metadata('DC', 'title')[0][0] if self.book.get_metadata('DC', 'title') else "Título"
        author = self.book.get_metadata('DC', 'creator')[0][0] if self.book.get_metadata('DC', 'creator') else "Autor"
        
        return f"""<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Página de Título</title>
    <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
    <div class="title-page">
        <h1 class="book-title">{title}</h1>
        <h2 class="book-author">por {author}</h2>
        <div class="book-info">
            <p>Convertido de PDF para EPUB</p>
            <p>{datetime.now().strftime('%d/%m/%Y')}</p>
        </div>
    </div>
</body>
</html>"""
    
    def _add_styles(self):
        """Adiciona estilos CSS ao livro"""
        css_content = """
/* Estilos para o livro EPUB */
body {
    font-family: Georgia, serif;
    line-height: 1.6;
    margin: 0;
    padding: 20px;
    color: #333;
}

.title-page {
    text-align: center;
    margin-top: 50px;
}

.book-title {
    font-size: 2.5em;
    margin-bottom: 20px;
    color: #2c3e50;
}

.book-author {
    font-size: 1.5em;
    margin-bottom: 40px;
    color: #7f8c8d;
    font-style: italic;
}

.book-info {
    margin-top: 50px;
    font-size: 0.9em;
    color: #95a5a6;
}

.chapter {
    margin-bottom: 30px;
}

.chapter-title {
    font-size: 1.8em;
    color: #2c3e50;
    margin-bottom: 20px;
    border-bottom: 2px solid #3498db;
    padding-bottom: 10px;
}

.section-title {
    font-size: 1.3em;
    color: #34495e;
    margin-top: 25px;
    margin-bottom: 15px;
}

.paragraph {
    margin-bottom: 15px;
    text-align: justify;
    text-indent: 1.5em;
}

.page {
    margin-bottom: 20px;
}

/* Estilos para diferentes tamanhos de tela */
@media (max-width: 600px) {
    body {
        padding: 10px;
    }
    
    .book-title {
        font-size: 2em;
    }
    
    .book-author {
        font-size: 1.2em;
    }
}
"""
        
        # Criar item CSS
        css_item = epub.EpubItem(
            uid="css",
            file_name="style.css",
            media_type="text/css",
            content=css_content
        )
        self.book.add_item(css_item)
    
    def save_epub(self, output_path: str) -> bool:
        """
        Salva o arquivo EPUB

        Args:
            output_path: Caminho onde salvar o arquivo EPUB

        Returns:
            True se salvou com sucesso, False caso contrário
        """
        try:
            if not self.book:
                print("Erro: Nenhum livro foi criado")
                return False

            # Criar diretório se não existir (apenas se houver pasta no caminho)
            output_dir = os.path.dirname(output_path)
            if output_dir:  # Só cria diretório se houver pasta no caminho
                os.makedirs(output_dir, exist_ok=True)

            # Salvar arquivo
            epub.write_epub(output_path, self.book, {})
            print(f"EPUB salvo com sucesso: {output_path}")
            return True

        except Exception as e:
            print(f"Erro ao salvar EPUB: {e}")
            return False


