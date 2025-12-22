'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { upload } from '@vercel/blob/client';
import JSZip from 'jszip';

// Types
interface UrlItem {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'extracting' | 'transcribing' | 'refining' | 'done' | 'error';
  result?: string;
  error?: string;
  metadata?: {
    title: string;
    date: string;
    guest: string;
  };
}

interface BatchFile {
  id: string;
  file: File;
  fileName: string;
  status: 'pending' | 'uploading' | 'transcribing' | 'refining' | 'done' | 'error';
  uploadProgress: number;
  blobUrl?: string;
  result?: {
    transcript: string;
  };
  error?: string;
}

type TabType = 'url' | 'batch' | 'files';
type BatchStatus = 'idle' | 'processing' | 'done';

// Validação de tipos de arquivo
const VALID_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
const VALID_EXTENSIONS = /\.(mp4|mov|avi|webm|mp3|wav|m4a)$/i;

const cleanFileName = (name: string): string => {
  return name
    .replace(/\.[^/.]+$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
};

const isValidFile = (file: File): boolean => {
  return VALID_TYPES.some(type => file.type.includes(type.split('/')[1])) ||
         VALID_EXTENSIONS.test(file.name);
};

// Extrai nome amigável da URL
const extractNameFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const lastPart = pathname.split('/').filter(Boolean).pop() || '';
    return lastPart.replace(/-/g, ' ').replace(/\d{2}-\d{2}-\d{4}/, '').trim() || 'Entrevista';
  } catch {
    return 'Entrevista';
  }
};

export default function Transcritor() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('url');

  // URL única
  const [singleUrl, setSingleUrl] = useState('');
  const [singleUrlStatus, setSingleUrlStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [singleUrlResult, setSingleUrlResult] = useState<string | null>(null);
  const [singleUrlError, setSingleUrlError] = useState<string | null>(null);
  const [singleUrlProgress, setSingleUrlProgress] = useState('');

  // Batch URLs
  const [batchUrls, setBatchUrls] = useState('');
  const [urlItems, setUrlItems] = useState<UrlItem[]>([]);
  const [urlBatchStatus, setUrlBatchStatus] = useState<BatchStatus>('idle');

  // Files (existente)
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [fileBatchStatus, setFileBatchStatus] = useState<BatchStatus>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper: Promise com timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms)
    );
    return Promise.race([promise, timeout]);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // ==================== URL ÚNICA ====================

  const processUrlItem = async (url: string, onProgress: (msg: string) => void): Promise<string> => {
    // 1. Extrair áudio
    onProgress('Extraindo áudio do vídeo...');
    const audioResponse = await withTimeout(
      fetch('/api/video-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      }),
      60000,
      'Timeout ao extrair áudio'
    );

    if (!audioResponse.ok) {
      const errorData = await audioResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao extrair áudio');
    }

    const { audioUrl, metadata } = await audioResponse.json();

    // 2. Transcrever
    onProgress('Transcrevendo áudio...');
    const transcribeResponse = await withTimeout(
      fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      }),
      300000,
      'Timeout na transcrição'
    );

    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro na transcrição');
    }

    const { transcript } = await transcribeResponse.json();

    // 3. Refinar com Claude
    onProgress('Refinando transcrição com IA...');
    const refineResponse = await withTimeout(
      fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          title: metadata?.title || 'Entrevista',
          date: metadata?.date || '',
          guest: metadata?.guest || '',
        }),
      }),
      120000,
      'Timeout no refinamento'
    );

    if (!refineResponse.ok) {
      const errorData = await refineResponse.json().catch(() => ({}));
      // Se o refinamento falhar, retorna transcrição bruta
      console.warn('Refinamento falhou, usando transcrição bruta:', errorData.error);
      return transcript;
    }

    const { refined } = await refineResponse.json();
    return refined || transcript;
  };

  const processSingleUrl = async () => {
    if (!singleUrl.trim()) return;

    setSingleUrlStatus('processing');
    setSingleUrlError(null);
    setSingleUrlResult(null);
    setSingleUrlProgress('Iniciando...');

    try {
      const result = await processUrlItem(singleUrl.trim(), setSingleUrlProgress);
      setSingleUrlResult(result);
      setSingleUrlStatus('done');
      setSingleUrlProgress('');
    } catch (err) {
      setSingleUrlError(err instanceof Error ? err.message : 'Erro desconhecido');
      setSingleUrlStatus('error');
      setSingleUrlProgress('');
    }
  };

  const downloadSingleResult = () => {
    if (!singleUrlResult) return;

    const blob = new Blob([singleUrlResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcricao_${extractNameFromUrl(singleUrl)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ==================== BATCH URLs ====================

  const parseUrls = (text: string): string[] => {
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));
  };

  const urlCount = parseUrls(batchUrls).length;

  const addUrlsToQueue = () => {
    const urls = parseUrls(batchUrls);
    const items: UrlItem[] = urls.map(url => ({
      id: crypto.randomUUID(),
      url,
      title: extractNameFromUrl(url),
      status: 'pending',
    }));
    setUrlItems(prev => [...prev, ...items]);
    setBatchUrls('');
  };

  const updateUrlItemStatus = useCallback((id: string, updates: Partial<UrlItem>) => {
    setUrlItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  }, []);

  const processUrlBatch = async () => {
    setUrlBatchStatus('processing');

    const pendingItems = urlItems.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      try {
        updateUrlItemStatus(item.id, { status: 'extracting' });

        const result = await processUrlItem(item.url, (progress) => {
          // Atualiza status baseado no progresso
          if (progress.includes('Extraindo')) {
            updateUrlItemStatus(item.id, { status: 'extracting' });
          } else if (progress.includes('Transcrevendo')) {
            updateUrlItemStatus(item.id, { status: 'transcribing' });
          } else if (progress.includes('Refinando')) {
            updateUrlItemStatus(item.id, { status: 'refining' });
          }
        });

        updateUrlItemStatus(item.id, { status: 'done', result });

        // Delay entre itens para evitar rate limiting
        await delay(2000);

      } catch (err) {
        updateUrlItemStatus(item.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Erro desconhecido'
        });
      }
    }

    setUrlBatchStatus('done');
  };

  const downloadUrlResults = async () => {
    const zip = new JSZip();
    const completedItems = urlItems.filter(item => item.status === 'done' && item.result);

    completedItems.forEach((item, index) => {
      const filename = `${String(index + 1).padStart(2, '0')}_${item.title.substring(0, 50).replace(/[^a-zA-Z0-9\s]/g, '')}.txt`;
      zip.file(filename, item.result!);
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
  };

  const removeUrlItem = (id: string) => {
    setUrlItems(prev => prev.filter(item => item.id !== id));
  };

  const clearUrlItems = () => {
    setUrlItems([]);
    setUrlBatchStatus('idle');
  };

  // ==================== FILES (existente) ====================

  const updateFileStatus = useCallback((id: string, updates: Partial<BatchFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = '';
  };

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const processFile = useCallback(async (batchFile: BatchFile) => {
    const { id, file } = batchFile;
    const uploadTimeout = file.size > 100 * 1024 * 1024 ? 600000 : 300000;

    try {
      updateFileStatus(id, { status: 'uploading', uploadProgress: 0 });

      let blob;
      let uploadError: Error | null = null;

      for (let uploadAttempt = 1; uploadAttempt <= 3; uploadAttempt++) {
        try {
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

          blob = await withTimeout(uploadPromise, uploadTimeout, `Upload timeout`);
          break;
        } catch (err) {
          uploadError = err instanceof Error ? err : new Error('Erro no upload');
          if (uploadAttempt < 3) {
            updateFileStatus(id, { uploadProgress: 0 });
            await delay(3000);
          }
        }
      }

      if (!blob) {
        throw uploadError || new Error('Falha no upload');
      }

      updateFileStatus(id, { blobUrl: blob.url, status: 'transcribing' });

      let data;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await withTimeout(
            fetch('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioUrl: blob.url }),
            }),
            300000,
            'Transcrição timeout'
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Falha na transcrição');
          }

          data = await response.json();
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error('Erro desconhecido');
          if (attempt < 3) await delay(5000);
        }
      }

      if (!data) {
        throw lastError || new Error('Falha na transcrição');
      }

      // 3. Refinar com Claude
      updateFileStatus(id, { status: 'refining' });

      let refinedTranscript = data.transcript;

      try {
        const refineResponse = await withTimeout(
          fetch('/api/refine', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: data.transcript,
              title: batchFile.fileName,
              date: '',
              guest: '',
            }),
          }),
          120000,
          'Timeout no refinamento'
        );

        if (refineResponse.ok) {
          const refineData = await refineResponse.json();
          refinedTranscript = refineData.refined || data.transcript;
        }
      } catch (refineError) {
        console.warn('Refinamento falhou, usando transcrição bruta:', refineError);
      }

      updateFileStatus(id, {
        status: 'done',
        result: { transcript: refinedTranscript }
      });

      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: blob.url }),
      }).catch(() => {});

    } catch (err) {
      updateFileStatus(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro desconhecido'
      });
    }
  }, [updateFileStatus]);

  const processAllFiles = useCallback(async () => {
    setFileBatchStatus('processing');
    setError(null);

    const pendingFiles = files.filter(f => f.status === 'pending');
    const LARGE_FILE_THRESHOLD = 100 * 1024 * 1024;
    const largeFiles = pendingFiles.filter(f => f.file.size > LARGE_FILE_THRESHOLD);
    const smallFiles = pendingFiles.filter(f => f.file.size <= LARGE_FILE_THRESHOLD);

    for (let i = 0; i < smallFiles.length; i += 2) {
      const batch = smallFiles.slice(i, i + 2);
      await Promise.all(batch.map(processFile));
    }

    for (const file of largeFiles) {
      await processFile(file);
    }

    setFileBatchStatus('done');
  }, [files, processFile]);

  const downloadAllFilesAsZip = useCallback(async () => {
    const zip = new JSZip();
    const completedFiles = files.filter(f => f.status === 'done' && f.result);

    completedFiles.forEach(({ fileName, result }) => {
      zip.file(`${fileName}.txt`, result!.transcript);
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

  const handleFileReset = () => {
    setFiles([]);
    setFileBatchStatus('idle');
    setError(null);
  };

  // Contadores
  const filePendingCount = files.filter(f => f.status === 'pending').length;
  const fileProcessingCount = files.filter(f => ['uploading', 'transcribing', 'refining'].includes(f.status)).length;
  const fileDoneCount = files.filter(f => f.status === 'done').length;
  const fileErrorCount = files.filter(f => f.status === 'error').length;

  const urlPendingCount = urlItems.filter(i => i.status === 'pending').length;
  const urlProcessingCount = urlItems.filter(i => ['extracting', 'transcribing', 'refining'].includes(i.status)).length;
  const urlDoneCount = urlItems.filter(i => i.status === 'done').length;
  const urlErrorCount = urlItems.filter(i => i.status === 'error').length;

  const isFileProcessing = fileBatchStatus === 'processing';
  const isUrlProcessing = urlBatchStatus === 'processing';

  return (
    <main className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-semibold text-white mb-3 tracking-tight">
            Transcritor <span className="text-[#C9A962]">Vídeo</span> → <span className="text-[#C9A962]">Texto</span>
          </h1>
          <p className="text-white/80 text-lg">
            Transcreva vídeos do Vimeo, YouTube ou arquivos locais
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

          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('url')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'url'
                  ? 'border-[#C9A962] text-[#C9A962]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🔗 URL Única
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'batch'
                  ? 'border-[#C9A962] text-[#C9A962]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Múltiplas URLs
            </button>
            <button
              onClick={() => setActiveTab('files')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'files'
                  ? 'border-[#C9A962] text-[#C9A962]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              📁 Arquivos Locais
            </button>
          </div>

          {/* ==================== TAB: URL ÚNICA ==================== */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL do Vídeo
                </label>
                <input
                  type="url"
                  value={singleUrl}
                  onChange={(e) => setSingleUrl(e.target.value)}
                  placeholder="https://gandramartins.adv.br/entrevistas/... ou https://vimeo.com/..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A962] focus:border-transparent"
                  disabled={singleUrlStatus === 'processing'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Suporta: gandramartins.adv.br, vimeo.com, youtube.com
                </p>
              </div>

              {singleUrlStatus === 'processing' && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-700">{singleUrlProgress}</span>
                </div>
              )}

              {singleUrlError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {singleUrlError}
                </div>
              )}

              {singleUrlResult && (
                <div className="space-y-3">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-700 font-medium mb-2">Transcrição concluída!</p>
                    <div className="max-h-64 overflow-y-auto bg-white p-3 rounded border text-sm text-gray-700 whitespace-pre-wrap">
                      {singleUrlResult.substring(0, 2000)}
                      {singleUrlResult.length > 2000 && '...'}
                    </div>
                  </div>
                  <button
                    onClick={downloadSingleResult}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-semibold transition-all"
                  >
                    📥 Baixar Transcrição (.txt)
                  </button>
                </div>
              )}

              <button
                onClick={processSingleUrl}
                disabled={!singleUrl.trim() || singleUrlStatus === 'processing'}
                className="w-full bg-[#C9A962] hover:bg-[#B89A52] disabled:bg-gray-300 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all"
              >
                {singleUrlStatus === 'processing' ? 'Processando...' : '🎯 Transcrever URL'}
              </button>

              {singleUrlStatus === 'done' && (
                <button
                  onClick={() => {
                    setSingleUrl('');
                    setSingleUrlResult(null);
                    setSingleUrlStatus('idle');
                  }}
                  className="w-full px-6 py-3 border-2 border-[#8B2323] rounded-lg font-semibold text-[#5C1515] hover:bg-[#8B2323]/10 transition-all"
                >
                  Nova Transcrição
                </button>
              )}
            </div>
          )}

          {/* ==================== TAB: BATCH URLs ==================== */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cole as URLs (uma por linha)
                </label>
                <textarea
                  value={batchUrls}
                  onChange={(e) => setBatchUrls(e.target.value)}
                  placeholder="https://gandramartins.adv.br/entrevistas/entrevista-1/&#10;https://gandramartins.adv.br/entrevistas/entrevista-2/&#10;https://vimeo.com/123456789"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C9A962] focus:border-transparent font-mono text-sm"
                  disabled={isUrlProcessing}
                />
                {urlCount > 0 && (
                  <p className="text-sm text-[#C9A962] mt-1">
                    {urlCount} URL{urlCount !== 1 ? 's' : ''} detectada{urlCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {urlCount > 0 && urlItems.length === 0 && (
                <button
                  onClick={addUrlsToQueue}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-medium transition-all"
                >
                  ➕ Adicionar à Fila
                </button>
              )}

              {/* Lista de URLs */}
              {urlItems.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Fila ({urlItems.length})</h3>
                    {!isUrlProcessing && (
                      <button onClick={clearUrlItems} className="text-sm text-red-500 hover:text-red-700">
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {urlItems.map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg ${
                          item.status === 'error' ? 'bg-red-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className="w-6 flex-shrink-0">
                          {item.status === 'pending' && <span className="text-gray-400">○</span>}
                          {item.status === 'extracting' && (
                            <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {item.status === 'transcribing' && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {item.status === 'refining' && (
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {item.status === 'done' && <span className="text-green-500">✓</span>}
                          {item.status === 'error' && <span className="text-red-500">✕</span>}
                        </div>

                        <span className="flex-1 truncate text-sm text-gray-700" title={item.url}>
                          {item.title}
                        </span>

                        <div className="flex-shrink-0">
                          {item.status === 'pending' && <span className="text-xs text-gray-400">Aguardando</span>}
                          {item.status === 'extracting' && <span className="text-xs text-orange-500">Extraindo...</span>}
                          {item.status === 'transcribing' && <span className="text-xs text-blue-500">Transcrevendo...</span>}
                          {item.status === 'refining' && <span className="text-xs text-purple-500">Refinando...</span>}
                          {item.status === 'done' && <span className="text-xs text-green-500">Concluído</span>}
                          {item.status === 'error' && <span className="text-xs text-red-500" title={item.error}>Erro</span>}
                        </div>

                        {!isUrlProcessing && item.status !== 'extracting' && item.status !== 'transcribing' && item.status !== 'refining' && (
                          <button
                            onClick={() => removeUrlItem(item.id)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Resumo */}
                  {(isUrlProcessing || urlBatchStatus === 'done') && (
                    <div className="flex gap-4 text-xs">
                      {urlProcessingCount > 0 && <span className="text-blue-500">Processando: {urlProcessingCount}</span>}
                      {urlDoneCount > 0 && <span className="text-green-500">Concluídos: {urlDoneCount}</span>}
                      {urlErrorCount > 0 && <span className="text-red-500">Erros: {urlErrorCount}</span>}
                      {urlPendingCount > 0 && isUrlProcessing && <span className="text-gray-400">Na fila: {urlPendingCount}</span>}
                    </div>
                  )}
                </div>
              )}

              {/* Botões de Ação */}
              {urlItems.length > 0 && urlPendingCount > 0 && !isUrlProcessing && (
                <button
                  onClick={processUrlBatch}
                  className="w-full bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all"
                >
                  🎯 Processar {urlPendingCount} URL{urlPendingCount !== 1 ? 's' : ''}
                </button>
              )}

              {isUrlProcessing && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="w-6 h-6 border-3 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Processando URLs...</span>
                </div>
              )}

              {urlBatchStatus === 'done' && urlDoneCount > 0 && (
                <button
                  onClick={downloadUrlResults}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all"
                >
                  📦 Baixar Transcrições (ZIP)
                </button>
              )}
            </div>
          )}

          {/* ==================== TAB: ARQUIVOS ==================== */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              {/* Área de Upload */}
              <div>
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
                    disabled={isFileProcessing}
                  />
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-gray-700 font-medium">
                    Arraste seus vídeos ou áudios aqui
                  </p>
                  <p className="text-gray-500 text-sm">
                    MP4, MOV, AVI, WEBM, MP3, WAV, M4A (até 500MB cada)
                  </p>
                </div>
              </div>

              {/* Lista de Arquivos */}
              {files.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-700">Arquivos ({files.length})</h3>
                    {!isFileProcessing && (
                      <button onClick={handleFileReset} className="text-sm text-red-500 hover:text-red-700">
                        Limpar
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
                        <div className="w-6 flex-shrink-0">
                          {file.status === 'pending' && <span className="text-gray-400">○</span>}
                          {file.status === 'uploading' && (
                            <div className="w-4 h-4 border-2 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                          )}
                          {file.status === 'transcribing' && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {file.status === 'refining' && (
                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                          )}
                          {file.status === 'done' && <span className="text-green-500">✓</span>}
                          {file.status === 'error' && <span className="text-red-500">✕</span>}
                        </div>

                        <span className="flex-1 truncate text-sm text-gray-700" title={file.fileName}>
                          {file.fileName}
                        </span>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {file.status === 'pending' && <span className="text-xs text-gray-400">Aguardando</span>}
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
                          {file.status === 'transcribing' && <span className="text-xs text-blue-500">Transcrevendo...</span>}
                          {file.status === 'refining' && <span className="text-xs text-purple-500">Refinando com IA...</span>}
                          {file.status === 'done' && <span className="text-xs text-green-500">Concluído</span>}
                          {file.status === 'error' && <span className="text-xs text-red-500" title={file.error}>Erro</span>}
                        </div>

                        {!isFileProcessing && !['uploading', 'transcribing', 'refining'].includes(file.status) && (
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
                  {(isFileProcessing || fileBatchStatus === 'done') && (
                    <div className="flex gap-4 text-xs">
                      {fileProcessingCount > 0 && <span className="text-blue-500">Processando: {fileProcessingCount}</span>}
                      {fileDoneCount > 0 && <span className="text-green-500">Concluídos: {fileDoneCount}</span>}
                      {fileErrorCount > 0 && <span className="text-red-500">Erros: {fileErrorCount}</span>}
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
                  {error}
                </div>
              )}

              {/* Botões de Ação */}
              {filePendingCount > 0 && !isFileProcessing && (
                <button
                  onClick={processAllFiles}
                  className="w-full bg-[#C9A962] hover:bg-[#B89A52] text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all"
                >
                  🎯 Transcrever {filePendingCount} arquivo{filePendingCount !== 1 ? 's' : ''}
                </button>
              )}

              {isFileProcessing && (
                <div className="flex items-center justify-center gap-3 py-4">
                  <div className="w-6 h-6 border-3 border-[#C9A962] border-t-transparent rounded-full animate-spin" />
                  <span className="text-gray-600">Processando arquivos...</span>
                </div>
              )}

              {fileBatchStatus === 'done' && fileDoneCount > 0 && (
                <button
                  onClick={downloadAllFilesAsZip}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-semibold text-lg transition-all"
                >
                  📦 Baixar Transcrições (ZIP)
                </button>
              )}
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
