// src/lib/vimeoExtractor.ts
// Extração de áudio do Vimeo usando Cobalt API

// Instâncias Cobalt públicas (fallbacks)
const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://cobalt-api.kwiatekmiki.com',
  'https://cobalt.canine.tools',
];

interface CobaltResponse {
  status: 'tunnel' | 'redirect' | 'picker' | 'error';
  url?: string;
  filename?: string;
  error?: string;
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
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
 * Extrai URL do áudio de um vídeo Vimeo usando Cobalt API
 */
export async function extractAudioFromVimeo(vimeoId: string): Promise<string> {
  const vimeoUrl = `https://vimeo.com/${vimeoId}`;
  console.log(`Extraindo áudio do Vimeo: ${vimeoUrl}`);

  const errors: string[] = [];

  for (const instance of COBALT_INSTANCES) {
    try {
      console.log(`Tentando instância Cobalt: ${instance}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${instance}/`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: vimeoUrl,
          downloadMode: 'audio',
          audioFormat: 'mp3',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        errors.push(`${instance}: HTTP ${response.status} - ${errorText}`);
        continue;
      }

      const data: CobaltResponse = await response.json();

      if (data.status === 'error') {
        errors.push(`${instance}: ${data.error || 'Erro desconhecido'}`);
        continue;
      }

      if (data.status === 'tunnel' || data.status === 'redirect') {
        if (data.url) {
          console.log(`URL do áudio obtida via ${instance}`);
          return data.url;
        }
      }

      if (data.status === 'picker') {
        errors.push(`${instance}: Múltiplos itens disponíveis (picker não suportado)`);
        continue;
      }

      errors.push(`${instance}: Resposta inesperada: ${JSON.stringify(data)}`);

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      if (msg.includes('abort')) {
        errors.push(`${instance}: Timeout`);
      } else {
        errors.push(`${instance}: ${msg}`);
      }
    }
  }

  console.error('Todas as instâncias Cobalt falharam:', errors);
  throw new Error(`Não foi possível extrair áudio do Vimeo. Erros: ${errors.join('; ')}`);
}

/**
 * Função principal: extrai áudio de uma URL (Vimeo direto ou página gandramartins)
 * Retorna a URL do áudio e os metadados
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

  } else {
    throw new Error('URL não suportada. Use URLs do Vimeo ou do site gandramartins.adv.br');
  }

  const audioUrl = await extractAudioFromVimeo(vimeoId);

  return { audioUrl, metadata };
}
