'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function PermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário tem permissão para acessar esta página
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // Verificar se o usuário é admin ou creator
      const userRole = (session?.user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'creator') {
        router.push('/');
      } else {
        setIsLoading(false);
      }
    }
  }, [session, status, router]);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Gerenciamento de Permissões</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Níveis de Acesso</h2>
        <p className="mb-4">O sistema possui 3 níveis de acesso:</p>
        
        <ul className="list-disc pl-6 mb-6">
          <li className="mb-2"><span className="font-semibold">Usuário:</span> Pode criar e gerenciar apenas seus próprios lembretes</li>
          <li className="mb-2"><span className="font-semibold">Administrador:</span> Pode gerenciar todos os lembretes e visualizar logs</li>
          <li className="mb-2"><span className="font-semibold">Criador:</span> Tem acesso total ao sistema, incluindo gerenciamento de usuários</li>
        </ul>
        
        <Link href="/audit-logs" className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Ver Logs de Auditoria
        </Link>
      </div>
      
      {/* Seção para usuários criadores apenas */}
      {(session?.user as any)?.role === 'creator' && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Gerenciamento de Usuários</h2>
          <p className="mb-4">Como criador do sistema, você pode gerenciar usuários e suas permissões.</p>
          <Link href="/users" className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            Gerenciar Usuários
          </Link>
        </div>
      )}
    </div>
  );
} 