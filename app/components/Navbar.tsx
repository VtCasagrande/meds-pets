'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : '';
  };
  
  return (
    <nav className="bg-blue-600 text-white shadow-md w-full">
      <div className="container mx-auto py-3 px-6">
        <div className="flex justify-between items-center">
          {/* Logo e nome */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-xl font-bold">🐾</span>
            </div>
            <span className="text-xl font-bold">MedsPets</span>
          </Link>
          
          {/* Links de navegação */}
          <div className="flex space-x-1">
            <Link 
              href="/" 
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/')}`}
            >
              Início
            </Link>
            <Link 
              href="/reminders" 
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/reminders')}`}
            >
              Lembretes
            </Link>
            <Link 
              href="/reminders/new" 
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/reminders/new')}`}
            >
              Novo Lembrete
            </Link>
            <Link 
              href="/webhook" 
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/webhook')}`}
            >
              Webhooks
            </Link>
            <Link 
              href="/webhook-logs" 
              className={`px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 ${isActive('/webhook-logs')}`}
            >
              Logs
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 