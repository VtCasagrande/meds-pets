'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { User } from '@/app/lib/types';

export default function AdminPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/users');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao carregar usuários');
        }
        
        const data = await response.json();
        setUsers(data.users);
      } catch (err: any) {
        console.error('Erro ao carregar usuários:', err);
        setError(err.message || 'Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  if (!session || session.user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="mb-6">Esta página é restrita para administradores.</p>
        <Link href="/" className="btn-primary">
          Voltar para a Página Inicial
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Painel de Administração</h1>
        <Link href="/admin/stats" className="btn-secondary">
          Estatísticas
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gerenciar Usuários</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="mt-2 text-dark-light">Carregando usuários...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-4">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-dark">
              <thead className="bg-neutral">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-light uppercase tracking-wider">Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-light uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-light uppercase tracking-wider">Função</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-light uppercase tracking-wider">Data de Criação</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-dark-light uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-dark">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-dark">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id || user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-dark">{user.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-dark-light">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-light">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-primary-dark mr-3">
                          Editar
                        </button>
                        <button 
                          className="text-red-600 hover:text-red-900"
                          disabled={user.role === 'admin'}
                        >
                          {user.role === 'admin' ? 'Protegido' : 'Remover'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Configurações do Sistema</h2>
        <div className="space-y-4">
          <div className="p-4 border border-neutral-dark rounded-lg">
            <h3 className="font-medium text-dark">Status do Agendador</h3>
            <p className="text-sm text-dark-light mt-1">Gerencie o serviço de agendamento de notificações</p>
            <div className="mt-3">
              <Link href="/scheduler" className="text-primary hover:underline text-sm">
                Ir para o Painel do Agendador →
              </Link>
            </div>
          </div>
          
          <div className="p-4 border border-neutral-dark rounded-lg">
            <h3 className="font-medium text-dark">Logs do Sistema</h3>
            <p className="text-sm text-dark-light mt-1">Visualize os logs de webhooks e operações do sistema</p>
            <div className="mt-3 space-y-2">
              <div>
                <Link href="/webhook-logs" className="text-primary hover:underline text-sm">
                  Ver Logs de Webhook →
                </Link>
              </div>
              <div>
                <Link href="/audit-logs" className="text-primary hover:underline text-sm">
                  Ver Logs de Auditoria →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 