// src/lib/youtubeExtractor.ts
// Integração com Cobalt API para extrair áudio do YouTube

interface CobaltResponse {
  status: 'stream' | 'redirect' | 'picker' | 'error';
  url?: string;
  text?: string;
}

export async function extractAudioFromYouTube(youtubeUrl: string): Promise<string> {
  const response = await fetch('https://api.cobalt.tools/api/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      url: youtubeUrl,
      isAudioOnly: true,
      aFormat: 'mp3',
      filenamePattern: 'basic',
    }),
  });

  if (!response.ok) {
    throw new Error('Falha ao extrair áudio do YouTube');
  }

  const data: CobaltResponse = await response.json();

  if (data.status === 'error') {
    throw new Error(data.text || 'Erro desconhecido');
  }

  if (data.status === 'stream' || data.status === 'redirect') {
    if (!data.url) throw new Error('URL não encontrada');
    return data.url;
  }

  throw new Error('Resposta inesperada do Cobalt');
}

export function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/shorts\//,
  ];
  return patterns.some(p => p.test(url));
}
