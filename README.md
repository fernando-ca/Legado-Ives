# Legado Ives - Conversor PDF para EPUB

Aplicação web para converter arquivos PDF em formato EPUB, processando tudo diretamente no navegador do usuário.

![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)

---

## Funcionalidades

- **Upload de PDF** - Arraste e solte ou clique para selecionar
- **Extração automática de capa** - Renderiza a primeira página como imagem de capa
- **Detecção de metadados** - Extrai título e autor automaticamente do conteúdo
- **Edição de metadados** - Campos editáveis para corrigir título e autor
- **Conversão para EPUB** - Gera arquivo EPUB válido com capítulos
- **Download direto** - Baixa o EPUB gerado instantaneamente

---

## Como Funciona

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

### Processamento 100% no Navegador

Todo o processamento acontece localmente no navegador do usuário:
- **Nenhum arquivo é enviado para servidores**
- **Privacidade total** dos documentos
- **Funciona offline** após carregar a página
- **Sem limites de tamanho** de arquivo

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

---

## Estrutura do Projeto

```
Legado Ives/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Página principal (UI)
│   │   ├── layout.tsx        # Layout com metadata e scripts
│   │   └── globals.css       # Estilos globais + Tailwind
│   └── lib/
│       ├── pdfExtractor.ts   # Extração de texto e imagens do PDF
│       ├── metadataParser.ts # Detecção de título e autor
│       └── epubGenerator.ts  # Geração do arquivo EPUB
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

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/fernando-ca/Legado-Ives.git
cd Legado-Ives

# 2. Instale as dependências
npm install

# 3. Execute em modo de desenvolvimento
npm run dev

# 4. Acesse no navegador
# http://localhost:3000
```

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

## Limitações Conhecidas

- PDFs com texto como imagem (escaneados) não terão texto extraído
- PDFs protegidos por senha não podem ser processados
- A qualidade da extração depende da estrutura do PDF original

---

## Licença

Este projeto é de uso privado.

---

## Autor

**Fernando CA**
[GitHub](https://github.com/fernando-ca)

---

<p align="center">
  <strong>Legado Ives</strong> — Conversor de PDF para EPUB
</p>
