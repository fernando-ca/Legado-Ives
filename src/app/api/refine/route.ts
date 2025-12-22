// src/app/api/refine/route.ts
// Endpoint para refinamento de transcrições usando Claude

import { NextResponse } from 'next/server';
import { refineTranscript, formatTranscriptBasic } from '@/lib/transcriptRefiner';

export const maxDuration = 120; // 2 minutos para refinamento

export async function POST(request: Request) {
  try {
    const { transcript, title, date, guest } = await request.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json(
        { error: 'Transcrição é obrigatória' },
        { status: 400 }
      );
    }

    if (transcript.length < 50) {
      return NextResponse.json(
        { error: 'Transcrição muito curta para refinamento' },
        { status: 400 }
      );
    }

    // Verifica se a API key do Anthropic está configurada
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('ANTHROPIC_API_KEY não configurada, usando formatação básica');

      const basicFormatted = formatTranscriptBasic(transcript, {
        title: title || 'Entrevista',
        date: date || '',
        guest: guest || '',
      });

      return NextResponse.json({
        refined: basicFormatted,
        method: 'basic',
        warning: 'ANTHROPIC_API_KEY não configurada. Usando formatação básica sem IA.',
      });
    }

    console.log(`Refinando transcrição: ${transcript.length} caracteres`);
    console.log(`Metadados: título="${title}", data="${date}", convidado="${guest}"`);

    const refined = await refineTranscript(transcript, {
      title: title || 'Entrevista',
      date: date || '',
      guest: guest || '',
    });

    return NextResponse.json({
      refined,
      method: 'claude',
      inputLength: transcript.length,
      outputLength: refined.length,
    });

  } catch (error) {
    console.error('Erro ao refinar transcrição:', error);

    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    // Erros de API
    if (message.includes('API key') || message.includes('401')) {
      return NextResponse.json(
        { error: 'Erro de autenticação com a API do Claude. Verifique a chave ANTHROPIC_API_KEY.' },
        { status: 401 }
      );
    }

    if (message.includes('429') || message.includes('limite')) {
      return NextResponse.json(
        { error: 'Limite de requisições excedido. Aguarde um momento e tente novamente.' },
        { status: 429 }
      );
    }

    if (message.includes('503') || message.includes('indisponível')) {
      return NextResponse.json(
        { error: 'Serviço de IA temporariamente indisponível. Tente novamente em alguns minutos.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
