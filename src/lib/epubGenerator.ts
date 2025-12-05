import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface EpubOptions {
  title: string;
  author: string;
  content: string[];
  coverImage?: string;
}

export interface EpubFile {
  filename: string;
  blob: Blob;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '_') // Espaços por underscore
    .substring(0, 50);
}

export async function generateEpub(options: EpubOptions): Promise<void> {
  const { title, author, content, coverImage } = options;
  const zip = new JSZip();
  const uuid = generateUUID();

  // mimetype (deve ser o primeiro arquivo, sem compressão)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // Criar capítulos
  const chapters: { id: string; filename: string; title: string }[] = [];
  const pagesPerChapter = Math.max(10, Math.ceil(content.length / 10));

  for (let i = 0; i < content.length; i += pagesPerChapter) {
    const chapterNum = Math.floor(i / pagesPerChapter) + 1;
    const chapterContent = content.slice(i, i + pagesPerChapter);
    const chapterId = `chapter${chapterNum}`;
    const chapterFilename = `${chapterId}.xhtml`;

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head>
  <title>Capítulo ${chapterNum}</title>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: serif; line-height: 1.6; padding: 1em; }
    p { text-align: justify; text-indent: 1.5em; margin: 0.5em 0; }
    h1 { text-align: center; margin-bottom: 1em; }
  </style>
</head>
<body>
  <h1>Capítulo ${chapterNum}</h1>
  ${chapterContent.map(text => `<p>${escapeHtml(text)}</p>`).join('\n  ')}
</body>
</html>`;

    zip.file(`OEBPS/${chapterFilename}`, chapterHtml);
    chapters.push({ id: chapterId, filename: chapterFilename, title: `Capítulo ${chapterNum}` });
  }

  // Adicionar capa se existir
  let coverManifest = '';
  let coverSpine = '';

  if (coverImage) {
    // Extrair dados da imagem base64
    const base64Data = coverImage.split(',')[1];
    const imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    zip.file('OEBPS/cover.jpg', imageData);

    // Página de capa
    const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capa</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <img src="cover.jpg" alt="Capa"/>
</body>
</html>`;

    zip.file('OEBPS/cover.xhtml', coverHtml);
    coverManifest = `
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
    coverSpine = '<itemref idref="cover"/>';
  }

  // OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${coverManifest}
    ${chapters.map(ch => `<item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>
    ${coverSpine}
    ${chapters.map(ch => `<itemref idref="${ch.id}"/>`).join('\n    ')}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', contentOpf);

  // OEBPS/nav.xhtml (índice)
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Índice</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>Índice</h1>
    <ol>
      ${chapters.map(ch => `<li><a href="${ch.filename}">${ch.title}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

  zip.file('OEBPS/nav.xhtml', navXhtml);

  // Gerar e baixar
  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const filename = `${sanitizeFilename(title)}.epub`;
  saveAs(blob, filename);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Gera EPUB e retorna o Blob (sem fazer download)
export async function generateEpubBlob(options: EpubOptions): Promise<EpubFile> {
  const { title, author, content, coverImage } = options;
  const zip = new JSZip();
  const uuid = generateUUID();

  // mimetype (deve ser o primeiro arquivo, sem compressão)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  // Criar capítulos
  const chapters: { id: string; filename: string; title: string }[] = [];
  const pagesPerChapter = Math.max(10, Math.ceil(content.length / 10));

  for (let i = 0; i < content.length; i += pagesPerChapter) {
    const chapterNum = Math.floor(i / pagesPerChapter) + 1;
    const chapterContent = content.slice(i, i + pagesPerChapter);
    const chapterId = `chapter${chapterNum}`;
    const chapterFilename = `${chapterId}.xhtml`;

    const chapterHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="pt-BR">
<head>
  <title>Capítulo ${chapterNum}</title>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: serif; line-height: 1.6; padding: 1em; }
    p { text-align: justify; text-indent: 1.5em; margin: 0.5em 0; }
    h1 { text-align: center; margin-bottom: 1em; }
  </style>
</head>
<body>
  <h1>Capítulo ${chapterNum}</h1>
  ${chapterContent.map(text => `<p>${escapeHtml(text)}</p>`).join('\n  ')}
</body>
</html>`;

    zip.file(`OEBPS/${chapterFilename}`, chapterHtml);
    chapters.push({ id: chapterId, filename: chapterFilename, title: `Capítulo ${chapterNum}` });
  }

  // Adicionar capa se existir
  let coverManifest = '';
  let coverSpine = '';

  if (coverImage) {
    const base64Data = coverImage.split(',')[1];
    const imageData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    zip.file('OEBPS/cover.jpg', imageData);

    const coverHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Capa</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100%; }
  </style>
</head>
<body>
  <img src="cover.jpg" alt="Capa"/>
</body>
</html>`;

    zip.file('OEBPS/cover.xhtml', coverHtml);
    coverManifest = `
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="cover-image" href="cover.jpg" media-type="image/jpeg" properties="cover-image"/>`;
    coverSpine = '<itemref idref="cover"/>';
  }

  // OEBPS/content.opf
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">urn:uuid:${uuid}</dc:identifier>
    <dc:title>${escapeHtml(title)}</dc:title>
    <dc:creator>${escapeHtml(author)}</dc:creator>
    <dc:language>pt-BR</dc:language>
    <meta property="dcterms:modified">${new Date().toISOString().split('.')[0]}Z</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>${coverManifest}
    ${chapters.map(ch => `<item id="${ch.id}" href="${ch.filename}" media-type="application/xhtml+xml"/>`).join('\n    ')}
  </manifest>
  <spine>
    ${coverSpine}
    ${chapters.map(ch => `<itemref idref="${ch.id}"/>`).join('\n    ')}
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', contentOpf);

  // OEBPS/nav.xhtml (índice)
  const navXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Índice</title>
</head>
<body>
  <nav epub:type="toc">
    <h1>Índice</h1>
    <ol>
      ${chapters.map(ch => `<li><a href="${ch.filename}">${ch.title}</a></li>`).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;

  zip.file('OEBPS/nav.xhtml', navXhtml);

  const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
  const filename = `${sanitizeFilename(title)}.epub`;

  return { filename, blob };
}

// Gera múltiplos EPUBs e retorna um ZIP com todos
export async function generateMultipleEpubsZip(epubFiles: EpubFile[]): Promise<void> {
  const zip = new JSZip();

  for (const epub of epubFiles) {
    zip.file(epub.filename, epub.blob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'ebooks-convertidos.zip');
}
