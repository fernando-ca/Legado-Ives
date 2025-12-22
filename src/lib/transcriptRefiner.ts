// src/lib/transcriptRefiner.ts
// Refinamento de transcrições usando Claude API

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface TranscriptMetadata {
  title: string;
  date: string;
  guest?: string;
}

/**
 * Refina uma transcrição bruta usando Claude
 * - Corrige erros de português e termos jurídicos
 * - Identifica e separa falantes
 * - Formata com cabeçalho e blocos de diálogo
 */
export async function refineTranscript(
  rawTranscript: string,
  metadata: TranscriptMetadata
): Promise<string> {
  console.log('Iniciando refinamento da transcrição com Claude...');
  console.log(`Metadados: título="${metadata.title}", data="${metadata.date}", convidado="${metadata.guest}"`);

  // Limita o tamanho da transcrição para evitar exceder limites
  const maxLength = 100000; // ~100k caracteres
  let transcript = rawTranscript;
  if (transcript.length > maxLength) {
    console.warn(`Transcrição muito longa (${transcript.length} chars), truncando para ${maxLength}`);
    transcript = transcript.substring(0, maxLength) + '\n\n[... transcrição truncada por exceder limite ...]';
  }

  // Limpa o título se for um nome de arquivo
  const cleanTitle = metadata.title
    .replace(/\.(mp4|mp3|wav|m4a|webm|ogg|mov|avi|mkv)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim() || 'Transcrição';

  // Define identificador do falante principal
  const speakerName = metadata.guest?.split(' ')[0]?.toUpperCase() || 'ENTREVISTADO';

  const systemPrompt = `Você é um revisor profissional especializado em transcrições de entrevistas e palestras em português brasileiro. Sua tarefa é transformar transcrições brutas em documentos bem formatados e legíveis.

REGRAS OBRIGATÓRIAS:
1. SEMPRE comece com o cabeçalho formatado (linhas de ═)
2. SEMPRE identifique e separe os falantes usando colchetes: [APRESENTADOR], [${speakerName}], etc.
3. Corrija erros de português, pontuação e termos técnicos/jurídicos
4. Remova hesitações excessivas ("é...", "né", "então...", "aí...", repetições)
5. Mantenha o conteúdo original - apenas corrija e formate
6. Divida falas longas em parágrafos para melhor legibilidade
7. Se houver múltiplos falantes, identifique cada um de forma consistente

FORMATO OBRIGATÓRIO - Sua resposta deve seguir EXATAMENTE este formato:

═══════════════════════════════════════════════════════════════════════════════
TÍTULO DA TRANSCRIÇÃO
Data (se disponível)
Convidado: Nome (se disponível)
═══════════════════════════════════════════════════════════════════════════════

[APRESENTADOR/ENTREVISTADOR]
Texto da primeira fala aqui.

[NOME DO ENTREVISTADO]
Resposta do entrevistado aqui.

Continuação da fala em novo parágrafo se necessário.

[APRESENTADOR/ENTREVISTADOR]
Próxima pergunta ou intervenção.

... e assim por diante até o final da transcrição.

IMPORTANTE: Responda APENAS com a transcrição formatada. Não adicione explicações, comentários ou notas antes ou depois.`;

  const userPrompt = `Formate esta transcrição seguindo o padrão especificado:

METADADOS:
- Título: ${cleanTitle}
- Data: ${metadata.date || 'Não especificada'}
- Convidado: ${metadata.guest || 'Não especificado'}

TRANSCRIÇÃO BRUTA:
${transcript}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extrai o texto da resposta
    const textContent = response.content.find(block => block.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Resposta do Claude não contém texto');
    }

    const refinedText = textContent.text.trim();
    console.log(`Transcrição refinada: ${refinedText.length} caracteres`);

    return refinedText;

  } catch (error) {
    console.error('Erro ao refinar transcrição com Claude:', error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new Error('API key do Anthropic inválida. Verifique a variável ANTHROPIC_API_KEY.');
      }
      if (error.status === 429) {
        throw new Error('Limite de requisições excedido. Aguarde um momento e tente novamente.');
      }
      if (error.status === 500 || error.status === 503) {
        throw new Error('Serviço do Claude temporariamente indisponível. Tente novamente em alguns minutos.');
      }
    }

    throw new Error(`Erro ao refinar transcrição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Versão simplificada que apenas formata sem usar Claude
 * (fallback se a API não estiver disponível)
 */
export function formatTranscriptBasic(
  rawTranscript: string,
  metadata: TranscriptMetadata
): string {
  // Limpa o título se for um nome de arquivo
  const cleanTitle = metadata.title
    .replace(/\.(mp4|mp3|wav|m4a|webm|ogg|mov|avi|mkv)$/i, '')
    .replace(/[-_]/g, ' ')
    .trim() || 'Transcrição';

  const header = `═══════════════════════════════════════════════════════════════════════════════
${cleanTitle.toUpperCase()}
${metadata.date || 'Data não especificada'}
${metadata.guest ? `Convidado: ${metadata.guest}` : ''}
═══════════════════════════════════════════════════════════════════════════════

`;

  // Formatação básica: adiciona quebras de linha a cada ~500 caracteres
  let formatted = rawTranscript;

  // Remove múltiplos espaços
  formatted = formatted.replace(/\s+/g, ' ');

  // Adiciona quebras de linha após pontos finais
  formatted = formatted.replace(/\.\s+/g, '.\n\n');

  // Adiciona quebras de linha após pontos de interrogação
  formatted = formatted.replace(/\?\s+/g, '?\n\n');

  return header + formatted.trim();
}
