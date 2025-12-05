// src/app/api/youtube-audio/route.ts
// API para extrair áudio de URLs do YouTube via Cobalt

import { NextResponse } from 'next/server';
import { extractAudioFromYouTube, isYouTubeUrl } from '@/lib/youtubeExtractor';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !isYouTubeUrl(url)) {
      return NextResponse.json(
        { error: 'URL do YouTube inválida' },
        { status: 400 }
      );
    }

    const audioUrl = await extractAudioFromYouTube(url);
    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error('Erro ao extrair áudio:', error);
    return NextResponse.json(
      { error: 'Falha ao extrair áudio do YouTube' },
      { status: 500 }
    );
  }
}
