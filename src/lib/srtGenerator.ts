// src/lib/srtGenerator.ts
// Gerador de arquivos SRT (legendas) a partir de transcrição

interface Word {
  word: string;
  start: number;
  end: number;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

export function generateSRT(words: Word[], wordsPerLine: number = 8): string {
  if (words.length === 0) return '';

  const lines: string[] = [];
  let lineNum = 1;

  for (let i = 0; i < words.length; i += wordsPerLine) {
    const chunk = words.slice(i, i + wordsPerLine);
    if (chunk.length === 0) continue;

    const startTime = formatTime(chunk[0].start);
    const endTime = formatTime(chunk[chunk.length - 1].end);
    const text = chunk.map(w => w.word).join(' ');

    lines.push(`${lineNum}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(text);
    lines.push('');
    lineNum++;
  }

  return lines.join('\n');
}
