# 📚 GUIA PARA SECRETÁRIA - Conversão de Livros PDF para EPUB

## 🎯 O que este sistema faz?

Converte **50+ livros** em PDF para EPUB automaticamente, com:
- ✅ Capa extraída automaticamente
- ✅ Título e autor personalizados
- ✅ Conversão rápida (1-2 min por livro)

---

## 📋 PASSO A PASSO SIMPLES

### **1️⃣ Preparar os PDFs**

1. Copiar **todos os PDFs** para a pasta: `test_pdfs/`
2. Pode ser 5, 10, 50, 100 livros!

---

### **2️⃣ Criar Planilha de Metadados (Excel)**

**A) Criar planilha automaticamente:**

Abrir terminal e executar:
```bash
python converter_lote.py --criar-planilha
```

Isso cria: `metadados.csv`

**B) Abrir no Excel e preencher:**

| PDF | Título | Autor |
|-----|--------|-------|
| livro1.pdf | Dom Casmurro | Machado de Assis |
| livro2.pdf | O Cortiço | Aluísio Azevedo |
| livro3.pdf | Sulco | São Josemaria Escrivá |

**Regras:**
- Coluna **PDF**: Nome EXATO do arquivo (com .pdf)
- Coluna **Título**: Título do livro
- Coluna **Autor**: Nome do autor
- Se deixar em branco: Sistema detecta automaticamente

**C) Salvar o arquivo**

---

### **3️⃣ Converter Todos os Livros**

Executar:
```bash
python converter_lote.py
```

**O que acontece:**
```
📚 CONVERSOR EM LOTE - 50+ LIVROS
================================================================

📁 Encontrados: 15 PDF(s)
📊 Planilha: 15 livros com metadados

🚀 Iniciando conversões...
------------------------------------------------------------------
  1/15 📄 livro1.pdf... ✅
  2/15 📄 livro2.pdf... ✅
  3/15 📄 livro3.pdf... ✅
  ...
 15/15 📄 livro15.pdf... ✅

================================================================
📊 RELATÓRIO FINAL
================================================================

✅ Sucessos: 15/15
❌ Erros: 0/15
⏱️  Tempo total: 45.2s
⚡ Média: 3.0s por livro

📁 EPUBs salvos em: output_epubs/
```

---

### **4️⃣ Pegar os EPUBs Convertidos**

Todos os EPUBs estarão em: **`output_epubs/`**

Pronto para distribuir! 📚

---

## 🎨 ESTRUTURA DE PASTAS

```
Legado Ives/
├── test_pdfs/              ← COLOCAR PDFs AQUI
│   ├── livro1.pdf
│   ├── livro2.pdf
│   └── livro3.pdf
│
├── metadados.csv          ← PLANILHA EXCEL (editar no Excel)
│
├── output_epubs/          ← EPUBs CONVERTIDOS (resultado)
│   ├── Livro_1.epub
│   ├── Livro_2.epub
│   └── Livro_3.epub
│
└── converter_lote.py      ← SCRIPT DE CONVERSÃO
```

---

## 💡 DICAS IMPORTANTES

### ✅ **Boas Práticas:**

1. **Nomes de arquivo claros**: `Sulco.pdf` é melhor que `doc-2025-final-v2.pdf`
2. **Preencher planilha**: Garante título/autor corretos
3. **Testar com poucos primeiro**: Converter 2-3 PDFs para testar
4. **Backup**: Sempre manter PDFs originais

### ⚠️ **Atenção:**

- PDFs **escaneados** (só imagens) não funcionam
- PDFs **protegidos por senha** não funcionam
- Capa é extraída da **página 1** do PDF

---

## 🔧 RESOLUÇÃO DE PROBLEMAS

### **Problema: "Pasta test_pdfs/ não encontrada"**
**Solução**: Criar pasta `test_pdfs` e colocar PDFs nela

### **Problema: "Nenhum PDF encontrado"**
**Solução**: Verificar se PDFs estão em `test_pdfs/` com extensão `.pdf`

### **Problema: "Erro ao converter livro X"**
**Solução**:
- PDF pode estar corrompido
- PDF pode ser escaneado (só imagens)
- Tentar abrir PDF manualmente para verificar

### **Problema: Título/Autor errados**
**Solução**: Preencher planilha `metadados.csv` corretamente

---

## 📞 FLUXO COMPLETO - RESUMO

```
1. Colocar PDFs em test_pdfs/
         ↓
2. Criar planilha: python converter_lote.py --criar-planilha
         ↓
3. Abrir metadados.csv no Excel e preencher
         ↓
4. Salvar planilha
         ↓
5. Executar: python converter_lote.py
         ↓
6. Aguardar (1-2 min por livro)
         ↓
7. Pegar EPUBs em output_epubs/
         ↓
8. Pronto! ✅
```

---

## 🎉 VANTAGENS DESTE SISTEMA

- ✅ **Rápido**: 50 livros em ~5-10 minutos
- ✅ **Automático**: Capa extraída sozinha
- ✅ **Simples**: Só usar Excel
- ✅ **Confiável**: Relatório de sucessos/erros
- ✅ **Organizado**: Tudo em pastas separadas

---

## 📧 SUPORTE

Se tiver dúvidas:
1. Ver este guia novamente
2. Testar com 1 PDF primeiro
3. Verificar mensagens de erro

---

**Criado em**: 2025-10-30
**Versão**: 1.0 - Sistema de Conversão em Lote
