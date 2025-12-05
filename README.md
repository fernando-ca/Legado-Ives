# Legado Ives - Conversor PDF para EPUB & Transcritor de Vídeos

Aplicação web com duas funcionalidades principais:
- **Conversor PDF para EPUB** - Processamento 100% no navegador
- **Transcritor de Vídeos** - Transcreva vídeos do YouTube ou arquivos locais para texto

![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)
![Deepgram](https://img.shields.io/badge/Deepgram-Nova--2-13EF93?logo=deepgram)

---

## Funcionalidades

### Conversor PDF para EPUB
- **Upload de PDF** - Arraste e solte ou clique para selecionar
- **Extração automática de capa** - Renderiza a primeira página como imagem de capa
- **Detecção de metadados** - Extrai título e autor automaticamente do conteúdo
- **Edição de metadados** - Campos editáveis para corrigir título e autor
- **Conversão para EPUB** - Gera arquivo EPUB válido com capítulos
- **Download direto** - Baixa o EPUB gerado instantaneamente

### Transcritor de Vídeos
- **Suporte a YouTube** - Cole a URL de qualquer vídeo do YouTube ou YouTube Shorts
- **Upload de arquivos** - Arraste e solte vídeos ou áudios locais
- **Múltiplos formatos** - MP4, MOV, AVI, WEBM, MP3, WAV, M4A
- **Transcrição com IA** - Usa Deepgram Nova-2 para transcrição em português
- **Exportação em TXT** - Texto limpo da transcrição completa
- **Exportação em SRT** - Legendas com timestamps para uso em editores de vídeo

---

## Como Funciona

### Conversão PDF para EPUB

```
1. Usuário arrasta/seleciona um PDF
              ↓
2. PDF.js extrai texto e renderiza capa
              ↓
3. Sistema detecta título e autor
              ↓
4. Usuário revisa e edita metadados
              ↓
5. Clica em "Converter para EPUB"
              ↓
6. JSZip gera o arquivo EPUB
              ↓
7. Download automático do arquivo
```

**Processamento 100% no Navegador:**
- Nenhum arquivo é enviado para servidores
- Privacidade total dos documentos
- Funciona offline após carregar a página
- Sem limites de tamanho de arquivo

### Transcrição de Vídeos

```
1. Usuário cola URL do YouTube OU arrasta arquivo local
                        ↓
2. Sistema extrai áudio (Piped API para YouTube / Upload para arquivos)
                        ↓
3. Áudio é enviado para Deepgram Nova-2
                        ↓
4. IA transcreve o áudio em português brasileiro
                        ↓
5. Sistema gera transcrição + legendas SRT
                        ↓
6. Usuário baixa TXT e/ou SRT
```

**Arquitetura do Transcritor:**
- **Extração de áudio do YouTube**: Usa Piped API (frontend privado do YouTube) com fallback para múltiplas instâncias
- **Upload de arquivos**: Armazenamento temporário no Vercel Blob (deletado após transcrição)
- **Transcrição**: API Deepgram com modelo Nova-2 otimizado para português
- **Legendas SRT**: Geração automática com timestamps precisos por palavra

---

## Tecnologias Utilizadas

| Tecnologia | Uso |
|------------|-----|
| **Next.js 14** | Framework React com App Router |
| **TypeScript** | Tipagem estática |
| **Tailwind CSS** | Estilização |
| **PDF.js** | Leitura e renderização de PDFs |
| **JSZip** | Geração de arquivos EPUB |
| **FileSaver.js** | Download de arquivos |
| **Deepgram SDK** | Transcrição de áudio com IA (modelo Nova-2) |
| **Piped API** | Extração de áudio de vídeos do YouTube |
| **Vercel Blob** | Armazenamento temporário de arquivos de áudio/vídeo |

---

## Estrutura do Projeto

```
Legado Ives/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Página principal - Conversor PDF
│   │   ├── layout.tsx            # Layout com metadata e scripts
│   │   ├── globals.css           # Estilos globais + Tailwind
│   │   ├── transcritor/
│   │   │   └── page.tsx          # Página do Transcritor de Vídeos
│   │   └── api/
│   │       ├── transcribe/
│   │       │   └── route.ts      # API de transcrição com Deepgram
│   │       ├── youtube-audio/
│   │       │   └── route.ts      # API de extração de áudio do YouTube
│   │       └── upload/
│   │           └── route.ts      # API de upload para Vercel Blob
│   └── lib/
│       ├── pdfExtractor.ts       # Extração de texto e imagens do PDF
│       ├── metadataParser.ts     # Detecção de título e autor
│       ├── epubGenerator.ts      # Geração do arquivo EPUB
│       ├── youtubeExtractor.ts   # Extração de áudio via Piped API
│       ├── deepgram.ts           # Cliente Deepgram para transcrição
│       └── srtGenerator.ts       # Gerador de legendas SRT
├── package.json
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## Instalação Local

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta na [Deepgram](https://deepgram.com) (para transcrição)
- Conta na [Vercel](https://vercel.com) com Blob Storage (para upload de arquivos)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/fernando-ca/Legado-Ives.git
cd Legado-Ives

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local

# 4. Execute em modo de desenvolvimento
npm run dev

# 5. Acesse no navegador
# http://localhost:3000          (Conversor PDF)
# http://localhost:3000/transcritor  (Transcritor de Vídeos)
```

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Deepgram - Obrigatório para transcrição
DEEPGRAM_API_KEY=sua_chave_deepgram_aqui

# Vercel Blob - Obrigatório para upload de arquivos locais
BLOB_READ_WRITE_TOKEN=seu_token_blob_aqui
```

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `DEEPGRAM_API_KEY` | Chave da API Deepgram para transcrição de áudio | Sim (transcritor) |
| `BLOB_READ_WRITE_TOKEN` | Token do Vercel Blob para armazenamento temporário | Sim (upload local) |

---

## Deploy

### Vercel (Recomendado)

O projeto está configurado para deploy automático no Vercel:

1. Faça fork do repositório
2. Conecte ao Vercel
3. Deploy automático a cada push

### Build de Produção

```bash
# Gerar build otimizado
npm run build

# Executar em produção
npm start
```

---

## Formato EPUB Gerado

O EPUB gerado segue a especificação EPUB 3.0:

```
livro.epub
├── mimetype
├── META-INF/
│   └── container.xml
└── OEBPS/
    ├── content.opf      # Metadados e manifesto
    ├── toc.ncx          # Navegação (compatibilidade)
    ├── nav.xhtml        # Navegação EPUB3
    ├── cover.xhtml      # Página de capa
    ├── images/
    │   └── cover.jpg    # Imagem da capa
    └── chapter_*.xhtml  # Capítulos do livro
```

---

## Paleta de Cores

O design utiliza uma paleta elegante e profissional:

| Cor | Hex | Uso |
|-----|-----|-----|
| Burgundy Escuro | `#3D1518` | Background (início do gradiente) |
| Burgundy Médio | `#5C1515` | Background (meio) |
| Burgundy Claro | `#8B2323` | Background (fim) / Bordas |
| Dourado | `#C9A962` | Botões / Destaques |
| Branco | `#FFFFFF` | Texto / Cards |

### Tipografia
- **Títulos**: Playfair Display (serifada)
- **Corpo**: Inter (sans-serif)

---

## APIs Internas

O transcritor utiliza três endpoints de API:

### POST /api/youtube-audio
Extrai URL de áudio de um vídeo do YouTube.

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=VIDEO_ID" }
```

**Response:**
```json
{ "audioUrl": "https://..." }
```

### POST /api/upload
Faz upload de arquivo de áudio/vídeo para armazenamento temporário.

**Request:** `multipart/form-data` com campo `file`

**Response:**
```json
{ "url": "https://blob.vercel-storage.com/..." }
```

### DELETE /api/upload
Remove arquivo do armazenamento após transcrição.

**Request:**
```json
{ "url": "https://blob.vercel-storage.com/..." }
```

### POST /api/transcribe
Transcreve áudio usando Deepgram Nova-2.

**Request:**
```json
{ "audioUrl": "https://..." }
```

**Response:**
```json
{
  "transcript": "Texto completo da transcrição...",
  "srt": "1\n00:00:00,000 --> 00:00:05,000\nPrimeira linha...",
  "words": [
    { "word": "Olá", "start": 0.0, "end": 0.5 },
    ...
  ]
}
```

---

## Formato SRT Gerado

O arquivo SRT segue o padrão de legendas com timestamps:

```srt
1
00:00:00,000 --> 00:00:03,500
Primeira linha de legenda aqui

2
00:00:03,500 --> 00:00:07,200
Segunda linha de legenda aqui
```

- 8 palavras por linha de legenda (padrão)
- Timestamps precisos por palavra (fornecidos pelo Deepgram)
- Formato compatível com editores de vídeo (Premiere, DaVinci, etc.)

---

## Limitações Conhecidas

### Conversor PDF para EPUB
- PDFs com texto como imagem (escaneados) não terão texto extraído
- PDFs protegidos por senha não podem ser processados
- A qualidade da extração depende da estrutura do PDF original

### Transcritor de Vídeos
- Vídeos muito longos (>1h) podem exceder o timeout do Vercel (60s)
- Alguns vídeos do YouTube podem estar bloqueados em certas instâncias Piped
- Qualidade da transcrição depende da clareza do áudio
- Idioma fixo em português brasileiro (pt-BR)
- Vídeos privados ou com restrição de idade não são suportados

---

## Licença

Este projeto é de uso privado.

---

## Autor

**Fernando CA**
[GitHub](https://github.com/fernando-ca)

---

<p align="center">
  <strong>Legado Ives</strong> — Conversor PDF para EPUB & Transcritor de Vídeos
</p>
