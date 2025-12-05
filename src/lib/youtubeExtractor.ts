// src/lib/youtubeExtractor.ts
// Integração com Cobalt API para extrair áudio do YouTube

interface CobaltResponse {
  status: 'stream' | 'redirect' | 'picker' | 'tunnel' | 'error';
  url?: string;
  text?: string;
}

export async function extractAudioFromYouTube(youtubeUrl: string): Promise<string> {
  // Cobalt API v7 - requer headers específicos
  const response = await fetch('https://api.cobalt.tools/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      url: youtubeUrl,
      downloadMode: 'audio',
      audioFormat: 'mp3',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cobalt API error:', response.status, errorText);
    throw new Error(`Falha ao extrair áudio do YouTube (${response.status})`);
  }

  const data: CobaltResponse = await response.json();

  if (data.status === 'error') {
    throw new Error(data.text || 'Erro desconhecido do Cobalt');
  }

  if (data.status === 'stream' || data.status === 'redirect' || data.status === 'tunnel') {
    if (!data.url) throw new Error('URL do áudio não encontrada');
    return data.url;
  }

  // Se for 'picker', pega a primeira opção
  if (data.status === 'picker' && data.url) {
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
