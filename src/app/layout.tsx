import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'WA Manager',
  description: 'WhatsApp Business Manager',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-white text-black min-h-screen">
        {children}
      </body>
    </html>
  )
}
