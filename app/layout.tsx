import type { Metadata } from 'next'
import { Space_Mono } from 'next/font/google'
import './globals.css'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-space-mono',
})

export const metadata: Metadata = {
  title: 'Meme Receipts | {token}',
  description: 'Interactive trading interface for Solana token: {token}',
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
