'use client';

import React, { useState, useEffect, Suspense } from 'react';
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

// Componente de carregamento
function LoadingState() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
  );
}

// Componente principal envolvido por Suspense
function AuditLogsContent() {
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
    return <LoadingState />;
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
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email do Usuário</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Filtrar por email"
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Inicial</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data Final</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
            
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Limpar Filtros
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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error && (
          <div className="p-4 bg-red-100 text-red-700 border-l-4 border-red-500 mb-4">
            {error}
          </div>
        )}
        
        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nenhum log encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entidade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs ${getActionColor(log.action)}`}>
                        {translateAction(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {translateEntity(log.entity)}
                      {log.entityId && (
                        <span className="text-xs text-gray-400 block">ID: {log.entityId}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {log.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.performedByEmail || 'Sistema'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.ipAddress || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Paginação */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={!pagination.hasPrevPage}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.hasPrevPage ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Anterior
              </button>
              <button
                onClick={() => goToPage(pagination.page + 1)}
                disabled={!pagination.hasNextPage}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  pagination.hasNextPage ? 'bg-white text-gray-700 hover:bg-gray-50' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Próxima
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{logs.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> a <span className="font-medium">{(pagination.page - 1) * pagination.limit + logs.length}</span> de <span className="font-medium">{pagination.total}</span> resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginação">
                  <button
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.hasPrevPage ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="sr-only">Anterior</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Números de página */}
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    // Calcular os números de página a exibir
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = pagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pagination.page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                      pagination.hasNextPage ? 'text-gray-500 hover:bg-gray-50' : 'text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    <span className="sr-only">Próxima</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Componente principal
export default function AuditLogsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuditLogsContent />
    </Suspense>
  );
} 