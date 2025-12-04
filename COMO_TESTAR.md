# 🧪 COMO TESTAR O CONVERSOR - Guia Prático

## ✅ Estrutura Preparada

As seguintes pastas foram criadas para facilitar seus testes:

```
📁 test_pdfs/       ← COLOQUE SEUS PDFs AQUI
📁 test_covers/     ← COLOQUE IMAGENS DE CAPA AQUI (opcional)
📁 output_epubs/    ← EPUBs gerados (opcional, pode usar pasta raiz)
```

---

## 🎯 OPÇÃO 1: Modo Super Fácil (Windows)

### Duplo clique em: `converter_facil.bat`

O script interativo vai:
1. ✅ Verificar se Python está instalado
2. ✅ Verificar dependências
3. ✅ Mostrar PDFs disponíveis em `test_pdfs/`
4. ✅ Perguntar qual modo de conversão você quer
5. ✅ Fazer tudo automaticamente!

**Menu de opções**:
- [1] Conversão simples (auto-detecta tudo)
- [2] Conversão com capa
- [3] Conversão completa (você define título/autor)
- [4] Testar instalação
- [5] Sair

---

## 🎯 OPÇÃO 2: Linha de Comando

### Passo 1: Verificar Python
```bash
python --version
```
ou
```bash
py --version
```

Se não estiver instalado: https://www.python.org/downloads/

### Passo 2: Instalar Dependências
```bash
pip install -r requirements.txt
```

### Passo 3: Testar Sistema (sem PDF)
```bash
python test_converter.py
```

Deve mostrar:
```
✅ Extração de Metadados: PASSOU
✅ Processamento de PDF: PASSOU
✅ Geração de EPUB: PASSOU
⚠️  Teste com PDF: Nenhum PDF encontrado
```

### Passo 4: Colocar PDF para Testar
1. Copiar seu PDF para a pasta `test_pdfs/`
2. Exemplo: `test_pdfs/meu_livro.pdf`

### Passo 5: Converter!

**Conversão mais simples**:
```bash
python main.py test_pdfs/meu_livro.pdf
```

**Com capa**:
```bash
python main.py test_pdfs/meu_livro.pdf -c test_covers/capa.jpg
```

**Completo**:
```bash
python main.py test_pdfs/meu_livro.pdf -t "Título do Livro" -a "Nome do Autor" -c test_covers/capa.jpg -v
```

---

## 📋 Checklist de Teste

Após converter, verificar:

### ✅ Arquivo EPUB foi criado?
- [ ] Arquivo .epub apareceu na pasta?
- [ ] Tamanho do arquivo parece adequado?

### ✅ Abrir EPUB e verificar:
- [ ] Título está correto no leitor?
- [ ] Autor está correto?
- [ ] Capa aparece? (se você forneceu)
- [ ] Texto está completo?
- [ ] Capítulos foram detectados?
- [ ] Formatação básica preservada?
- [ ] Parágrafos estão organizados?

### 📱 Testar com Leitores:
- **Windows**: [Calibre](https://calibre-ebook.com/)
- **Online**: [Readium](https://readium.org/)
- **Android**: Google Play Livros
- **iOS**: Apple Books

---

## 🎭 Cenários de Teste Recomendados

### Teste 1: Conversão Básica
```bash
python main.py test_pdfs/livro.pdf
```
**O que testar**:
- Título foi extraído?
- Autor foi extraído?

### Teste 2: Com Capa
```bash
python main.py test_pdfs/livro.pdf -c test_covers/capa.jpg
```
**O que testar**:
- Capa aparece no EPUB?
- Capa está com boa qualidade?

### Teste 3: Metadados Manuais
```bash
python main.py test_pdfs/livro.pdf -t "Meu Título" -a "Meu Autor"
```
**O que testar**:
- Título manual foi usado?
- Autor manual foi usado?

### Teste 4: Modo Verboso
```bash
python main.py test_pdfs/livro.pdf -v
```
**O que testar**:
- Ver detalhes do processamento
- Identificar possíveis problemas

---

## 📊 Avaliando Qualidade

Use esta escala para avaliar a conversão:

### 🟢 QUALIDADE BOA (80-100%)
- ✅ Título e autor corretos
- ✅ Capa incluída
- ✅ Capítulos detectados
- ✅ Texto completo e legível
- ✅ Formatação preservada

**→ Sistema está pronto para uso!**

### 🟡 QUALIDADE MÉDIA (50-79%)
- ⚠️ Alguns capítulos não detectados
- ⚠️ Formatação parcialmente perdida
- ⚠️ Metadados precisam ajuste manual

**→ Usar parâmetros manuais (-t, -a) resolve**

### 🔴 QUALIDADE RUIM (<50%)
- ❌ Texto desorganizado
- ❌ Muitos capítulos perdidos
- ❌ Formatação muito ruim

**→ Precisamos implementar melhorias (upgrade PyMuPDF)**

---

## 🔧 Resolução de Problemas Comuns

### Problema: "Python não encontrado"
**Solução**:
1. Instalar Python de https://www.python.org/downloads/
2. Marcar "Add Python to PATH"
3. Reiniciar terminal

### Problema: "No module named PyPDF2"
**Solução**:
```bash
pip install -r requirements.txt
```

### Problema: "Arquivo PDF não encontrado"
**Solução**:
- Verificar se PDF está em `test_pdfs/`
- Usar caminho correto: `test_pdfs/nomedoarquivo.pdf`

### Problema: "Não foi possível extrair conteúdo"
**Possíveis causas**:
- PDF está protegido por senha
- PDF é escaneado (somente imagens)
- PDF está corrompido

**Soluções**:
- Remover senha do PDF
- Usar PDF com texto extraível
- Testar com outro PDF

### Problema: Título/Autor não foram extraídos
**Solução**:
```bash
python main.py test_pdfs/livro.pdf -t "Título Correto" -a "Autor Correto"
```

### Problema: Capítulos não foram detectados
**Causa**: PDF não usa padrões de capítulo comuns

**Padrões detectados**:
- CAPÍTULO 1, Capítulo I
- CHAPTER 1, Chapter I
- Números romanos (I., II., III.)

**Solução**: Aceitar como está ou adicionar padrões customizados

---

## 📈 Próximos Passos Após Teste

### Se QUALIDADE BOA:
1. ✅ Sistema está pronto!
2. Converter biblioteca de livros
3. Planejar integração WordPress (Fase 2)

### Se QUALIDADE MÉDIA:
1. Usar parâmetros manuais (-t, -a, -c)
2. Criar script para conversão em lote
3. Sistema utilizável com ajustes

### Se QUALIDADE RUIM:
1. **Implementar upgrade PyMuPDF**:
   - Melhor extração de texto
   - Suporte a imagens inline
   - +30% qualidade
2. Testar novamente
3. Avaliar outras melhorias

---

## 🎉 Exemplo Completo de Teste

```bash
# 1. Verificar ambiente
python --version
pip list | findstr PyPDF2

# 2. Executar testes básicos
python test_converter.py

# 3. Colocar PDF em test_pdfs/
# (copiar arquivo manualmente)

# 4. Converter
python main.py test_pdfs/dom_casmurro.pdf -c test_covers/capa_dom.jpg -v

# 5. Verificar resultado
# (abrir EPUB gerado com Calibre ou outro leitor)

# 6. Se precisar ajustar metadados
python main.py test_pdfs/dom_casmurro.pdf -t "Dom Casmurro" -a "Machado de Assis" -c test_covers/capa_dom.jpg
```

---

## 📞 Quando Pedir Ajuda

**Me avise se**:
- ❌ Testes básicos não passaram
- ❌ Erro ao instalar dependências
- ❌ Qualidade da conversão < 50%
- ❌ Problemas específicos do seu PDF
- ✅ Qualidade boa e quer implementar melhorias
- ✅ Pronto para Fase 2 (WordPress)

**Forneça**:
- Mensagens de erro completas
- Saída do modo verboso (`-v`)
- Tipo de PDF (escaneado, digital, protegido?)
- Avaliação de qualidade

---

**🚀 Agora é com você! Coloque um PDF em `test_pdfs/` e teste!**
