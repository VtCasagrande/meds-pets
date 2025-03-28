'use client';

import { useState, useRef, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const userRole = (session?.user as any)?.role || null;
  
  // Fechar o menu quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Fechar o menu ao pressionar a tecla Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);
  
  // Se não estiver autenticado, mostrar links de login/registro
  if (status !== 'authenticated') {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/auth/login"
          className="text-gray-700 hover:text-blue-600 transition-colors"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Registrar
        </Link>
      </div>
    );
  }
  
  // Se estiver autenticado, mostrar menu do usuário
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 font-semibold">
          {session.user?.name?.charAt(0) || 'U'}
        </div>
        <span>{session.user?.name || 'Usuário'}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-10">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="font-medium">{session.user?.name}</p>
            <p className="text-sm text-gray-500">{session.user?.email}</p>
            {userRole && (
              <p className={`text-xs mt-1 py-0.5 px-2 rounded-full inline-block ${
                userRole === 'creator' ? 'bg-purple-100 text-purple-800' : 
                userRole === 'admin' ? 'bg-red-100 text-red-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {userRole === 'creator' ? 'Criador' : 
                 userRole === 'admin' ? 'Administrador' : 
                 'Usuário'}
              </p>
            )}
          </div>
          
          <nav className="mt-2">
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Meu Perfil
            </Link>
            
            <Link
              href="/permissions"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Permissões
            </Link>
            
            {(userRole === 'admin' || userRole === 'creator') && (
              <>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Administração
                </Link>
                <Link
                  href="/audit-logs"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Logs de Auditoria
                </Link>
              </>
            )}
            
            {userRole === 'creator' && (
              <>
                <Link
                  href="/webhook-logs"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Logs de Webhook
                </Link>
                <Link
                  href="/scheduler"
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  Agendador
                </Link>
              </>
            )}
            
            <Link
              href="/reminders"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              Meus Lembretes
            </Link>
            
            <div className="border-t border-gray-100 my-2"></div>
            
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              Sair
            </button>
          </nav>
        </div>
      )}
    </div>
  );
} 