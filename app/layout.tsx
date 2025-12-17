import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import './globals.css'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://memereceipts.com'),
  title: 'Meme Receipts',
  description: 'Watch Solana meme coin trades print as receipts in real-time',
  openGraph: {
    title: 'Meme Receipts',
    description: 'Watch Solana meme coin trades print as receipts in real-time',
    images: [
      {
        url: '/link-preview.png',
        width: 1200,
        height: 630,
        alt: 'Meme Receipts - Solana Token Receipt Printer',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Meme Receipts',
    description: 'Watch Solana meme coin trades print as receipts in real-time',
    images: ['/link-preview.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${spaceMono.variable} antialiased`}>{children}</body>
    </html>
  )
}
