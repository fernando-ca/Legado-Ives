# 🎬 Guia de Instalação e Uso - Transcritor de Vídeos

## 📋 Visão Geral

Este sistema converte vídeos de entrevistas em texto automaticamente usando:
- **OpenAI Whisper** - Transcrição gratuita com alta precisão em português
- **yt-dlp** - Download universal de vídeos (YouTube, Vimeo, sites de notícias, etc.)
- **FFmpeg** - Extração de áudio
- **Flask** - Interface web moderna

## ⚡ Instalação Rápida

### Passo 1: Instalar FFmpeg

FFmpeg é necessário para extrair áudio dos vídeos.

**Windows:**
1. Baixe: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
2. Extraia para `C:\ffmpeg`
3. Adicione ao PATH:
   - Abra "Variáveis de Ambiente" (Windows + R → `sysdm.cpl` → Avançado → Variáveis de Ambiente)
   - Em "Variáveis do Sistema", edite "Path"
   - Adicione: `C:\ffmpeg\bin`
4. Teste no CMD: `ffmpeg -version`

**Ou use Chocolatey (mais fácil):**
```cmd
choco install ffmpeg
```

### Passo 2: Instalar Dependências Python

```bash
# Navegar até a pasta do projeto
cd "C:\Users\caber\Documents\devops\Legado Ives"

# Instalar dependências
pip install -r requirements_video.txt
```

**⚠️ IMPORTANTE:** A instalação do Whisper pode levar alguns minutos, pois ele baixa o PyTorch (~2GB).

### Passo 3: Iniciar o Servidor

```bash
python app_video.py
```

O servidor iniciará em: **http://localhost:5000**

## 🎯 Como Usar

### Interface Web

1. **Abra o navegador**: http://localhost:5000
2. **Cole a URL do vídeo** no campo
3. **Escolha o modelo**:
   - **Tiny**: Muito rápido, menor precisão
   - **Small**: ⭐ **RECOMENDADO** - Equilíbrio ideal
   - **Medium**: Mais lento, excelente precisão
   - **Large**: Muito lento, melhor precisão
4. **Clique em "Iniciar Transcrição"**
5. **Aguarde o processamento** (acompanhe o progresso)
6. **Resultado**: Copie ou baixe o texto

### Uso via Linha de Comando

Para uso direto sem interface web:

```python
from video_transcriber import transcribe_video_from_url

# Transcrever vídeo
texto = transcribe_video_from_url(
    url="https://exemplo.com/video.mp4",
    model_size='small',
    language='pt'
)

print(texto)
```

Ou via script:
```bash
python video_transcriber.py "https://exemplo.com/video.mp4"
```

## ⏱️ Tempos de Processamento

Para uma entrevista de **30 minutos**:

| Modelo | CPU (sem GPU) | GPU | Precisão |
|--------|---------------|-----|----------|
| Tiny   | ~8 min        | ~1 min | Boa |
| Small  | ~15 min       | ~2 min | Muito Boa ⭐ |
| Medium | ~30 min       | ~3 min | Excelente |
| Large  | ~60 min       | ~5 min | Melhor |

**Nota:** Se você tiver uma GPU NVIDIA, o processamento será muito mais rápido!

## 📁 Estrutura de Arquivos

Após processar vídeos, a estrutura será:

```
Legado Ives/
├── transcricoes_web/
│   ├── uploads/          # Vídeos baixados
│   ├── audios/           # Áudios extraídos
│   └── texts/            # Transcrições (TXT)
│       ├── transcricao_20251031_143022.txt
│       └── ...
```

## 🌐 Sites Suportados

O sistema suporta download de vídeos de **1000+ sites**, incluindo:

✅ YouTube
✅ Vimeo
✅ Facebook
✅ Twitter/X
✅ Instagram
✅ Sites de notícias (gandramartins.adv.br, etc.)
✅ Wistia, Dailymotion, etc.

## 💡 Dicas de Uso

### Para Melhor Precisão:
- Use **modelo "medium"** ou **"large"**
- Certifique-se de que o áudio do vídeo está claro
- Vídeos com boa qualidade de áudio têm melhor transcrição

### Para Velocidade:
- Use **modelo "small"** (recomendado para maioria dos casos)
- Considere usar **modelo "tiny"** para testes rápidos
- Se disponível, use um computador com GPU NVIDIA

### Para Vídeos Longos (>1 hora):
- Prefira modelo "small" para não esperar muito
- O sistema processa o vídeo inteiro de uma vez
- Certifique-se de ter espaço em disco (vídeo + áudio temporário)

## 🔧 Solução de Problemas

### Erro: "FFmpeg not found"
**Solução:** Instale o FFmpeg e adicione ao PATH (veja Passo 1)

### Erro: "No module named 'whisper'"
**Solução:**
```bash
pip install openai-whisper torch
```

### Erro ao baixar vídeo de site específico
**Solução:** Atualize o yt-dlp:
```bash
pip install --upgrade yt-dlp
```

### Transcrição muito lenta
**Soluções:**
- Use modelo "small" ou "tiny"
- Feche outros programas pesados
- Se possível, use computador com GPU NVIDIA

### Erro: "Out of memory"
**Soluções:**
- Use modelo menor ("tiny" ou "small")
- Feche outros programas
- Para vídeos muito longos, considere dividir o vídeo

## 🆓 Custos

### Com Whisper (Configuração Atual):
- **Custo: R$ 0,00** (100% gratuito)
- **Limite: Ilimitado**
- **Processamento: Local (seu computador)**
- **Privacidade: 100% privado**

### Alternativa Deepgram (Não implementada, mas disponível):
- **Custo: ~$0.26/hora de vídeo** (após créditos gratuitos)
- **Velocidade: 10-30x mais rápido**
- **Processamento: Nuvem**

## 📝 Formato da Transcrição

O arquivo TXT gerado contém:

```
================================================================================
TRANSCRIÇÃO DE VÍDEO
================================================================================

Título: [Nome do vídeo]
Duração: [X] minutos
Autor: [Canal/Autor]

Data da transcrição: 31/10/2025 14:30:45
Modelo: Whisper small

================================================================================

[Texto completo da transcrição em português...]

================================================================================
Transcrito automaticamente com OpenAI Whisper
================================================================================
```

## 🔄 Atualizações Futuras (Planejadas)

- [ ] Upload direto de arquivos de vídeo (não só URLs)
- [ ] Processamento em lote via CSV
- [ ] Exportação em formatos SRT/VTT (legendas)
- [ ] Identificação de múltiplos falantes
- [ ] Edição inline da transcrição
- [ ] Integração opcional com Deepgram (modo rápido pago)
- [ ] Suporte a outros idiomas além de português

## 📞 Suporte

Em caso de dúvidas ou problemas:

1. Verifique a seção "Solução de Problemas" acima
2. Confira os logs no terminal onde o servidor está rodando
3. Verifique se todas as dependências foram instaladas corretamente

## 🎉 Exemplo de Uso

**URL de teste (exemplo do usuário):**
```
https://gandramartins.adv.br/entrevistas/programa-sonho-meu-com-walter-feldman-10-10-2025/
```

**Fluxo completo:**
1. Inicie o servidor: `python app_video.py`
2. Abra: http://localhost:5000
3. Cole a URL acima
4. Selecione "Small" (recomendado)
5. Clique em "Iniciar Transcrição"
6. Aguarde ~15-20 minutos (para vídeo de ~30 min)
7. Copie ou baixe o texto!

---

**Desenvolvido com ❤️ usando OpenAI Whisper**
**100% Gratuito • Português do Brasil • Alta Precisão**
