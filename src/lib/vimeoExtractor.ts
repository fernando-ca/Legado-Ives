// src/lib/vimeoExtractor.ts
// Extração de vídeo/áudio do Vimeo usando Player Config API direta

interface VimeoProgressiveFile {
  url: string;
  quality: string;
  width: number;
  height: number;
  mime: string;
}

interface VimeoConfigResponse {
  request?: {
    files?: {
      progressive?: VimeoProgressiveFile[];
      hls?: {
        cdns?: {
          [key: string]: {
            url?: string;
          };
        };
      };
    };
  };
  video?: {
    title?: string;
  };
}

/**
 * Verifica se é uma URL direta do Vimeo
 */
export function isVimeoUrl(url: string): boolean {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  return patterns.some(p => p.test(url));
}

/**
 * Verifica se é uma URL do site gandramartins.adv.br
 */
export function isGandraPageUrl(url: string): boolean {
  return /gandramartins\.adv\.br\/(entrevistas|anatomia-do-poder)\//.test(url);
}

/**
 * Extrai o ID do Vimeo de uma URL direta
 */
export function extractVimeoIdFromUrl(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extrai o ID do Vimeo de uma página do gandramartins.adv.br
 * Faz scraping da página para encontrar o iframe do Vimeo
 */
export async function extractVimeoIdFromPage(pageUrl: string): Promise<string> {
  console.log(`Buscando Vimeo ID na página: ${pageUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ao acessar página: HTTP ${response.status}`);
    }

    const html = await response.text();

    // Padrões para encontrar o ID do Vimeo na página
    const patterns = [
      /player\.vimeo\.com\/video\/(\d+)/,           // iframe src
      /vimeo\.com\/video\/(\d+)/,                    // link direto
      /vimeo\.com\/(\d+)/,                           // link simples
      /data-vimeo-id="(\d+)"/,                       // data attribute
      /"vimeo_video_id":\s*"?(\d+)"?/,               // JSON config
      /vimeo_id['":\s]+(\d+)/i,                      // variações de config
      /embed\/vimeo\/(\d+)/,                         // embed alternativo
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        console.log(`Vimeo ID encontrado: ${match[1]}`);
        return match[1];
      }
    }

    throw new Error('Vimeo ID não encontrado na página. Verifique se a página contém um vídeo do Vimeo.');

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout ao acessar a página');
    }
    throw error;
  }
}

/**
 * Extrai metadados da página (título, data, convidado)
 */
export async function extractMetadataFromPage(pageUrl: string): Promise<{
  title: string;
  date: string;
  guest: string;
}> {
  console.log(`Extraindo metadados da página: ${pageUrl}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ao acessar página: HTTP ${response.status}`);
    }

    const html = await response.text();

    // Extrai título da página
    let title = 'Entrevista';
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i) ||
                       html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                       html.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    if (titleMatch) {
      title = titleMatch[1]
        .replace(/\s*[|\-–—]\s*Gandra Martins.*$/i, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .trim();
    }

    // Extrai data do título ou URL
    let date = '';
    const dateMatch = title.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/) ||
                      title.match(/(\d{1,2}-\d{1,2}-\d{2,4})/) ||
                      pageUrl.match(/(\d{1,2}-\d{1,2}-\d{2,4})/);
    if (dateMatch) {
      date = dateMatch[1].replace(/-/g, '/');
    }

    // Extrai nome do convidado
    let guest = '';
    const guestMatch = html.match(/Convidado[:\s]*<[^>]*>([^<]+)/i) ||
                       html.match(/Entrevistado[:\s]*<[^>]*>([^<]+)/i) ||
                       html.match(/Convidado[:\s]*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i) ||
                       html.match(/IVES GANDRA(?:\s+DA\s+SILVA)?\s+MARTINS/i);
    if (guestMatch) {
      guest = guestMatch[1] || guestMatch[0];
      guest = guest.replace(/<[^>]*>/g, '').trim();
    }

    // Se não encontrou convidado mas tem Ives Gandra no título
    if (!guest && /ives\s*gandra/i.test(title)) {
      guest = 'Ives Gandra da Silva Martins';
    }

    console.log(`Metadados: título="${title}", data="${date}", convidado="${guest}"`);

    return { title, date, guest };

  } catch (error) {
    clearTimeout(timeoutId);
    console.error('Erro ao extrair metadados:', error);
    return {
      title: 'Entrevista',
      date: '',
      guest: '',
    };
  }
}

/**
 * Extrai URL do vídeo diretamente do Vimeo Player Config API
 * Fonte: https://jakeroid.com/blog/how-to-download-vimeo-video-using-javascript
 */
export async function extractVideoFromVimeo(vimeoId: string, refererUrl?: string): Promise<string> {
  console.log(`Extraindo vídeo do Vimeo: ${vimeoId}`);

  const configUrl = `https://player.vimeo.com/video/${vimeoId}/config`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Headers necessários para o Vimeo aceitar a requisição
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Origin': 'https://player.vimeo.com',
    };

    // Se temos uma URL de referer (ex: gandramartins.adv.br), incluir
    if (refererUrl) {
      headers['Referer'] = refererUrl;
    }

    console.log(`Buscando config: ${configUrl}`);

    const response = await fetch(configUrl, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Se o config direto não funcionar, tentar via página do player
      console.log(`Config direto falhou (${response.status}), tentando via página do player...`);
      return await extractVideoFromVimeoPage(vimeoId, refererUrl);
    }

    const config: VimeoConfigResponse = await response.json();

    // Tentar extrair URL progressiva (download direto)
    const progressive = config.request?.files?.progressive;
    if (progressive && progressive.length > 0) {
      // Ordenar por qualidade (menor primeiro - economiza banda para áudio)
      const sorted = [...progressive].sort((a, b) => (a.height || 0) - (b.height || 0));
      const selected = sorted[0];
      console.log(`URL progressiva encontrada: ${selected.quality} (${selected.width}x${selected.height})`);
      return selected.url;
    }

    // Tentar HLS como fallback
    const hls = config.request?.files?.hls;
    if (hls?.cdns) {
      const cdnKeys = Object.keys(hls.cdns);
      for (const cdn of cdnKeys) {
        const hlsUrl = hls.cdns[cdn]?.url;
        if (hlsUrl) {
          console.log(`URL HLS encontrada via CDN ${cdn}`);
          return hlsUrl;
        }
      }
    }

    throw new Error('Nenhuma URL de vídeo encontrada no config do Vimeo');

  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout ao acessar Vimeo config');
      }
      // Se falhou, tentar método alternativo
      if (!error.message.includes('Nenhuma URL')) {
        console.log(`Erro no config direto: ${error.message}, tentando método alternativo...`);
        return await extractVideoFromVimeoPage(vimeoId, refererUrl);
      }
    }

    throw error;
  }
}

/**
 * Método alternativo: extrai config do HTML da página do player
 */
async function extractVideoFromVimeoPage(vimeoId: string, refererUrl?: string): Promise<string> {
  console.log(`Tentando extrair via página do player: ${vimeoId}`);

  const playerUrl = `https://player.vimeo.com/video/${vimeoId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    if (refererUrl) {
      headers['Referer'] = refererUrl;
    }

    const response = await fetch(playerUrl, {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro ao acessar player Vimeo: HTTP ${response.status}`);
    }

    const html = await response.text();

    // Procurar config no HTML (window.playerConfig ou similar)
    const configPatterns = [
      /window\.playerConfig\s*=\s*(\{[\s\S]+?\});/,
      /var\s+config\s*=\s*(\{[\s\S]+?\});/,
      /"progressive"\s*:\s*\[([^\]]+)\]/,
    ];

    for (const pattern of configPatterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          // Para o padrão progressive direto
          if (pattern.source.includes('progressive')) {
            const progressiveMatch = html.match(/"url"\s*:\s*"([^"]+)"/);
            if (progressiveMatch) {
              console.log('URL encontrada via regex progressive');
              return progressiveMatch[1].replace(/\\/g, '');
            }
          } else {
            const config = JSON.parse(match[1]);
            const progressive = config.request?.files?.progressive;
            if (progressive && progressive.length > 0) {
              const sorted = [...progressive].sort((a: VimeoProgressiveFile, b: VimeoProgressiveFile) =>
                (a.height || 0) - (b.height || 0)
              );
              console.log('URL encontrada via config no HTML');
              return sorted[0].url;
            }
          }
        } catch (parseError) {
          console.log('Erro ao parsear config:', parseError);
          continue;
        }
      }
    }

    // Última tentativa: procurar URLs MP4 diretamente
    const mp4Match = html.match(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/);
    if (mp4Match) {
      console.log('URL MP4 encontrada via regex direto');
      return mp4Match[0];
    }

    throw new Error('Não foi possível extrair URL do vídeo. O vídeo pode ser privado ou protegido.');

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout ao acessar página do player Vimeo');
    }
    throw error;
  }
}

/**
 * Função principal: extrai vídeo de uma URL (Vimeo direto ou página gandramartins)
 * Retorna a URL do vídeo e os metadados
 */
export async function extractAudioFromUrl(url: string): Promise<{
  audioUrl: string;
  metadata: {
    title: string;
    date: string;
    guest: string;
  };
}> {
  let vimeoId: string;
  let metadata = { title: 'Entrevista', date: '', guest: '' };
  let refererUrl: string | undefined;

  if (isVimeoUrl(url)) {
    // URL direta do Vimeo
    const id = extractVimeoIdFromUrl(url);
    if (!id) {
      throw new Error('Não foi possível extrair o ID do Vimeo da URL');
    }
    vimeoId = id;
    metadata.title = `Vimeo ${vimeoId}`;

  } else if (isGandraPageUrl(url)) {
    // Página do gandramartins.adv.br
    vimeoId = await extractVimeoIdFromPage(url);
    metadata = await extractMetadataFromPage(url);
    refererUrl = url; // Usar a página original como referer

  } else {
    throw new Error('URL não suportada. Use URLs do Vimeo ou do site gandramartins.adv.br');
  }

  // Extrair URL do vídeo (será processado pelo Deepgram que aceita vídeo também)
  const audioUrl = await extractVideoFromVimeo(vimeoId, refererUrl);

  return { audioUrl, metadata };
}
