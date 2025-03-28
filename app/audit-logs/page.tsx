'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Interface para os logs de auditoria
interface AuditLog {
  _id: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  details?: any;
  performedBy?: string;
  performedByEmail?: string;
  createdAt: string;
  ipAddress?: string;
  userAgent?: string;
}

// Interface para a resposta paginada
interface LogsResponse {
  logs: AuditLog[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 25,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [entity, setEntity] = useState<string>(searchParams.get('entity') || '');
  const [action, setAction] = useState<string>(searchParams.get('action') || '');
  const [email, setEmail] = useState<string>(searchParams.get('email') || '');
  const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');
  
  // Obter a página atual dos parâmetros de consulta
  const pageParam = searchParams.get('page');
  const currentPage = pageParam ? parseInt(pageParam) : 1;
  
  // Efeito para verificar permissões
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      const userRole = (session.user as any)?.role;
      if (userRole !== 'admin' && userRole !== 'creator') {
        router.push('/');
      }
    }
  }, [status, session, router]);
  
  // Efeito para carregar os logs
  useEffect(() => {
    if (status !== 'authenticated') return;
    
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Construir a URL com os parâmetros de consulta
        const queryParams = new URLSearchParams();
        queryParams.set('page', currentPage.toString());
        if (entity) queryParams.set('entity', entity);
        if (action) queryParams.set('action', action);
        if (email) queryParams.set('email', email);
        if (startDate) queryParams.set('startDate', startDate);
        if (endDate) queryParams.set('endDate', endDate);
        
        const response = await fetch(`/api/audit-logs?${queryParams.toString()}`);
        
        if (!response.ok) {
          throw new Error(`Erro ao buscar logs: ${response.status}`);
        }
        
        const data: LogsResponse = await response.json();
        setLogs(data.logs);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        console.error('Erro ao buscar logs de auditoria:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLogs();
  }, [currentPage, entity, action, email, startDate, endDate, status]);
  
  // Função para navegar para uma página específica
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`/audit-logs?${params.toString()}`);
  };
  
  // Função para aplicar filtros
  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    
    const params = new URLSearchParams();
    params.set('page', '1'); // Voltar para a primeira página ao aplicar filtros
    if (entity) params.set('entity', entity);
    if (action) params.set('action', action);
    if (email) params.set('email', email);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    
    router.push(`/audit-logs?${params.toString()}`);
  };
  
  // Função para limpar filtros
  const clearFilters = () => {
    setEntity('');
    setAction('');
    setEmail('');
    setStartDate('');
    setEndDate('');
    router.push('/audit-logs');
  };
  
  // Função para formatar data
  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    } catch {
      return dateString;
    }
  };
  
  // Exibir mensagem de carregamento
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Traduzir ação e entidade para português
  const translateAction = (action: string) => {
    const translations: Record<string, string> = {
      'create': 'Criação',
      'update': 'Atualização',
      'delete': 'Exclusão',
      'login': 'Login',
      'logout': 'Logout',
      'register': 'Registro',
      'other': 'Outro'
    };
    return translations[action] || action;
  };
  
  const translateEntity = (entity: string) => {
    const translations: Record<string, string> = {
      'reminder': 'Lembrete',
      'user': 'Usuário',
      'webhook': 'Webhook',
      'webhook_log': 'Log de Webhook',
      'scheduler': 'Agendador',
      'audit_log': 'Log de Auditoria',
      'system': 'Sistema',
      'other': 'Outro'
    };
    return translations[entity] || entity;
  };
  
  // Determinar a classe de cor com base na ação
  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
      case 'logout':
        return 'bg-purple-100 text-purple-800';
      case 'register':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="container mx-auto p-4 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Logs de Auditoria</h1>
        <div className="flex gap-2">
          <Link href="/" className="btn-outline">
            Voltar
          </Link>
        </div>
      </div>
      
      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filtros</h2>
        
        <form onSubmit={applyFilters} className="space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entidade</label>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Todas</option>
                <option value="reminder">Lembrete</option>
                <option value="user">Usuário</option>
                <option value="webhook">Webhook</option>
                <option value="webhook_log">Log de Webhook</option>
                <option value="scheduler">Agendador</option>
                <option value="audit_log">Log de Auditoria</option>
                <option value="system">Sistema</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ação</label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              >
                <option value="">Todas</option>
                <option value="create">Criação</option>
                <option value="update">Atualização</option>
                <option value="delete">Exclusão</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="register">Registro</option>
                <option value="other">Outro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail do Usuário</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Filtrar por e-mail"
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
                <span className="self-center">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Limpar Filtros
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Aplicar Filtros
            </button>
          </div>
        </form>
      </div>
      
      {/* Exibir mensagem de erro se houver */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Exibir contagem de resultados */}
      <div className="mb-4 text-gray-600">
        {pagination.total} {pagination.total === 1 ? 'registro encontrado' : 'registros encontrados'}
      </div>
      
      {/* Tabela de logs */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.performedByEmail || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {translateEntity(log.entity)}
                      {log.entityId && (
                        <span className="text-xs text-gray-500 block">ID: {log.entityId.substring(0, 8)}...</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.description}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Paginação */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-700">
            Página {pagination.page} de {pagination.totalPages}
          </div>
          <div className="flex gap-2">
            {pagination.hasPrevPage && (
              <button
                onClick={() => goToPage(pagination.page - 1)}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Anterior
              </button>
            )}
            {pagination.hasNextPage && (
              <button
                onClick={() => goToPage(pagination.page + 1)}
                className="px-3 py-1 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Próxima
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 