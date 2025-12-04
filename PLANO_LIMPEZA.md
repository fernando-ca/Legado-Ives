# 🧹 PLANO DE LIMPEZA DO PROJETO

## 📊 Resumo
- **Arquivos atuais:** 42+ arquivos
- **Após limpeza:** ~15 arquivos
- **Espaço liberado:** ~2.5 MB

---

## ✅ ARQUIVOS QUE SERÃO MANTIDOS

### Scripts Principais (3)
- ✅ `main.py` - Conversor principal estruturado
- ✅ `converter_lote.py` - Conversor em lote (50+ livros)
- ✅ `install.py` - Script de instalação

### Módulos Core (4)
- ✅ `config.py` - Configurações
- ✅ `metadata_extractor.py` - Extração de metadados
- ✅ `pdf_processor.py` - Processamento de PDF
- ✅ `epub_generator.py` - Geração de EPUB

### Testes (1)
- ✅ `test_converter.py` - Testes unitários

### Documentação (1)
- ✅ `README.md` - Documentação consolidada (será atualizado)

### Outros (3)
- ✅ `requirements.txt` - Dependências
- ✅ `converter_facil.bat` - Atalho Windows
- ✅ Pastas: `test_pdfs/`, `test_covers/`, `output_epubs/`

---

## ❌ ARQUIVOS QUE SERÃO REMOVIDOS

### 🔴 Conversores Redundantes (5 arquivos)
```
converter_direto.py           (2.7 KB)  - Funcionalidade duplicada
converter_completo.py         (5.0 KB)  - Funcionalidade duplicada
converter_final.py            (5.6 KB)  - Funcionalidade duplicada
converter_automatico.py       (10.0 KB) - Funcionalidade duplicada
converter_completo_auto.py    (8.4 KB)  - Funcionalidade duplicada
```
**Motivo:** Todas as funcionalidades estão em `main.py` e `converter_lote.py`

### 🔴 Scripts de Teste/Diagnóstico (7 arquivos)
```
teste_simples.py              (1.2 KB)  - Teste temporário
testar_pagina2.py             (0.9 KB)  - Teste temporário
testar_extracao_imagem.py     (2.5 KB)  - Teste temporário
extrair_capa_pymupdf.py       (1.6 KB)  - Teste temporário
buscar_autor_completo.py      (2.3 KB)  - Teste temporário
diagnostico_pdf.py            (3.3 KB)  - Teste temporário
verificar_paginas_vazias.py   (1.2 KB)  - Teste temporário
```
**Motivo:** Foram usados para desenvolvimento. `test_converter.py` é suficiente.

### 🔴 EPUBs de Teste (6 arquivos)
```
Sulco.epub                                      (253 KB)
Sulco_001_A_607.epub                            (393 KB)
Sulco_001_a_607_diagramado_site_2025_09_09.epub (253 KB)
Ives_Gandra_da_Silva_Martins.epub               (253 KB)
teste_sulco.epub                                (2.7 KB)
Livro_convertido_20251030_120326.epub           (1.8 KB)
Livro_convertido_20251030_120718.epub           (2.1 KB)
```
**Motivo:** Arquivos de teste gerados. EPUBs finais devem ficar em `output_epubs/`

### 🔴 Imagens Temporárias (1 arquivo)
```
capa_extraida.jpeg            (1.0 MB)
```
**Motivo:** Arquivo temporário de teste

### 🔴 Documentação Redundante (4 arquivos)
```
GUIA_DE_INSTALACAO.md         (5.6 KB)
INICIO_RAPIDO.txt             (2.5 KB)
COMO_TESTAR.md                (6.9 KB)
GUIA_SECRETARIA.md            (4.6 KB)
```
**Motivo:** Tudo será consolidado em `README.md` atualizado

---

## 📝 ESTRUTURA FINAL DO PROJETO

```
Legado Ives/
├── 📄 README.md                    ← Documentação única consolidada
├── 📄 requirements.txt
├── 📄 config.py
│
├── 🐍 Scripts Principais
│   ├── main.py                     ← Conversor individual
│   ├── converter_lote.py           ← Conversor em lote
│   └── install.py
│
├── 📦 Módulos
│   ├── metadata_extractor.py
│   ├── pdf_processor.py
│   └── epub_generator.py
│
├── 🧪 Testes
│   └── test_converter.py
│
├── 🪟 Atalhos
│   └── converter_facil.bat
│
└── 📁 Pastas
    ├── test_pdfs/                  ← PDFs de entrada
    ├── test_covers/                ← Capas opcionais
    └── output_epubs/               ← EPUBs gerados
```

---

## ⚡ BENEFÍCIOS DA LIMPEZA

1. **Menos confusão:** 2 conversores ao invés de 7
2. **Código mais limpo:** Remove 12 scripts de teste
3. **Documentação clara:** 1 README ao invés de 5 documentos
4. **Espaço liberado:** ~2.5 MB de arquivos desnecessários
5. **Manutenção fácil:** Estrutura simples e organizada

---

## 🚀 PRÓXIMOS PASSOS

1. ✅ Revisar este plano
2. 🔄 Executar limpeza automatizada
3. 📝 Atualizar README.md consolidado
4. ✅ Testar conversores principais
5. 🎉 Projeto limpo e organizado!

---

## ⚠️ IMPORTANTE

**Antes de prosseguir:**
- Faça backup se necessário
- Confirme que `output_epubs/` tem seus arquivos importantes
- Os EPUBs de teste na raiz serão deletados

**Após a limpeza:**
- Use `main.py` para conversões individuais
- Use `converter_lote.py` para conversões em massa
- Todos EPUBs gerados vão para `output_epubs/`
