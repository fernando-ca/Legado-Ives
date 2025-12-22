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

  const prompt = `Você é um revisor especializado em transcrições de entrevistas jurídicas brasileiras.

TAREFA: Revise e formate a transcrição bruta abaixo, criando um documento legível e profissional.

REGRAS IMPORTANTES:
1. CORRIJA erros de português, pontuação e termos jurídicos (ex: "habias corpus" → "habeas corpus")
2. IDENTIFIQUE os falantes e separe suas falas em blocos com [NOME]
3. Use [APRESENTADOR] ou [ENTREVISTADOR] para quem faz perguntas
4. Use o nome do convidado (se fornecido) ou [ENTREVISTADO] para as respostas
5. REMOVA hesitações excessivas ("é...", "né", "então...", "aí...", repetições)
6. MANTENHA o conteúdo e significado original - apenas corrija e formate
7. PRESERVE informações importantes como nomes, datas, leis, artigos
8. Se houver mais de 2 pessoas, identifique cada uma
9. Adicione parágrafos para melhorar a legibilidade das falas longas

FORMATO DE SAÍDA (use exatamente este formato):
═══════════════════════════════════════════════════════════════════════════════
${metadata.title.toUpperCase()}
${metadata.date || 'Data não especificada'}
${metadata.guest ? `Convidado: ${metadata.guest}` : ''}
═══════════════════════════════════════════════════════════════════════════════

[APRESENTADOR]
Texto da fala do apresentador aqui, com parágrafos quando necessário.

Continuação da fala se for longa.

[${metadata.guest?.split(' ')[0]?.toUpperCase() || 'ENTREVISTADO'}]
Texto da resposta do entrevistado aqui.

---

TRANSCRIÇÃO BRUTA PARA REFINAR:
${transcript}

---

METADADOS:
- Título: ${metadata.title}
- Data: ${metadata.date || 'Não especificada'}
- Convidado: ${metadata.guest || 'Não especificado'}

Agora, forneça a transcrição refinada e formatada:`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: prompt,
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
  const header = `═══════════════════════════════════════════════════════════════════════════════
${metadata.title.toUpperCase()}
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
