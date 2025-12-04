export interface Metadata {
  title: string;
  author: string;
}

export function extractMetadata(text: string[], filename: string): Metadata {
  // Valores padrão baseados no nome do arquivo
  let title = filename.replace('.pdf', '').replace(/[-_]/g, ' ');
  let author = 'Autor Desconhecido';

  // Analisar primeiras páginas para encontrar título e autor
  const firstPages = text.slice(0, 5).join(' ');

  // Padrões comuns para autor
  const authorPatterns = [
    /(?:autor|author|por|by|escrito por|written by)[:\s]+([A-Za-zÀ-ÿ\s]+)/i,
    /([A-Z][a-zÀ-ÿ]+(?:\s+[A-Z][a-zÀ-ÿ]+){1,4})\s*(?:autor|author)/i,
  ];

  for (const pattern of authorPatterns) {
    const match = firstPages.match(pattern);
    if (match && match[1]) {
      const potentialAuthor = match[1].trim();
      // Verificar se parece um nome válido
      if (potentialAuthor.length > 3 && potentialAuthor.length < 100) {
        author = potentialAuthor;
        break;
      }
    }
  }

  // Tentar extrair título da primeira página
  if (text.length > 0) {
    const firstPage = text[0];
    // Pegar as primeiras palavras significativas
    const words = firstPage.split(/\s+/).slice(0, 15);
    const potentialTitle = words.join(' ').trim();

    if (potentialTitle.length > 5 && potentialTitle.length < 200) {
      // Limpar título
      title = potentialTitle
        .replace(/\d{4,}/g, '') // Remover anos longos/números
        .replace(/ISBN[:\s\d-]+/gi, '') // Remover ISBN
        .trim();
    }
  }

  // Limpar valores inválidos
  const invalidValues = [
    'untitled', 'documento', 'document', 'pdf',
    'microsoft word', 'adobe', 'kodak'
  ];

  if (invalidValues.some(v => title.toLowerCase().includes(v))) {
    title = filename.replace('.pdf', '').replace(/[-_]/g, ' ');
  }

  return { title, author };
}
