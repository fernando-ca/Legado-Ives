import * as pdfjsLib from 'pdfjs-dist';

// Configurar worker com versão específica que existe no CDN
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs';
}

export interface PdfContent {
  text: string[];
  pageCount: number;
}

export async function extractTextFromPdf(file: File): Promise<PdfContent> {
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
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const images: string[] = [];

  // Extrair imagens das primeiras 3 páginas
  const pagesToCheck = Math.min(3, pdf.numPages);

  for (let i = 1; i <= pagesToCheck; i++) {
    const page = await pdf.getPage(i);
    const operatorList = await page.getOperatorList();

    for (let j = 0; j < operatorList.fnArray.length; j++) {
      if (operatorList.fnArray[j] === pdfjsLib.OPS.paintImageXObject) {
        const imgName = operatorList.argsArray[j][0];
        try {
          const img = await page.objs.get(imgName);
          if (img && img.data) {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (ctx) {
              const imageData = ctx.createImageData(img.width, img.height);

              // Converter dados da imagem
              if (img.data.length === img.width * img.height * 4) {
                imageData.data.set(img.data);
              } else if (img.data.length === img.width * img.height * 3) {
                // RGB para RGBA
                for (let k = 0; k < img.width * img.height; k++) {
                  imageData.data[k * 4] = img.data[k * 3];
                  imageData.data[k * 4 + 1] = img.data[k * 3 + 1];
                  imageData.data[k * 4 + 2] = img.data[k * 3 + 2];
                  imageData.data[k * 4 + 3] = 255;
                }
              }

              ctx.putImageData(imageData, 0, 0);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

              // Só adicionar imagens maiores (provavelmente capas)
              if (img.width > 100 && img.height > 100) {
                images.push(dataUrl);
              }
            }
          }
        } catch (e) {
          // Ignorar erros de extração de imagem
        }
      }
    }
  }

  return images;
}
