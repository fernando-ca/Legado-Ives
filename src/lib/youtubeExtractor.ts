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
  duration: number; // duração em segundos
}

// Instâncias Piped que permitem acesso de servidores
// Ordenadas por confiabilidade (kavin.rocks é a mais estável)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.syncpundit.io',
  'https://api.piped.yt',
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

      // Log duração e streams disponíveis para debug
      const durationSec = data.duration || 0;
      const durationStr = `${Math.floor(durationSec / 60)}:${(durationSec % 60).toString().padStart(2, '0')}`;
      console.log(`Vídeo: "${data.title}", duração: ${durationStr} (${durationSec}s)`);

      console.log(`Streams disponíveis (${validStreams.length}):`);
      validStreams.forEach((s, i) => {
        // Calcula duração estimada baseada no contentLength e bitrate
        const estimatedDuration = s.contentLength && s.bitrate ? Math.round(s.contentLength * 8 / s.bitrate) : null;
        const durationInfo = estimatedDuration ? ` (~${estimatedDuration}s)` : '';
        console.log(`  ${i + 1}. bitrate: ${s.bitrate}, size: ${s.contentLength || '?'}${durationInfo}, codec: ${s.codec}`);
      });

      // Prioriza streams com duração próxima à duração real do vídeo
      const streamsWithSize = validStreams.filter(s => s.contentLength && s.contentLength > 0 && s.bitrate);

      let selectedStream: PipedStream;

      if (streamsWithSize.length > 0 && durationSec > 0) {
        // Calcula duração estimada de cada stream e filtra os que têm pelo menos 90% da duração do vídeo
        const completeStreams = streamsWithSize.filter(s => {
          const estimatedDuration = s.contentLength * 8 / s.bitrate;
          return estimatedDuration >= durationSec * 0.9;
        });

        if (completeStreams.length > 0) {
          // Prefere m4a/mp4a sobre opus (mais confiável)
          const m4aStreams = completeStreams.filter(s => s.codec?.includes('mp4a') || s.mimeType?.includes('mp4'));
          const targetStreams = m4aStreams.length > 0 ? m4aStreams : completeStreams;

          // Entre os streams completos, pega o de maior bitrate (melhor qualidade)
          targetStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
          selectedStream = targetStreams[0];
          const estimatedDur = Math.round(selectedStream.contentLength * 8 / selectedStream.bitrate);
          console.log(`Selecionado stream completo: bitrate=${selectedStream.bitrate}, size=${selectedStream.contentLength}, ~${estimatedDur}s, codec=${selectedStream.codec}`);
        } else {
          // Nenhum stream completo - tenta próxima instância
          console.warn(`AVISO: Nenhum stream com duração completa nesta instância!`);
          errors.push(`${instance}: Streams incompletos`);
          continue;
        }
      } else if (streamsWithSize.length > 0) {
        // Sem duração do vídeo - pega o maior stream
        streamsWithSize.sort((a, b) => (b.contentLength || 0) - (a.contentLength || 0));
        selectedStream = streamsWithSize[0];
        console.log(`Selecionado maior stream: bitrate=${selectedStream.bitrate}, size=${selectedStream.contentLength}, codec=${selectedStream.codec}`);
      } else {
        // Fallback: pega o de maior bitrate
        validStreams.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        selectedStream = validStreams[0];
        console.log(`Selecionado por bitrate: bitrate=${selectedStream.bitrate}, size=${selectedStream.contentLength || 'desconhecido'}, codec=${selectedStream.codec}`);
      }
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
