'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  useEffect(() => {
    const error = searchParams.get('error');
    
    if (error) {
      switch (error) {
        case 'CredentialsSignin':
          setErrorMessage('Falha na autenticação. Email ou senha inválidos.');
          break;
        case 'SessionRequired':
          setErrorMessage('Você precisa estar logado para acessar esta página.');
          break;
        case 'AccessDenied':
          setErrorMessage('Você não tem permissão para acessar esta página.');
          break;
        default:
          setErrorMessage('Ocorreu um erro durante a autenticação.');
      }
    } else {
      setErrorMessage('Ocorreu um erro durante a autenticação.');
    }
  }, [searchParams]);
  
  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Erro de Autenticação</h1>
      
      <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
        {errorMessage}
      </div>
      
      <div className="flex justify-center space-x-4">
        <Link href="/auth/login" className="btn-primary">
          Voltar para o Login
        </Link>
        <Link href="/" className="btn-outline">
          Página Inicial
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center mb-6">Erro de Autenticação</h1>
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-6">
          Carregando detalhes do erro...
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
} 