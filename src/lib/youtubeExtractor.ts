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

      // Filtra streams válidos - prioriza os que têm contentLength definido
      const validStreams = data.audioStreams.filter(s => s.url && s.url.length > 0);

      if (validStreams.length === 0) {
        errors.push(`${instance}: URLs de áudio vazias`);
        continue;
      }

      // Log todos os streams disponíveis para debug
      console.log(`Streams disponíveis (${validStreams.length}):`);
      validStreams.forEach((s, i) => {
        console.log(`  ${i + 1}. bitrate: ${s.bitrate}, size: ${s.contentLength || '?'}, codec: ${s.codec}`);
      });

      // Prioriza streams com contentLength conhecido e bitrate adequado
      // Primeiro, filtra os que têm contentLength
      const streamsWithSize = validStreams.filter(s => s.contentLength && s.contentLength > 0);
      const targetStreams = streamsWithSize.length > 0 ? streamsWithSize : validStreams;

      // Ordena por bitrate mais próximo de 128kbps (bom equilíbrio qualidade/tamanho)
      const targetBitrate = 128000;
      const sortedStreams = targetStreams.sort((a, b) => {
        const diffA = Math.abs((a.bitrate || 0) - targetBitrate);
        const diffB = Math.abs((b.bitrate || 0) - targetBitrate);
        return diffA - diffB;
      });

      const selectedStream = sortedStreams[0];
      console.log(`Selecionado: bitrate=${selectedStream.bitrate}, size=${selectedStream.contentLength || 'desconhecido'}, codec=${selectedStream.codec}`);
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
