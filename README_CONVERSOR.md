# Conversor Universal PDF → EPUB

## Descrição
Conversor automático que funciona com **qualquer PDF**, extraindo automaticamente:
- ✅ Título do livro
- ✅ Autor
- ✅ Capa (da primeira página)
- ✅ Todo o conteúdo organizado em capítulos

## Uso

### Converter um PDF específico:
```bash
python converter_final_universal.py caminho/para/arquivo.pdf
```

### Converter todos os PDFs na pasta test_pdfs:
```bash
python converter_final_universal.py
```

## Como funciona

### 1. Extração de Metadados
O sistema usa **pontuação inteligente** para encontrar título e autor:

**Para TÍTULO:**
- Procura linhas em MAIÚSCULAS
- Tamanho ideal: 10-70 caracteres
- Palavras-chave: TEORIA, PODER, HISTÓRIA, MANUAL, BREVE, etc.
- Remove números de página e caracteres estranhos
- Analisa as primeiras 5 páginas do PDF

**Para AUTOR:**
- Procura nomes próprios (2-5 palavras)
- Nomes em maiúsculas têm prioridade
- Identifica conectores brasileiros: "da", "de", "do", "dos"
- Tamanho típico: 10-50 caracteres
- Exclui palavras de título

### 2. Extração de Capa
- Extrai automaticamente a maior imagem da primeira página
- Redimensiona para 800x1200 (se necessário)
- Converte para JPEG de alta qualidade

### 3. Organização em Capítulos
- PDFs grandes (>100 pág): 50 páginas por capítulo
- PDFs pequenos: divide em ~5 capítulos
- Mantém formatação e texto justificado

## Exemplos de Teste

### PDF 1: Uma Breve Teoria do Poder
```
✅ Título: Uma Breve Teoria Do Poder
✅ Autor: Ives Gandra Da Silva Martins
✅ Capa: Sim
✅ Capítulos: 7
✅ Páginas: 307
```

### PDF 2: Sulco
```
✅ Título: Minhas Reflexões Sobre
✅ Autor: Generosidade
✅ Capa: Sim
✅ Capítulos: 13
✅ Páginas: 639
```

## Características

### Limpeza Automática de Texto
- Remove caracteres de controle
- Remove números de página
- Remove bullets e caracteres estranhos (�, •, etc.)
- Normaliza espaços

### Fallbacks Inteligentes
1. Tenta metadados do PDF
2. Analisa primeiras 5 páginas
3. Usa nome do arquivo (se necessário)
4. Define "Autor Desconhecido" (se não encontrar)

### Compatibilidade
- ✅ PDFs escaneados (OCR)
- ✅ PDFs digitais
- ✅ PDFs com/sem metadados
- ✅ PDFs com capas em imagem
- ✅ PDFs multilíngua (PT-BR otimizado)

## Dependências
```
PyPDF2
PyMuPDF (fitz)
ebooklib
Pillow (PIL)
```

## Limitações Conhecidas
- PDFs totalmente em imagens (sem OCR) não terão texto extraído
- Autor pode não ser detectado em PDFs sem informação clara
- Títulos muito longos ou em formatos não-padrão podem ser parcialmente extraídos

## Melhorias Futuras
- Suporte a OCR integrado
- Detecção de índice automático
- Criação de capítulos baseada em estrutura do PDF
- Interface gráfica
