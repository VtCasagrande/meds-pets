import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from './components/Navbar'
import './lib/init'
import { AuthProvider } from './providers/AuthProvider'

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
        <AuthProvider>
          <div className="min-h-screen flex flex-col bg-neutral">
            <Navbar />
            <main className="container mx-auto py-8 px-4 md:px-6 flex-grow">
              {children}
            </main>
            <footer className="border-t border-neutral-dark py-6">
              <div className="container mx-auto px-4 md:px-6 text-center text-dark-light text-sm">
                <p>&copy; {new Date().getFullYear()} Sistema de Lembretes de Medicamentos para Pets</p>
                <p className="mt-1 text-xs">Cuidando com carinho da saúde dos seus companheiros</p>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
} 