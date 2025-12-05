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

export async function transcribeAudio(audioUrl: string): Promise<TranscriptionResult> {
  // Inicializa cliente apenas quando a função é chamada (não durante build)
  const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);

  const { result } = await deepgram.listen.prerecorded.transcribeUrl(
    { url: audioUrl },
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

  return {
    transcript: alternative?.transcript || '',
    words: alternative?.words?.map((w: { word: string; start: number; end: number }) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })) || [],
  };
}
