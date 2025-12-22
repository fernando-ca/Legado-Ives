// src/app/api/video-audio/route.ts
// Endpoint unificado para extração de áudio de vídeos (YouTube, Vimeo, gandramartins)

import { NextResponse } from 'next/server';
import { extractAudioFromYouTube, isYouTubeUrl } from '@/lib/youtubeExtractor';
import { extractAudioFromUrl, isVimeoUrl, isGandraPageUrl } from '@/lib/vimeoExtractor';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL é obrigatória' },
        { status: 400 }
      );
    }

    const trimmedUrl = url.trim();
    console.log(`Processando URL: ${trimmedUrl}`);

    // YouTube - usa Piped API existente
    if (isYouTubeUrl(trimmedUrl)) {
      console.log('Detectado: YouTube');
      const audioUrl = await extractAudioFromYouTube(trimmedUrl);
      return NextResponse.json({
        audioUrl,
        platform: 'youtube',
        metadata: {
          title: 'YouTube Video',
          date: '',
          guest: '',
        },
      });
    }

    // Vimeo direto ou página gandramartins
    if (isVimeoUrl(trimmedUrl) || isGandraPageUrl(trimmedUrl)) {
      const platform = isVimeoUrl(trimmedUrl) ? 'vimeo' : 'gandramartins';
      console.log(`Detectado: ${platform}`);

      const { audioUrl, metadata } = await extractAudioFromUrl(trimmedUrl);

      return NextResponse.json({
        audioUrl,
        platform,
        metadata,
      });
    }

    // URL não suportada
    return NextResponse.json(
      {
        error: 'URL não suportada. Use URLs do YouTube, Vimeo ou gandramartins.adv.br',
        supportedPlatforms: [
          'youtube.com/watch?v=...',
          'youtu.be/...',
          'vimeo.com/...',
          'gandramartins.adv.br/entrevistas/...',
        ],
      },
      { status: 400 }
    );

  } catch (error) {
    console.error('Erro ao extrair áudio:', error);

    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    // Erros específicos
    if (message.includes('Vimeo ID não encontrado')) {
      return NextResponse.json(
        { error: 'Não foi possível encontrar o vídeo do Vimeo na página. Verifique se a URL está correta.' },
        { status: 404 }
      );
    }

    if (message.includes('Cobalt') || message.includes('extrair áudio')) {
      return NextResponse.json(
        { error: 'Erro ao extrair áudio do vídeo. O serviço pode estar temporariamente indisponível. Tente novamente.' },
        { status: 503 }
      );
    }

    if (message.includes('Timeout')) {
      return NextResponse.json(
        { error: 'A requisição demorou muito. Verifique sua conexão e tente novamente.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
