export interface Metadata {
  title: string;
  author: string;
}

export function extractMetadata(text: string[], filename: string): Metadata {
  // Usar nome do arquivo como título (sem extensão, substituindo - e _ por espaços)
  const title = filename
    .replace(/\.pdf$/i, '')
    .replace(/[-_]/g, ' ')
    .trim();

  // Autor padrão fixo
  const author = 'Ives Gandra Da Silva Martins';

  return { title, author };
}
