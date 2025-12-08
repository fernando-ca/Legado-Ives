'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';

type TranscriptionStatus = 'idle' | 'extracting' | 'transcribing' | 'done' | 'error';

interface TranscriptionResult {
  transcript: string;
  srt: string;
}

export default function Transcritor() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<TranscriptionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [sourceFileName, setSourceFileName] = useState<string>('');

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
      if (validTypes.some(type => droppedFile.type.includes(type.split('/')[1])) || droppedFile.name.match(/\.(mp4|mov|avi|webm|mp3|wav|m4a)$/i)) {
        setFile(droppedFile);
        setYoutubeUrl('');
        setError(null);
      } else {
        setError('Formato não suportado. Use MP4, MOV, AVI, WEBM, MP3, WAV ou M4A.');
      }
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setYoutubeUrl('');
      setError(null);
    }
  };

  const handleYoutubeUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYoutubeUrl(e.target.value);
    if (e.target.value) {
      setFile(null);
    }
    setError(null);
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTranscribe = async () => {
    setError(null);
    setResult(null);

    try {
      let audioUrl: string;

      if (youtubeUrl) {
        // Extrair áudio do YouTube
        setStatus('extracting');
        const ytResponse = await fetch('/api/youtube-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: youtubeUrl }),
        });

        if (!ytResponse.ok) {
          const data = await ytResponse.json();
          throw new Error(data.error || 'Falha ao extrair áudio do YouTube');
        }

        const ytData = await ytResponse.json();
        audioUrl = ytData.audioUrl;
      } else if (file) {
        // Upload do arquivo (client-side para suportar arquivos grandes)
        setStatus('extracting');
        setUploadProgress(0);

        // Guardar nome do arquivo sem extensão para usar no download
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setSourceFileName(fileNameWithoutExt);

        const blob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          },
        });

        audioUrl = blob.url;
      } else {
        throw new Error('Selecione um arquivo ou cole uma URL do YouTube');
      }

      // Transcrever
      setStatus('transcribing');
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });

      if (!transcribeResponse.ok) {
        const data = await transcribeResponse.json();
        throw new Error(data.error || 'Falha na transcrição');
      }

      const transcribeData = await transcribeResponse.json();
      setResult({
        transcript: transcribeData.transcript,
        srt: transcribeData.srt,
      });
      setStatus('done');

      // Deletar arquivo do Vercel Blob se foi upload
      if (file) {
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl }),
        }).catch(() => {}); // Ignora erro ao deletar
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setYoutubeUrl('');
    setFile(null);
    setStatus('idle');
    setError(null);
    setResult(null);
    setUploadProgress(0);
    setSourceFileName('');
  };

  const isProcessing = status === 'extracting' || status === 'transcribing';

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-3 tracking-tight">
            Transcritor <span className="text-[#C9A962]">Vídeo</span> → <span className="text-[#C9A962]">Texto</span>
          </h1>
          <p className="text-white/80 text-lg">
            Transcreva vídeos do YouTube ou arquivos locais para texto
          </p>
        </div>

        {/* Navegação */}
        <div className="flex justify-center gap-4 mb-6">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          >
            PDF → EPUB
          </Link>
          <span className="px-4 py-2 rounded-lg bg-[#C9A962] text-white font-medium">
            Vídeo → Texto
          </span>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 border border-[#C9A962]/20">
          {status === 'idle' || status === 'error' ? (
            <div className="space-y-6">
              {/* Upload de Arquivo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload de Arquivo
                </label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onClick={() => document.getElementById('fileInput')?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
                    ${dragActive
                      ? 'border-[#C9A962] bg-[#FDF8E8]'
                      : 'border-gray-300 hover:border-[#C9A962] hover:bg-[#FDF8E8]/50'
                    }
                    ${file ? 'bg-[#FDF8E8] border-[#C9A962]' : ''}`}
                >
                  <input
                    id="fileInput"
                    type="file"
                    accept=".mp4,.mov,.avi,.webm,.mp3,.wav,.m4a,video/*,audio/*"
                    className="hidden"
                    onChange={handleFileInput}
                  />

                  {file ? (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">📁</span>
                      <span className="text-gray-700 font-medium">{file.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-4xl mb-2">📹</div>
                      <p className="text-gray-700 font-medium">
                        Arraste seu vídeo ou áudio aqui
                      </p>
                      <p className="text-gray-500 text-sm">
                        MP4, MOV, AVI, WEBM, MP3, WAV, M4A
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Divisor */}
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-gray-400 text-sm">ou</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* URL do YouTube */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do YouTube
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={handleYoutubeUrlChange}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A962] focus:border-transparent"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Suporta: YouTube, YouTube Shorts
                </p>
              </div>

              {/* Botão Transcrever */}
              <button
                onClick={handleTranscribe}
                disabled={!youtubeUrl && !file}
                className="w-full bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
              >
                🎯 Iniciar Transcrição
              </button>
            </div>
          ) : status === 'extracting' || status === 'transcribing' ? (
            /* Progresso */
            <div className="py-8">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-4 border-[#C9A962] border-t-transparent rounded-full animate-spin mb-6" />

                <div className="space-y-3 w-full max-w-md">
                  <div className="flex items-center gap-3">
                    {status === 'extracting' ? (
                      <div className="w-5 h-5 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-green-500 text-xl">✓</span>
                    )}
                    <span className={status === 'extracting' ? 'text-gray-700' : 'text-gray-400'}>
                      {youtubeUrl ? 'Extraindo áudio do YouTube...' : `Enviando arquivo... ${uploadProgress > 0 ? `${uploadProgress}%` : ''}`}
                    </span>
                  </div>
                  {/* Barra de progresso para upload de arquivo */}
                  {status === 'extracting' && !youtubeUrl && uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-[#C9A962] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    {status === 'transcribing' ? (
                      <div className="w-5 h-5 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="text-gray-300">○</span>
                    )}
                    <span className={status === 'transcribing' ? 'text-gray-700' : 'text-gray-400'}>
                      Transcrevendo com IA...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : status === 'done' && result ? (
            /* Resultado */
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <span className="text-2xl">✓</span>
                <span>Transcrição concluída!</span>
              </div>

              {/* Botões de Download */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => downloadFile(result.transcript, `${sourceFileName || 'transcricao'}.txt`, 'text/plain')}
                  className="flex-1 bg-[#C9A962] hover:bg-[#B89A52] text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  📥 Baixar TXT
                </button>
                <button
                  onClick={() => downloadFile(result.srt, `${sourceFileName || 'legendas'}.srt`, 'text/plain')}
                  className="flex-1 bg-[#5C1515] hover:bg-[#8B2323] text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                >
                  📥 Baixar SRT
                </button>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview da transcrição:
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {result.transcript}
                  </p>
                </div>
              </div>

              {/* Botão Nova Transcrição */}
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 border-2 border-[#8B2323] rounded-lg font-semibold text-[#5C1515] hover:bg-[#8B2323]/10 transition-all"
              >
                Nova Transcrição
              </button>
            </div>
          ) : null}

          {/* Erro */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-[#8B2323]/30 rounded-lg text-[#8B2323]">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-white/70 mt-8 text-sm tracking-wide">
          <span className="text-[#C9A962]">Legado Ives</span> — Transcritor de Vídeos para Texto
        </p>
      </div>
    </main>
  );
}
