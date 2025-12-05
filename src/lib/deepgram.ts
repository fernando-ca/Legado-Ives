// src/lib/deepgram.ts
// Cliente Deepgram para transcrição de áudio

import { createClient } from '@deepgram/sdk';

export interface TranscriptionResult {
  transcript: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

// Baixa o áudio da URL e retorna como Buffer
async function downloadAudio(url: string): Promise<Buffer> {
  console.log('Baixando áudio de:', url.substring(0, 100) + '...');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout (deixa margem para Deepgram)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity', // Evita compressão que pode truncar
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Falha ao baixar áudio: HTTP ${response.status}`);
    }

    // Lê o conteúdo em chunks para garantir download completo
    const chunks: Uint8Array[] = [];
    const reader = response.body?.getReader();

    if (!reader) {
      throw new Error('Não foi possível ler o stream de áudio');
    }

    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }

    console.log('Áudio baixado, tamanho total:', totalBytes, 'bytes');

    // Combina todos os chunks em um único buffer
    const fullBuffer = Buffer.concat(chunks.map(chunk => Buffer.from(chunk)));
    return fullBuffer;

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  // Inicializa cliente apenas quando a função é chamada (não durante build)
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  // Baixa o áudio primeiro (necessário para URLs protegidas como Piped)
  const audioBuffer = await downloadAudio(audioUrl);

  console.log('Enviando para Deepgram...');

  const { result } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: 'nova-2',
      language: 'pt-BR',
      smart_format: true,
      punctuate: true,
      paragraphs: true,
    }
  );

  if (!result) {
    throw new Error('Falha na transcrição: resultado vazio');
  }

  const channel = result.results?.channels[0];
  const alternative = channel?.alternatives[0];

  console.log('Transcrição concluída, palavras:', alternative?.words?.length || 0);

  return {
    transcript: alternative?.transcript || '',
    words: alternative?.words?.map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })) || [],
  };
}
