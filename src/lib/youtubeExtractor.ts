// src/lib/youtubeExtractor.ts
// Extração de áudio do YouTube usando Invidious API

interface InvidiousFormat {
  url: string;
  itag: string;
  type: string;
  container: string;
  encoding: string;
  audioQuality?: string;
  audioSampleRate?: number;
  audioBitrate?: number;
}

interface InvidiousVideo {
  adaptiveFormats: InvidiousFormat[];
  formatStreams: InvidiousFormat[];
}

// Lista de instâncias Invidious públicas (fallback)
const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.jing.rocks',
  'https://yt.artemislena.eu',
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

  let lastError: Error | null = null;

  // Tenta cada instância Invidious
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        continue; // Tenta próxima instância
      }

      const data: InvidiousVideo = await response.json();

      // Procura o melhor formato de áudio
      const audioFormats = data.adaptiveFormats.filter(
        (f) => f.type?.startsWith('audio/') && f.url
      );

      if (audioFormats.length === 0) {
        continue; // Tenta próxima instância
      }

      // Ordena por qualidade (maior bitrate primeiro)
      audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));

      return audioFormats[0].url;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Erro desconhecido');
      continue; // Tenta próxima instância
    }
  }

  throw lastError || new Error('Não foi possível extrair áudio de nenhuma instância');
}

export function isYouTubeUrl(url: string): boolean {
  const patterns = [
    /youtube\.com\/watch\?v=/,
    /youtu\.be\//,
    /youtube\.com\/shorts\//,
  ];
  return patterns.some(p => p.test(url));
}
