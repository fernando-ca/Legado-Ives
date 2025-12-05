// src/lib/youtubeExtractor.ts
// Extração de áudio do YouTube usando Piped API

interface PipedStream {
  url: string;
  format: string;
  quality: string;
  mimeType: string;
  codec: string;
  bitrate: number;
  contentLength: number;
}

interface PipedVideo {
  audioStreams: PipedStream[];
  title: string;
}

// Instâncias Piped que permitem acesso de servidores
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
  'https://pipedapi.in.projectsegfau.lt',
];

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractAudioFromYouTube(youtubeUrl: string): Promise<string> {
  const videoId = extractVideoId(youtubeUrl);
  if (!videoId) {
    throw new Error('ID do vídeo não encontrado na URL');
  }

  const errors: string[] = [];

  // Tenta cada instância Piped
  for (const instance of PIPED_INSTANCES) {
    try {
      console.log(`Tentando instância: ${instance}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${instance}/streams/${videoId}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        errors.push(`${instance}: HTTP ${response.status}`);
        continue;
      }

      const data: PipedVideo = await response.json();

      if (!data.audioStreams || data.audioStreams.length === 0) {
        errors.push(`${instance}: Sem streams de áudio`);
        continue;
      }

      // Filtra streams válidos
      const validStreams = data.audioStreams.filter(s => s.url);

      if (validStreams.length === 0) {
        errors.push(`${instance}: URLs de áudio vazias`);
        continue;
      }

      // Prefere qualidade média (~128kbps) para downloads mais rápidos e completos
      // Ordena por proximidade a 128000 bitrate
      const targetBitrate = 128000;
      const sortedStreams = validStreams.sort((a, b) => {
        const diffA = Math.abs((a.bitrate || 0) - targetBitrate);
        const diffB = Math.abs((b.bitrate || 0) - targetBitrate);
        return diffA - diffB;
      });

      const selectedStream = sortedStreams[0];
      console.log(`Sucesso com ${instance}, bitrate: ${selectedStream.bitrate}, tamanho: ${selectedStream.contentLength || 'desconhecido'}`);
      return selectedStream.url;

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`${instance}: ${msg}`);
      continue;
    }
  }

  console.error('Todas as instâncias falharam:', errors);
  throw new Error(`Não foi possível extrair áudio. Erros: ${errors.join('; ')}`);
}

export function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/shorts\//,
  ];
  return patterns.some(p => p.test(url));
}
