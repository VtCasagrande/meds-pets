'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ScheduledTask {
  id: string;
  reminderId: string;
  medicationIndex: number;
  scheduledTime: string;
  webhookUrl?: string;
}

interface SchedulerStatus {
  success: boolean;
  message: string;
  stats: {
    totalTasks: number;
    pendingTasks: number;
    uniqueReminders: number;
  };
  nextTask: {
    id: string;
    reminderId: string;
    scheduledTime: string;
    timeUntilMs: number;
    timeUntilSeconds: number;
  } | null;
  tasks: ScheduledTask[];
}

export default function SchedulerStatusPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Função para formatar tempo restante
  const formatTimeRemaining = (ms: number) => {
    if (ms <= 0) return 'Agora';
    
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds} segundos`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutos`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h e ${minutes % 60}m`;
    
    const days = Math.floor(hours / 24);
    return `${days} dias e ${hours % 24}h`;
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Carregar status do agendador
  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/scheduler/status');
      
      if (!response.ok) {
        throw new Error(`Erro ao carregar status: ${response.status}`);
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Erro ao carregar status do agendador:', err);
      setError('Não foi possível carregar o status do agendador');
    } finally {
      setLoading(false);
    }
  };

  // Iniciar o agendador
  const startScheduler = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      setError(null);
      
      const response = await fetch('/api/scheduler/start', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao iniciar agendador: ${response.status}`);
      }
      
      const data = await response.json();
      setActionSuccess('Agendador iniciado com sucesso!');
      
      // Recarregar status após iniciar
      await loadStatus();
    } catch (err) {
      console.error('Erro ao iniciar agendador:', err);
      setError('Não foi possível iniciar o agendador');
    } finally {
      setActionLoading(false);
    }
  };

  // Reagendar todas as notificações
  const rescheduleAll = async () => {
    try {
      setActionLoading(true);
      setActionSuccess(null);
      setError(null);
      
      const response = await fetch('/api/reminders/update-webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          force: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`Erro ao reagendar notificações: ${response.status}`);
      }
      
      const data = await response.json();
      setActionSuccess('Todas as notificações foram reagendadas com sucesso!');
      
      // Recarregar status após reagendar
      await loadStatus();
    } catch (err) {
      console.error('Erro ao reagendar notificações:', err);
      setError('Não foi possível reagendar as notificações');
    } finally {
      setActionLoading(false);
    }
  };

  // Carregar status ao montar o componente
  useEffect(() => {
    loadStatus();
    
    // Configurar atualização automática a cada 30 segundos
    const interval = setInterval(() => {
      loadStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Status do Agendador</h1>
          <p className="text-gray-600">Monitoramento e controle do agendador de notificações</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={loadStatus}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <button 
            onClick={startScheduler}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            disabled={actionLoading}
          >
            {actionLoading ? 'Executando...' : 'Iniciar Agendador'}
          </button>
          <button 
            onClick={rescheduleAll}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            disabled={actionLoading}
          >
            {actionLoading ? 'Executando...' : 'Reagendar Tudo'}
          </button>
        </div>
      </div>
      
      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
          {actionSuccess}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Carregando status...</p>
        </div>
      ) : status ? (
        <div className="space-y-6">
          {/* Status geral */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Status do Sistema</h2>
            <div className="flex items-center mb-4">
              <div className={`w-4 h-4 rounded-full mr-2 ${status.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={status.success ? 'text-green-700' : 'text-red-700'}>
                {status.success ? 'Agendador ativo' : 'Agendador inativo'}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded border">
                <div className="text-3xl font-bold text-blue-600">{status.stats.totalTasks}</div>
                <div className="text-sm text-gray-500">Total de tarefas</div>
              </div>
              <div className="bg-gray-50 p-4 rounded border">
                <div className="text-3xl font-bold text-green-600">{status.stats.pendingTasks}</div>
                <div className="text-sm text-gray-500">Tarefas pendentes</div>
              </div>
              <div className="bg-gray-50 p-4 rounded border">
                <div className="text-3xl font-bold text-purple-600">{status.stats.uniqueReminders}</div>
                <div className="text-sm text-gray-500">Lembretes únicos</div>
              </div>
            </div>
          </div>
          
          {/* Próxima tarefa */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Próxima Notificação</h2>
            {status.nextTask ? (
              <div className="bg-blue-50 p-4 rounded border border-blue-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-medium">ID da Tarefa: {status.nextTask.id}</h3>
                    <Link href={`/reminders/${status.nextTask.reminderId}`} className="text-blue-600 hover:underline">
                      Ver Lembrete
                    </Link>
                  </div>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                    Em {formatTimeRemaining(status.nextTask.timeUntilMs)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Agendada para: {formatDate(status.nextTask.scheduledTime)}
                </p>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma notificação agendada</p>
            )}
          </div>
          
          {/* Lista de tarefas */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Notificações Agendadas</h2>
            {status.tasks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lembrete
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tempo Restante
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicamento
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {status.tasks.map(task => {
                      const scheduledDate = new Date(task.scheduledTime);
                      const now = new Date();
                      const timeUntil = scheduledDate.getTime() - now.getTime();
                      
                      return (
                        <tr key={task.id} className={timeUntil < 0 ? 'bg-gray-100' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {task.id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/reminders/${task.reminderId}`} className="text-blue-600 hover:underline">
                              {task.reminderId.substring(0, 8)}...
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(task.scheduledTime)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {timeUntil > 0 ? (
                              <span className="text-green-600">
                                {formatTimeRemaining(timeUntil)}
                              </span>
                            ) : (
                              <span className="text-red-600">
                                Atrasado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            #{task.medicationIndex + 1}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">Nenhuma notificação agendada</p>
            )}
          </div>
          
          <div className="text-sm text-gray-500 text-right">
            Última atualização: {new Date().toLocaleString('pt-BR')} - Atualização automática a cada 30 segundos
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-lg text-red-600">Não foi possível carregar o status do agendador</p>
          <p className="mt-2 text-gray-600">Verifique se o servidor está funcionando corretamente.</p>
          <button 
            onClick={loadStatus} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
} 