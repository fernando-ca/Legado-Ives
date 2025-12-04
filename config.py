"""
Configurações do conversor PDF para EPUB
"""

# Configurações de metadados padrão
DEFAULT_METADATA = {
    'language': 'pt-BR',
    'publisher': 'Conversor PDF-EPUB',
    'rights': 'All rights reserved',
    'identifier': 'converted-from-pdf'
}

# Configurações de conversão
CONVERSION_SETTINGS = {
    'max_image_width': 600,
    'max_image_height': 800,
    'image_quality': 85,
    'text_encoding': 'utf-8'
}

# Configurações de capa
COVER_SETTINGS = {
    'max_width': 600,
    'max_height': 800,
    'format': 'JPEG',
    'quality': 90
}


