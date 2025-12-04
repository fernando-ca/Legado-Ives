# 🚀 GUIA DE INSTALAÇÃO E USO - Conversor PDF para EPUB

## 📁 Estrutura de Pastas Criadas

```
Legado Ives/
├── test_pdfs/          ← COLOQUE SEUS PDFs AQUI PARA TESTE
├── test_covers/        ← COLOQUE IMAGENS DE CAPA AQUI (opcional)
├── output_epubs/       ← EPUBs gerados serão salvos aqui
├── main.py             ← Script principal
├── test_converter.py   ← Script de testes
└── requirements.txt    ← Dependências necessárias
```

---

## ⚙️ PASSO 1: Instalar Python

### Windows:

**Opção A - Microsoft Store (Recomendado)**
1. Abrir Microsoft Store
2. Buscar "Python 3.12" ou "Python 3.11"
3. Clicar em "Instalar"
4. Aguardar instalação

**Opção B - Site Oficial**
1. Ir para: https://www.python.org/downloads/
2. Baixar "Python 3.11" ou "Python 3.12"
3. Executar instalador
4. ✅ **IMPORTANTE**: Marcar opção "Add Python to PATH"
5. Clicar em "Install Now"

### Verificar Instalação:
Abrir PowerShell ou CMD e executar:
```bash
python --version
```
ou
```bash
py --version
```

Deve mostrar algo como: `Python 3.11.x` ou `Python 3.12.x`

---

## 📦 PASSO 2: Instalar Dependências

Abrir terminal na pasta do projeto e executar:

```bash
pip install -r requirements.txt
```

ou (no Windows):
```bash
py -m pip install -r requirements.txt
```

Isto instalará:
- PyPDF2 (leitura de PDF)
- ebooklib (geração de EPUB)
- Pillow (processamento de imagens)
- beautifulsoup4 (formatação HTML)
- lxml (parser XML)

---

## 🧪 PASSO 3: Executar Testes

### Teste Básico (sem PDF):
```bash
python test_converter.py
```

ou
```bash
py test_converter.py
```

Deve mostrar:
```
✅ Extração de Metadados: PASSOU
✅ Processamento de PDF: PASSOU
✅ Geração de EPUB: PASSOU
⚠️  Teste com PDF: Nenhum PDF encontrado
```

### Teste com PDF Real:
1. Colocar um arquivo PDF na pasta `test_pdfs/`
2. Executar:
```bash
python test_converter.py
```

---

## 📚 PASSO 4: Converter seu Primeiro Livro

### Opção 1: Conversão Simples (auto-detecta metadados)
```bash
python main.py test_pdfs/seu_livro.pdf
```

### Opção 2: Com Capa Personalizada
```bash
python main.py test_pdfs/seu_livro.pdf -c test_covers/capa.jpg
```

### Opção 3: Com Todos os Parâmetros
```bash
python main.py test_pdfs/seu_livro.pdf ^
  -c test_covers/capa.jpg ^
  -t "Título do Livro" ^
  -a "Nome do Autor" ^
  -o output_epubs/meu_livro.epub ^
  -v
```

**Parâmetros:**
- `-c` ou `--cover`: Caminho da imagem de capa
- `-t` ou `--title`: Título personalizado
- `-a` ou `--author`: Autor personalizado
- `-o` ou `--output`: Nome do arquivo de saída
- `-v` ou `--verbose`: Mostra detalhes da conversão

---

## 📋 EXEMPLOS PRÁTICOS

### Exemplo 1: Livro Dom Casmurro
```bash
python main.py test_pdfs/dom_casmurro.pdf ^
  -t "Dom Casmurro" ^
  -a "Machado de Assis" ^
  -c test_covers/dom_casmurro_capa.jpg
```

### Exemplo 2: Conversão Rápida
```bash
python main.py test_pdfs/livro.pdf
```
*(Título e autor serão extraídos automaticamente do PDF)*

### Exemplo 3: Múltiplos Livros (criar script batch)
Criar arquivo `converter_lote.bat`:
```batch
@echo off
python main.py test_pdfs/livro1.pdf -c test_covers/capa1.jpg
python main.py test_pdfs/livro2.pdf -c test_covers/capa2.jpg
python main.py test_pdfs/livro3.pdf -c test_covers/capa3.jpg
echo Conversões concluídas!
pause
```

---

## 🔍 AVALIAR QUALIDADE DA CONVERSÃO

Após gerar o EPUB, verifique:

### ✅ Checklist de Qualidade:
- [ ] Arquivo EPUB foi criado?
- [ ] Título está correto?
- [ ] Autor está correto?
- [ ] Capa foi incluída?
- [ ] Capítulos foram detectados?
- [ ] Texto está completo e legível?
- [ ] Formatação básica (parágrafos) preservada?

### 📱 Testar EPUB:
**Leitores recomendados:**
- Windows: Calibre (https://calibre-ebook.com/)
- Android: Google Play Livros, Moon+ Reader
- iOS: Apple Books
- Online: https://readium.org/

---

## ❓ RESOLUÇÃO DE PROBLEMAS

### Erro: "Python não encontrado"
- Instalar Python (ver Passo 1)
- Reiniciar terminal após instalação

### Erro: "No module named 'PyPDF2'"
```bash
pip install -r requirements.txt
```

### Erro: "Arquivo PDF não encontrado"
- Verificar se o caminho do PDF está correto
- Usar caminhos relativos: `test_pdfs/livro.pdf`

### Metadados não extraídos corretamente
- Usar parâmetros `-t` e `-a` para definir manualmente
```bash
python main.py arquivo.pdf -t "Título" -a "Autor"
```

### Capítulos não detectados
- O código detecta padrões: "CAPÍTULO", "CHAPTER", "I.", "II."
- Se PDF não seguir padrões, adicionar padrões customizados

---

## 📞 PRÓXIMOS PASSOS

Após testar conversão:
1. ✅ Se qualidade boa: Sistema pronto!
2. ⚠️ Se qualidade ruim: Implementar melhorias (upgrade PyMuPDF)
3. 🌐 Planejar integração WordPress (Fase 2)

---

## 📝 NOTAS IMPORTANTES

- **PDFs escaneados** (imagens): Não funcionarão sem OCR
- **PDFs com DRM**: Não poderão ser convertidos
- **Formatação complexa**: Tabelas e layouts multi-coluna podem ser perdidos
- **Imagens inline**: Versão atual não extrai (apenas capa)

---

## 🔄 MELHORIAS FUTURAS (se necessário)

Se qualidade não for satisfatória:
1. Upgrade para PyMuPDF (melhor extração)
2. Adicionar OCR para PDFs escaneados
3. Melhorar detecção de capítulos
4. Extrair imagens inline do PDF

---

**Criado em**: 2025-10-30
**Versão**: 1.0
**Status**: Pronto para testes iniciais
