// src/app/api/transcribe/route.ts
// API para transcrever áudio usando Deepgram

import { NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/deepgram';
import { generateSRT } from '@/lib/srtGenerator';

export const maxDuration = 60; // Aumenta timeout para 60s (Vercel Pro)

export async function POST(request: Request) {
  try {
    const { audioUrl } = await request.json();

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'URL do áudio não fornecida' },
        { status: 400 }
      );
    }

    const result = await transcribeAudio(audioUrl);
    const srt = generateSRT(result.words);

    return NextResponse.json({
      transcript: result.transcript,
      srt: srt,
      words: result.words,
    });
  } catch (error) {
    console.error('Erro na transcrição:', error);

    // Retorna erro específico em vez de genérico
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido na transcrição';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
