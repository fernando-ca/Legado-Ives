# 🎬 Transcritor de Vídeos para Texto

Converte entrevistas e vídeos em texto automaticamente usando Inteligência Artificial.

## ⚡ Início Rápido (3 passos)

### 1️⃣ Instalar FFmpeg

**Opção A - Chocolatey (Recomendado):**
```cmd
choco install ffmpeg
```

**Opção B - Download Manual:**
1. Baixe: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extraia para `C:\ffmpeg`
3. Adicione `C:\ffmpeg\bin` às variáveis de ambiente PATH

### 2️⃣ Instalar Dependências Python

```bash
pip install -r requirements_video.txt
```

⏱️ **Isso pode levar 5-10 minutos** (PyTorch é grande ~2GB)

### 3️⃣ Testar Instalação

```bash
python testar_instalacao.py
```

Se tudo estiver ✅, você está pronto!

## 🚀 Usar o Sistema

### Iniciar o Servidor

```bash
python app_video.py
```

Depois abra: **http://localhost:5000**

### Interface Web

1. Cole a URL do vídeo
2. Escolha o modelo (recomendado: **Small**)
3. Clique em "Iniciar Transcrição"
4. Aguarde o processamento
5. Copie ou baixe o texto!

## 📊 Modelos Disponíveis

| Modelo | Velocidade | Precisão | Recomendado para |
|--------|------------|----------|------------------|
| Tiny   | 🚀🚀🚀     | ⭐⭐     | Testes rápidos |
| Small  | 🚀🚀       | ⭐⭐⭐⭐ | **Uso geral** ⭐ |
| Medium | 🚀         | ⭐⭐⭐⭐⭐ | Alta precisão |
| Large  | 🐌         | ⭐⭐⭐⭐⭐⭐ | Máxima qualidade |

**Entrevista de 30 min:**
- Small: ~15 minutos
- Medium: ~30 minutos
- Large: ~60 minutos

*Com GPU NVIDIA: 10x mais rápido!*

## 🌐 Sites Suportados

✅ YouTube
✅ Vimeo
✅ Facebook
✅ Twitter/X
✅ Instagram
✅ Sites de notícias
✅ E mais de 1000 outros sites!

## 💰 Custo

**100% GRATUITO** - Processamento local, sem limites!

## 📁 Arquivos do Projeto

```
📦 Projeto
├── 📄 app_video.py              # Servidor Flask
├── 📄 video_transcriber.py      # Lógica de transcrição
├── 📄 requirements_video.txt    # Dependências
├── 📄 testar_instalacao.py      # Teste de instalação
├── 📄 GUIA_TRANSCRITOR.md       # Guia completo
├── 📄 README_VIDEO_TRANSCRIBER.md  # Este arquivo
└── 📁 templates/
    └── 📄 index_video.html      # Interface web
```

## 🔧 Solução Rápida de Problemas

**Erro: FFmpeg not found**
→ Instale o FFmpeg (Passo 1)

**Erro: No module named 'whisper'**
→ `pip install openai-whisper torch`

**Transcrição muito lenta**
→ Use modelo "small" ou "tiny"

**Erro ao baixar vídeo**
→ `pip install --upgrade yt-dlp`

## 📖 Documentação Completa

Veja [GUIA_TRANSCRITOR.md](GUIA_TRANSCRITOR.md) para:
- Instruções detalhadas
- Uso via linha de comando
- Dicas avançadas
- Troubleshooting completo

## 🎯 Exemplo

**URL:** `https://gandramartins.adv.br/entrevistas/programa-sonho-meu-com-walter-feldman-10-10-2025/`

1. Inicie: `python app_video.py`
2. Abra: http://localhost:5000
3. Cole a URL
4. Transcreva!

## ✨ Características

✅ Interface web moderna e intuitiva
✅ Suporte a português brasileiro
✅ Download automático de vídeos
✅ 4 modelos de IA para escolher
✅ Progresso em tempo real
✅ Exportação em TXT
✅ Copiar para área de transferência
✅ 100% gratuito e ilimitado
✅ Processamento local (privacidade total)

## 🔮 Melhorias Futuras

- [ ] Upload direto de arquivos
- [ ] Processamento em lote (CSV)
- [ ] Legendas (SRT/VTT)
- [ ] Identificação de múltiplos falantes
- [ ] Edição inline
- [ ] Outros idiomas

---

**Desenvolvido com ❤️ usando OpenAI Whisper**

**Questões?** Consulte [GUIA_TRANSCRITOR.md](GUIA_TRANSCRITOR.md)
