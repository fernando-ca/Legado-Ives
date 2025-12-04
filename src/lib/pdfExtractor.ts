export interface PdfContent {
  text: string[];
  pageCount: number;
}

export async function extractTextFromPdf(file: File): Promise<PdfContent> {
  // Importar PDF.js dinamicamente apenas no cliente
  const pdfjsLib = await import('pdfjs-dist');

  // Configurar worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textPages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      textPages.push(pageText);
    }
  }

  return {
    text: textPages,
    pageCount: pdf.numPages
  };
}

export async function extractImagesFromPdf(file: File): Promise<string[]> {
  // Para extração de imagens, vamos usar uma abordagem mais simples
  // Renderizar a primeira página como imagem (capa)
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  try {
    // Renderizar primeira página como capa
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport: viewport
      }).promise;

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      images.push(dataUrl);
    }
  } catch (e) {
    console.error('Erro ao extrair capa:', e);
  }

  return images;
}
