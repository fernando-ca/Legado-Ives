// Declarar o tipo global do PDF.js
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export interface PdfContent {
  text: string[];
  pageCount: number;
}

// Aguardar o PDF.js carregar
function waitForPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window não disponível'));
      return;
    }

    // Se já carregou
    if (window.pdfjsLib) {
      // Configurar worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
      return;
    }

    // Aguardar carregar (máximo 10 segundos)
    let attempts = 0;
    const maxAttempts = 100;

    const checkInterval = setInterval(() => {
      attempts++;
      if (window.pdfjsLib) {
        clearInterval(checkInterval);
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Timeout aguardando PDF.js carregar'));
      }
    }, 100);
  });
}

export async function extractTextFromPdf(file: File): Promise<PdfContent> {
  const pdfjsLib = await waitForPdfJs();

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
  const pdfjsLib = await waitForPdfJs();

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
