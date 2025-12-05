// src/app/api/upload/route.ts
// API para upload de arquivos para Vercel Blob

import { put, del } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    const blob = await put(file.name, file, {
      access: 'public',
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Falha no upload' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { url } = await request.json();
    await del(url);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar:', error);
    return NextResponse.json(
      { error: 'Falha ao deletar arquivo' },
      { status: 500 }
    );
  }
}
