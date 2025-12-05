'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { extractTextFromPdf, extractImagesFromPdf } from '@/lib/pdfExtractor';
import { extractMetadata } from '@/lib/metadataParser';
import { generateEpub, generateEpubBlob, generateMultipleEpubsZip, EpubFile } from '@/lib/epubGenerator';

interface PdfData {
  id: string;
  file: File;
  text: string[];
  title: string;
  author: string;
  coverImage: string | null;
  pageCount: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
}

export default function Home() {
  const [pdfList, setPdfList] = useState<PdfData[]>([]);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const generateId = () => Math.random().toString(36).substring(2, 9);

  const processPdf = async (file: File): Promise<PdfData | null> => {
    try {
      const { text, pageCount } = await extractTextFromPdf(file);
      const images = await extractImagesFromPdf(file);
      const coverImage = images.length > 0 ? images[0] : null;
      const metadata = extractMetadata(text, file.name);

      return {
        id: generateId(),
        file,
        text,
        title: metadata.title,
        author: metadata.author,
        coverImage,
        pageCount,
        status: 'ready'
      };
    } catch (err) {
      console.error(`Erro ao processar ${file.name}:`, err);
      return null;
    }
  };

  const processMultipleFiles = async (files: File[]) => {
    setLoading(true);
    setError(null);
    setProgress({ current: 0, total: files.length });

    const results: PdfData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf') {
        setProgress({ current: i + 1, total: files.length });
        const result = await processPdf(file);
        if (result) {
          results.push(result);
        }
      }
    }

    if (results.length === 0) {
      setError('Nenhum PDF válido foi processado.');
    } else {
      setPdfList(prev => [...prev, ...results]);
    }

    setLoading(false);
    setProgress({ current: 0, total: 0 });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFiles = files.filter(f => f.type === 'application/pdf');

    if (pdfFiles.length === 0) {
      setError('Por favor, selecione arquivos PDF.');
      return;
    }

    processMultipleFiles(pdfFiles);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processMultipleFiles(files);
    }
    // Reset input para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
  };

  const handleConvert = async () => {
    if (pdfList.length === 0) return;

    setConverting(true);
    setProgress({ current: 0, total: pdfList.length });

    try {
      // Se for apenas 1 arquivo, baixa direto como EPUB
      if (pdfList.length === 1) {
        const pdf = pdfList[0];
        await generateEpub({
          title: pdf.title,
          author: pdf.author,
          content: pdf.text,
          coverImage: pdf.coverImage || undefined
        });
      } else {
        // Múltiplos arquivos: gerar ZIP
        const epubFiles: EpubFile[] = [];

        for (let i = 0; i < pdfList.length; i++) {
          const pdf = pdfList[i];
          setProgress({ current: i + 1, total: pdfList.length });

          const epubFile = await generateEpubBlob({
            title: pdf.title,
            author: pdf.author,
            content: pdf.text,
            coverImage: pdf.coverImage || undefined
          });

          epubFiles.push(epubFile);
        }

        await generateMultipleEpubsZip(epubFiles);
      }
    } catch (err) {
      setError('Erro ao gerar EPUB(s).');
      console.error(err);
    } finally {
      setConverting(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  const handleRemovePdf = (id: string) => {
    setPdfList(prev => prev.filter(pdf => pdf.id !== id));
  };

  const handleUpdatePdf = (id: string, field: 'title' | 'author', value: string) => {
    setPdfList(prev => prev.map(pdf =>
      pdf.id === id ? { ...pdf, [field]: value } : pdf
    ));
  };

  const handleReset = () => {
    setPdfList([]);
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

        {/* Navegação */}
        <div className="flex justify-center gap-4 mb-6">
          <span className="px-4 py-2 rounded-lg bg-[#C9A962] text-white font-medium">
            PDF → EPUB
          </span>
          <Link
            href="/transcritor"
            className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            Vídeo → Texto
          </Link>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#C9A962]/20">
          {/* Upload Area - sempre visível quando não está convertendo */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            className={`border-3 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer mb-6
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
              multiple
              className="hidden"
              onChange={handleFileInput}
            />

            {loading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-[#C9A962] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-600">
                  Processando {progress.current} de {progress.total} PDFs...
                </p>
              </div>
            ) : (
              <>
                <div className="text-5xl mb-3">📄</div>
                <p className="text-lg font-semibold text-gray-700 mb-1">
                  Arraste seus PDFs aqui
                </p>
                <p className="text-gray-500 text-sm">
                  ou clique para selecionar (múltiplos arquivos permitidos)
                </p>
              </>
            )}
          </div>

          {/* Lista de PDFs selecionados */}
          {pdfList.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-700">
                  {pdfList.length} {pdfList.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </h3>
                <button
                  onClick={handleReset}
                  className="text-sm text-[#8B2323] hover:underline"
                >
                  Limpar todos
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {pdfList.map((pdf) => (
                  <div
                    key={pdf.id}
                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    {/* Thumbnail */}
                    <div className="flex-shrink-0">
                      {pdf.coverImage ? (
                        <img
                          src={pdf.coverImage}
                          alt="Capa"
                          className="w-16 h-20 object-cover rounded shadow"
                        />
                      ) : (
                        <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-2xl">📕</span>
                        </div>
                      )}
                    </div>

                    {/* Campos editáveis */}
                    <div className="flex-grow space-y-2">
                      <input
                        type="text"
                        value={pdf.title}
                        onChange={(e) => handleUpdatePdf(pdf.id, 'title', e.target.value)}
                        placeholder="Título"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#C9A962] focus:border-transparent text-sm font-medium"
                      />
                      <input
                        type="text"
                        value={pdf.author}
                        onChange={(e) => handleUpdatePdf(pdf.id, 'author', e.target.value)}
                        placeholder="Autor"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#C9A962] focus:border-transparent text-sm"
                      />
                      <p className="text-xs text-gray-500">
                        {pdf.pageCount} páginas • {pdf.file.name}
                      </p>
                    </div>

                    {/* Botão remover */}
                    <button
                      onClick={() => handleRemovePdf(pdf.id)}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#8B2323] hover:bg-red-50 rounded transition-all"
                      title="Remover"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Botão de conversão */}
              <div className="pt-4 border-t">
                <button
                  onClick={handleConvert}
                  disabled={converting || pdfList.length === 0}
                  className="w-full bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {converting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Convertendo {progress.current} de {progress.total}...
                    </>
                  ) : (
                    <>
                      📚 {pdfList.length === 1 ? 'Converter para EPUB' : `Converter ${pdfList.length} arquivos (ZIP)`}
                    </>
                  )}
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
