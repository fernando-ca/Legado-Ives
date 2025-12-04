'use client';

import { useState, useCallback } from 'react';
import { extractTextFromPdf, extractImagesFromPdf } from '@/lib/pdfExtractor';
import { extractMetadata } from '@/lib/metadataParser';
import { generateEpub } from '@/lib/epubGenerator';

interface PdfData {
  file: File;
  text: string[];
  title: string;
  author: string;
  coverImage: string | null;
  pageCount: number;
}

export default function Home() {
  const [pdfData, setPdfData] = useState<PdfData | null>(null);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processPdf = async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      // Extrair texto
      const { text, pageCount } = await extractTextFromPdf(file);

      // Extrair imagens (capa)
      const images = await extractImagesFromPdf(file);
      const coverImage = images.length > 0 ? images[0] : null;

      // Extrair metadados
      const metadata = extractMetadata(text, file.name);

      setPdfData({
        file,
        text,
        title: metadata.title,
        author: metadata.author,
        coverImage,
        pageCount
      });
    } catch (err) {
      setError('Erro ao processar PDF. Verifique se o arquivo é válido.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      processPdf(file);
    } else {
      setError('Por favor, selecione um arquivo PDF.');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdf(file);
    }
  };

  const handleConvert = async () => {
    if (!pdfData) return;

    setConverting(true);
    try {
      await generateEpub({
        title: pdfData.title,
        author: pdfData.author,
        content: pdfData.text,
        coverImage: pdfData.coverImage || undefined
      });
    } catch (err) {
      setError('Erro ao gerar EPUB.');
      console.error(err);
    } finally {
      setConverting(false);
    }
  };

  const handleReset = () => {
    setPdfData(null);
    setError(null);
  };

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-3 tracking-tight">
            Conversor <span className="text-[#C9A962]">PDF</span> → <span className="text-[#C9A962]">EPUB</span>
          </h1>
          <p className="text-white/80 text-lg">
            Converta seus livros em PDF para formato EPUB
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#C9A962]/20">
          {!pdfData ? (
            /* Upload Area */
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              className={`border-3 border-dashed rounded-xl p-12 text-center transition-all cursor-pointer
                ${dragActive
                  ? 'border-[#C9A962] bg-[#FDF8E8]'
                  : 'border-gray-300 hover:border-[#C9A962] hover:bg-[#FDF8E8]/50'
                }
                ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => document.getElementById('fileInput')?.click()}
            >
              <input
                id="fileInput"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileInput}
              />

              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-[#C9A962] border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-600">Processando PDF...</p>
                </div>
              ) : (
                <>
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-xl font-semibold text-gray-700 mb-2">
                    Arraste seu PDF aqui
                  </p>
                  <p className="text-gray-500">
                    ou clique para selecionar
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Preview e Edição */
            <div className="space-y-6">
              {/* Capa e Metadados */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Capa */}
                <div className="flex-shrink-0">
                  {pdfData.coverImage ? (
                    <img
                      src={pdfData.coverImage}
                      alt="Capa do livro"
                      className="w-48 h-auto rounded-lg shadow-lg mx-auto md:mx-0"
                    />
                  ) : (
                    <div className="w-48 h-64 bg-gray-200 rounded-lg flex items-center justify-center mx-auto md:mx-0">
                      <span className="text-gray-400 text-4xl">📕</span>
                    </div>
                  )}
                </div>

                {/* Formulário de Metadados */}
                <div className="flex-grow space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Título do Livro
                    </label>
                    <input
                      type="text"
                      value={pdfData.title}
                      onChange={(e) => setPdfData({ ...pdfData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A962] focus:border-transparent text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Autor
                    </label>
                    <input
                      type="text"
                      value={pdfData.author}
                      onChange={(e) => setPdfData({ ...pdfData, author: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A962] focus:border-transparent text-lg"
                    />
                  </div>

                  <div className="text-sm text-gray-500">
                    <p>📄 {pdfData.pageCount} páginas</p>
                    <p>📁 {pdfData.file.name}</p>
                  </div>
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="flex-1 bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {converting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Convertendo...
                    </>
                  ) : (
                    <>
                      📚 Converter para EPUB
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="px-6 py-4 border-2 border-[#8B2323] rounded-lg font-semibold text-[#5C1515] hover:bg-[#8B2323]/10 transition-all"
                >
                  Novo PDF
                </button>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-[#8B2323]/30 rounded-lg text-[#8B2323]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 mt-8 text-sm tracking-wide">
          <span className="text-[#C9A962]">Legado Ives</span> — Conversor de PDF para EPUB
        </p>
      </div>
    </main>
  );
}
