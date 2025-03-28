import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import './lib/init'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lembrete de Medicamentos para Pets',
  description: 'Sistema de controle e lembretes de medicamentos para tutores de pets',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="container mx-auto py-6 px-6 flex-grow">
            {children}
          </main>
          <footer className="bg-gray-100 py-4">
            <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} Sistema de Lembretes de Medicamentos
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
} 