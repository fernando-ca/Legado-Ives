import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Conversor PDF para EPUB - Legado Ives',
  description: 'Converta seus PDFs para EPUB de forma simples e rápida',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
