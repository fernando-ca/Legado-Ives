'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import JSZip from 'jszip';

// Types
interface BatchFile {
  id: string;
  file: File;
  fileName: string;
  status: 'pending' | 'uploading' | 'transcribing' | 'done' | 'error';
  uploadProgress: number;
  blobUrl?: string; // URL do blob para retry
  result?: {
    transcript: string;
    srt: string;
  };
  error?: string;
}

type BatchStatus = 'idle' | 'processing' | 'done';

// Validação de tipos de arquivo
const VALID_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
const VALID_EXTENSIONS = /\.(mp4|mov|avi|webm|mp3|wav|m4a)$/i;

// Função para limpar nome do arquivo
const cleanFileName = (name: string): string => {
  return name
    .replace(/\.[^/.]+$/, '')           // Remove extensão
    .replace(/\s*\([^)]*\)\s*$/, '')    // Remove qualidade entre parênteses
    .trim();
};

// Função para validar arquivo
const isValidFile = (file: File): boolean => {
  return VALID_TYPES.some(type => file.type.includes(type.split('/')[1])) ||
         VALID_EXTENSIONS.test(file.name);
};

export default function Transcritor() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualiza status de um arquivo específico
  const updateFileStatus = useCallback((id: string, updates: Partial<BatchFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // Adiciona arquivos à lista
  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles.filter(isValidFile);

    if (validFiles.length !== newFiles.length) {
      setError('Alguns arquivos foram ignorados. Formatos aceitos: MP4, MOV, AVI, WEBM, MP3, WAV, M4A');
    }

    const batchFiles: BatchFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      fileName: cleanFileName(file.name),
      status: 'pending',
      uploadProgress: 0,
    }));

    setFiles(prev => [...prev, ...batchFiles]);
    setError(null);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  // Handle file input
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = ''; // Reset input para permitir selecionar os mesmos arquivos novamente
  };

  // Remove arquivo da lista
  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Helper: Promise com timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  // Helper: delay para retry
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Processa um único arquivo
  const processFile = useCallback(async (batchFile: BatchFile) => {
    const { id, file } = batchFile;
    let blobUrl: string | null = null;

    try {
      // 1. Upload (timeout de 5 minutos)
      updateFileStatus(id, { status: 'uploading', uploadProgress: 0 });

      const uploadPromise = upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
        onUploadProgress: (progress) => {
          const percent = progress.total > 0
            ? Math.round((progress.loaded / progress.total) * 100)
            : 0;
          updateFileStatus(id, { uploadProgress: percent });
        },
      });

      const blob = await withTimeout(uploadPromise, 300000, 'Upload demorou muito (timeout 5min)');
      blobUrl = blob.url;

      // Salva URL do blob no estado para permitir retry
      updateFileStatus(id, { blobUrl: blob.url });

      // 2. Transcrição com retry (3 tentativas, delay de 5s)
      updateFileStatus(id, { status: 'transcribing' });

      let data;
      let lastError: Error | null = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const transcribePromise = fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: blob.url }),
          });

          const response = await withTimeout(transcribePromise, 300000, 'Transcrição demorou muito (timeout 5min)');

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha na transcrição');
          }

          data = await response.json();
          break; // Sucesso, sai do loop

        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Erro desconhecido');
          console.log(`Tentativa ${attempt}/${MAX_RETRIES} falhou:`, lastError.message);

          if (attempt < MAX_RETRIES) {
            await delay(5000); // Aguarda 5s antes de tentar novamente
          }
        }
      }

      if (!data) {
        throw lastError || new Error('Falha na transcrição após múltiplas tentativas');
      }

      // 3. Salvar resultado
      updateFileStatus(id, {
        status: 'done',
        result: { transcript: data.transcript, srt: data.srt }
      });

      // 4. Limpar arquivo do Blob
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url }),
      }).catch(() => {});

    } catch (err) {
      // NÃO deleta o blob em caso de erro - permite retry sem re-upload
      updateFileStatus(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    }
  }, [updateFileStatus]);

  // Retry de um arquivo que falhou (usa blobUrl salvo)
  const retryFile = useCallback(async (batchFile: BatchFile) => {
    const { id, blobUrl, file } = batchFile;

    // Se não tem blobUrl, precisa fazer upload novamente
    if (!blobUrl) {
      updateFileStatus(id, { status: 'pending', error: undefined });
      await processFile(batchFile);
      return;
    }

    try {
      updateFileStatus(id, { status: 'transcribing', error: undefined });

      let data;
      let lastError: Error | null = null;
      const MAX_RETRIES = 3;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const transcribePromise = fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioUrl: blobUrl }),
          });

          const response = await withTimeout(transcribePromise, 300000, 'Transcrição demorou muito (timeout 5min)');

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha na transcrição');
          }

          data = await response.json();
          break;

        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Erro desconhecido');
          console.log(`Retry tentativa ${attempt}/${MAX_RETRIES} falhou:`, lastError.message);

          if (attempt < MAX_RETRIES) {
            await delay(5000);
          }
        }
      }

      if (!data) {
        throw lastError || new Error('Falha na transcrição após múltiplas tentativas');
      }

      updateFileStatus(id, {
        status: 'done',
        result: { transcript: data.transcript, srt: data.srt }
      });

      // Limpa blob após sucesso
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blobUrl }),
      }).catch(() => {});

    } catch (err) {
      updateFileStatus(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    }
  }, [updateFileStatus, processFile]);

  // Processa todos os arquivos com concorrência controlada
  const processAllFiles = useCallback(async () => {
    setBatchStatus('processing');
    setError(null);

    const pendingFiles = files.filter(f => f.status === 'pending');

    // Processa um arquivo por vez para evitar rate limit e sobrecarga
    for (const file of pendingFiles) {
      await processFile(file);
    }

    setBatchStatus('done');
  }, [files, processFile]);

  // Gera e baixa ZIP com todos os resultados
  const downloadAllAsZip = useCallback(async () => {
    const zip = new JSZip();
    const completedFiles = files.filter(f => f.status === 'done' && f.result);

    completedFiles.forEach(({ fileName, result }) => {
      zip.file(`${fileName}.txt`, result!.transcript);
      zip.file(`${fileName}.srt`, result!.srt);
    });

    const blob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricoes_${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [files]);

  // Reset tudo
  const handleReset = () => {
    setFiles([]);
    setBatchStatus('idle');
    setError(null);
  };

  // Contadores
  const pendingCount = files.filter(f => f.status === 'pending').length;
  const processingCount = files.filter(f => f.status === 'uploading' || f.status === 'transcribing').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  const isProcessing = batchStatus === 'processing';
  const hasFiles = files.length > 0;
  const hasPendingFiles = pendingCount > 0;
  const hasResults = doneCount > 0;

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-3 tracking-tight">
            Transcritor <span className="text-[#C9A962]">Vídeo</span> → <span className="text-[#C9A962]">Texto</span>
          </h1>
          <p className="text-white/80 text-lg">
            Transcreva múltiplos vídeos simultaneamente
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

          {/* Área de Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload de Arquivos
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
                }`}
            >
              <input
                id="fileInput"
                type="file"
                multiple
                accept=".mp4,.mov,.avi,.webm,.mp3,.wav,.m4a,video/*,audio/*"
                className="hidden"
                onChange={handleFileInput}
                disabled={isProcessing}
              />
              <div className="text-4xl mb-2">📹</div>
              <p className="text-gray-700 font-medium">
                Arraste seus vídeos ou áudios aqui
              </p>
              <p className="text-gray-500 text-sm">
                MP4, MOV, AVI, WEBM, MP3, WAV, M4A (até 500MB cada)
              </p>
              <p className="text-[#C9A962] text-sm mt-2 font-medium">
                Selecione múltiplos arquivos de uma vez
              </p>
            </div>
          </div>

          {/* Lista de Arquivos */}
          {hasFiles && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Arquivos ({files.length})
                </h3>
                {!isProcessing && (
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Limpar tudo
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map(file => (
                  <div
                    key={file.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      file.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                    }`}
                  >
                    {/* Ícone de status */}
                    <div className="w-6 flex-shrink-0">
                      {file.status === 'pending' && <span className="text-gray-400">○</span>}
                      {file.status === 'uploading' && (
                        <div className="w-4 h-4 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                      )}
                      {file.status === 'transcribing' && (
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {file.status === 'done' && <span className="text-green-500">✓</span>}
                      {file.status === 'error' && <span className="text-red-500">✕</span>}
                    </div>

                    {/* Nome do arquivo */}
                    <span className="flex-1 truncate text-sm text-gray-700" title={file.fileName}>
                      {file.fileName}
                    </span>

                    {/* Status/Progresso */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {file.status === 'pending' && (
                        <span className="text-xs text-gray-400">Aguardando</span>
                      )}

                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-[#C9A962] h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${file.uploadProgress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{file.uploadProgress}%</span>
                        </div>
                      )}

                      {file.status === 'transcribing' && (
                        <span className="text-xs text-blue-500">Transcrevendo...</span>
                      )}

                      {file.status === 'done' && (
                        <span className="text-xs text-green-500">Concluído</span>
                      )}

                      {file.status === 'error' && (
                        <span className="text-xs text-red-500" title={file.error}>Erro</span>
                      )}
                    </div>

                    {/* Botão retry para arquivos com erro */}
                    {!isProcessing && file.status === 'error' && (
                      <button
                        onClick={() => retryFile(file)}
                        className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex-shrink-0"
                        title="Tentar novamente"
                      >
                        Retry
                      </button>
                    )}

                    {/* Botão remover */}
                    {!isProcessing && file.status !== 'uploading' && file.status !== 'transcribing' && (
                      <button
                        onClick={() => removeFile(file.id)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Resumo */}
              {(isProcessing || batchStatus === 'done') && (
                <div className="mt-3 flex gap-4 text-xs">
                  {processingCount > 0 && (
                    <span className="text-blue-500">Processando: {processingCount}</span>
                  )}
                  {doneCount > 0 && (
                    <span className="text-green-500">Concluídos: {doneCount}</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-red-500">Erros: {errorCount}</span>
                  )}
                  {pendingCount > 0 && isProcessing && (
                    <span className="text-gray-400">Na fila: {pendingCount}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Erro geral */}
          {error && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
              {error}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="space-y-3">
            {/* Botão Iniciar */}
            {hasPendingFiles && !isProcessing && (
              <button
                onClick={processAllFiles}
                className="w-full bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                🎯 Iniciar Transcrição ({pendingCount} {pendingCount === 1 ? 'arquivo' : 'arquivos'})
              </button>
            )}

            {/* Indicador de Processamento */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-4">
                <div className="w-6 h-6 border-3 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                <span className="text-gray-600">Processando transcrições...</span>
              </div>
            )}

            {/* Botão Reprocessar Erros */}
            {!isProcessing && errorCount > 0 && (
              <button
                onClick={async () => {
                  setBatchStatus('processing');
                  const errorFiles = files.filter(f => f.status === 'error');
                  for (const file of errorFiles) {
                    await retryFile(file);
                  }
                  setBatchStatus('done');
                }}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                🔄 Reprocessar {errorCount} {errorCount === 1 ? 'arquivo com erro' : 'arquivos com erro'}
              </button>
            )}

            {/* Botão Download ZIP */}
            {batchStatus === 'done' && hasResults && (
              <button
                onClick={downloadAllAsZip}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                📦 Baixar Todas as Transcrições (ZIP)
              </button>
            )}

            {/* Botão Nova Transcrição */}
            {batchStatus === 'done' && (
              <button
                onClick={handleReset}
                className="w-full px-6 py-3 border-2 border-[#8B2323] rounded-lg font-semibold text-[#5C1515] hover:bg-[#8B2323]/10 transition-all"
              >
                Nova Transcrição
              </button>
            )}
          </div>

          {/* Instruções quando vazio */}
          {!hasFiles && (
            <div className="text-center text-gray-500 text-sm mt-4">
              Selecione um ou mais arquivos de vídeo/áudio para começar
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
