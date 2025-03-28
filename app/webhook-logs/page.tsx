'use client'

import React, { useState, useEffect, Fragment } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para os logs
interface WebhookLog {
  _id: string;
  reminderId: string;
  eventType: string;
  eventDescription: string;
  payload: object;
  statusCode: number;
  response: string;
  success: boolean;
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface WebhookLogsResponse {
  logs: WebhookLog[];
  pagination: Pagination;
}

export default function WebhookLogsPage() {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    reminderId: '',
    eventType: '',
    success: '',
    startDate: '',
    endDate: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Construir URL com parâmetros de filtro
      let url = `/api/webhook-logs?page=${page}`;
      
      if (filters.reminderId) {
        url += `&reminderId=${filters.reminderId}`;
      }
      
      if (filters.eventType) {
        url += `&eventType=${filters.eventType}`;
      }
      
      if (filters.success) {
        url += `&success=${filters.success}`;
      }
      
      if (filters.startDate) {
        url += `&startDate=${filters.startDate}`;
      }
      
      if (filters.endDate) {
        url += `&endDate=${filters.endDate}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar logs: ${response.status}`);
      }
      
      const data: WebhookLogsResponse = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      console.error('Erro ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Resetar para primeira página
    fetchLogs();
  };

  const toggleExpand = (logId: string) => {
    if (expandedLog === logId) {
      setExpandedLog(null);
    } else {
      setExpandedLog(logId);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  // Mapear tipos de evento para tradução em português
  const eventTypeLabels: { [key: string]: string } = {
    'reminder_created': 'Lembrete criado',
    'reminder_updated': 'Lembrete atualizado',
    'reminder_notification': 'Notificação enviada',
    'reminder_finished': 'Lembrete finalizado',
    'reminder_deactivated': 'Lembrete desativado',
    'reminder_activated': 'Lembrete reativado',
    'reminder_deleted': 'Lembrete excluído'
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Logs de Webhook</h1>
      
      <form onSubmit={handleFilterSubmit} className="mb-6 bg-gray-50 p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">ID do Lembrete</label>
            <input
              type="text"
              name="reminderId"
              value={filters.reminderId}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
              placeholder="ID do lembrete"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Tipo de Evento</label>
            <select
              name="eventType"
              value={filters.eventType}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Todos os eventos</option>
              <option value="reminder_created">Lembrete criado</option>
              <option value="reminder_updated">Lembrete atualizado</option>
              <option value="reminder_notification">Notificação enviada</option>
              <option value="reminder_finished">Lembrete finalizado</option>
              <option value="reminder_deactivated">Lembrete desativado</option>
              <option value="reminder_activated">Lembrete reativado</option>
              <option value="reminder_deleted">Lembrete excluído</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="success"
              value={filters.success}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Todos</option>
              <option value="true">Sucesso</option>
              <option value="false">Erro</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Data Início</label>
            <input
              type="datetime-local"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Data Fim</label>
            <input
              type="datetime-local"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Filtrar'}
            </button>
          </div>
        </div>
      </form>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2">Carregando logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhum log encontrado</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Data/Hora</th>
                  <th className="py-2 px-4 border-b text-left">Tipo de Evento</th>
                  <th className="py-2 px-4 border-b text-left">Descrição</th>
                  <th className="py-2 px-4 border-b text-left">ID do Lembrete</th>
                  <th className="py-2 px-4 border-b text-center">Status</th>
                  <th className="py-2 px-4 border-b text-center">Código</th>
                  <th className="py-2 px-4 border-b text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <Fragment key={log._id}>
                    <tr className={`border-b hover:bg-gray-50 ${log.success ? '' : 'bg-red-50'}`}>
                      <td className="py-2 px-4">{formatDate(log.createdAt)}</td>
                      <td className="py-2 px-4">{eventTypeLabels[log.eventType] || log.eventType}</td>
                      <td className="py-2 px-4">{log.eventDescription}</td>
                      <td className="py-2 px-4">
                        <span className="text-xs font-mono text-gray-600">{log.reminderId}</span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        {log.success ? (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Sucesso</span>
                        ) : (
                          <span className="inline-block px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Erro</span>
                        )}
                      </td>
                      <td className="py-2 px-4 text-center">
                        <span className={`font-mono ${log.statusCode >= 200 && log.statusCode < 300 ? 'text-green-600' : 'text-red-600'}`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-center">
                        <button
                          onClick={() => toggleExpand(log._id)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          {expandedLog === log._id ? 'Fechar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>
                    {expandedLog === log._id && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-gray-50">
                          <div className="mb-4">
                            <h3 className="font-bold mb-2">Payload</h3>
                            <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-xs">
                              {JSON.stringify(log.payload, null, 2)}
                            </pre>
                          </div>
                          {log.response && (
                            <div>
                              <h3 className="font-bold mb-2">Resposta</h3>
                              <pre className="bg-gray-100 p-3 rounded overflow-x-auto text-xs">
                                {log.response}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
          
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <nav className="inline-flex rounded shadow">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrevPage}
                  className={`px-4 py-2 border ${!pagination.hasPrevPage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                >
                  Anterior
                </button>
                <div className="px-4 py-2 border-t border-b bg-blue-500 text-white">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNextPage}
                  className={`px-4 py-2 border ${!pagination.hasNextPage ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-blue-500 hover:bg-blue-50'}`}
                >
                  Próxima
                </button>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
} 