'use client';

import { useState, useEffect } from 'react';
import { Reminder } from '@/app/lib/types';
import Link from 'next/link';

export default function WebhookConfigPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    fetchReminders();
    // Carregar configurações existentes
    const savedUrl = localStorage.getItem('webhookUrl') || '';
    const savedSecret = localStorage.getItem('webhookSecret') || '';
    setWebhookUrl(savedUrl);
    setWebhookSecret(savedSecret);
  }, []);
  
  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reminders');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar lembretes');
      }
      
      const data = await response.json();
      
      // Garantir que todos os lembretes tenham o campo id preenchido
      const activeReminders = data.activeReminders.map((reminder: any) => ({
        ...reminder,
        id: reminder._id || reminder.id
      }));
      
      setReminders(activeReminders);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
      setError('Não foi possível carregar os lembretes ativos.');
    } finally {
      setLoading(false);
    }
  };
  
  const saveWebhookConfig = () => {
    setIsSaving(true);
    
    try {
      localStorage.setItem('webhookUrl', webhookUrl);
      localStorage.setItem('webhookSecret', webhookSecret);
      setSaveSuccess(true);
      
      // Atualizar todos os lembretes com a nova configuração de webhook
      updateRemindersWithWebhook();
      
      // Limpar mensagem de sucesso após alguns segundos
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError('Não foi possível salvar as configurações.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Atualizar todos os lembretes ativos com a configuração de webhook
  const updateRemindersWithWebhook = async () => {
    if (!webhookUrl) {
      console.log('URL de webhook não configurada, ignorando atualização de lembretes');
      return;
    }
    
    try {
      for (const reminder of reminders) {
        console.log(`Atualizando lembrete ${reminder.id} com webhook...`);
        
        // Construir body com a configuração de webhook
        const body = {
          ...reminder,
          webhookUrl,
          webhookSecret
        };
        
        // Atualizar lembrete via API
        const response = await fetch(`/api/reminders/${reminder.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          console.error(`Erro ao atualizar lembrete ${reminder.id}:`, await response.text());
        } else {
          console.log(`Lembrete ${reminder.id} atualizado com webhook.`);
        }
      }
    } catch (error) {
      console.error('Erro ao atualizar lembretes com webhook:', error);
    }
  };
  
  // Testar webhook enviando uma notificação de teste
  const testWebhook = async () => {
    if (!webhookUrl) {
      setError('Configure uma URL de webhook antes de testar.');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Enviar uma solicitação para o endpoint de teste de webhook
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          webhookUrl,
          webhookSecret
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao testar webhook: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Resultado do teste de webhook:', result);
      
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(result.message || 'Teste de webhook falhou');
      }
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      setError(error instanceof Error ? error.message : 'Erro ao testar webhook. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Testar configuração de webhook com um lembrete específico
  const testReminderWebhook = async () => {
    if (!webhookUrl) {
      setError('Configure uma URL de webhook antes de testar.');
      return;
    }
    
    if (reminders.length === 0) {
      setError('Não há lembretes ativos para testar o webhook.');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Usar o primeiro lembrete para o teste
      const testReminder = reminders[0];
      const medicationIndex = 0;
      
      // Enviar uma solicitação de webhook de teste usando o lembrete
      const response = await fetch(`/api/reminders/${testReminder.id}/force-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medicationIndex,
          webhookUrl,
          webhookSecret
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao testar notificação: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Resultado do teste com lembrete:', result);
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao testar notificação de lembrete:', error);
      setError(error instanceof Error ? error.message : 'Erro ao testar webhook com lembrete. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Iniciar o agendador manualmente
  const startScheduler = async () => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Chamar a API para iniciar o agendador
      const response = await fetch('/api/scheduler/start', {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log('Resultado do início do agendador:', result);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        throw new Error(result.message || 'Erro ao iniciar o agendador');
      }
    } catch (error) {
      console.error('Erro ao iniciar o agendador:', error);
      setError('Erro ao iniciar o agendador. Verifique o console para mais detalhes.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800">
          &larr; Voltar para a página inicial
        </Link>
        <h2 className="text-2xl font-bold mt-2">Configuração de Webhooks</h2>
        <p className="text-gray-600 mt-1">
          Configure URLs para receber notificações dos lembretes de medicamentos.
        </p>
      </div>
      
      {error && (
        <div className="bg-red-100 p-4 rounded-md text-red-800 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {saveSuccess && (
        <div className="bg-green-100 p-4 rounded-md text-green-800 mb-6">
          <p>Operação realizada com sucesso!</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold mb-4">Configurações Gerais</h3>
        
        <div className="mb-4">
          <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 mb-1">
            URL de Webhook
          </label>
          <input
            type="url"
            id="webhookUrl"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="https://seu-servico.com/webhook"
          />
          <p className="mt-1 text-sm text-gray-500">
            URL que receberá as notificações quando os medicamentos forem agendados.
          </p>
        </div>
        
        <div className="mb-6">
          <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700 mb-1">
            Chave Secreta
          </label>
          <input
            type="text"
            id="webhookSecret"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="chave-secreta-para-verificacao"
          />
          <p className="mt-1 text-sm text-gray-500">
            Chave secreta para validar que as solicitações são autênticas.
          </p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={saveWebhookConfig}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
          
          <button
            onClick={testWebhook}
            disabled={isSaving || !webhookUrl}
            className="px-4 py-2 bg-green-500 text-white font-medium rounded-md hover:bg-green-600 disabled:opacity-50"
          >
            Testar Conexão
          </button>

          <button
            onClick={testReminderWebhook}
            disabled={isSaving || !webhookUrl || reminders.length === 0}
            className="px-4 py-2 bg-yellow-500 text-white font-medium rounded-md hover:bg-yellow-600 disabled:opacity-50 flex items-center"
          >
            <span>Testar com Lembrete</span>
          </button>
          
          <button
            onClick={startScheduler}
            disabled={isSaving}
            className="px-4 py-2 bg-purple-500 text-white font-medium rounded-md hover:bg-purple-600 disabled:opacity-50"
          >
            Iniciar Agendador
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-medium mb-2">Integração com GitHub</h4>
          <p className="text-sm text-gray-600 mb-3">
            Configure a integração com o GitHub para enviar atualizações a cada frequência de medicamento.
          </p>
          <Link 
            href="/webhook/github" 
            className="inline-flex items-center px-4 py-2 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-700"
          >
            Configurar GitHub
          </Link>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Lembretes Ativos</h3>
        <p className="mb-4 text-sm text-gray-600">
          Clique em um lembrete para ver detalhes e enviar notificações de teste.
        </p>
        
        {loading ? (
          <p className="text-center py-4">Carregando lembretes...</p>
        ) : reminders.length > 0 ? (
          <div className="space-y-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50">
                <Link href={`/reminders/${reminder.id}`} className="block">
                  <h4 className="font-medium">{reminder.petName}</h4>
                  <div className="text-sm text-gray-600 mt-1">
                    <p>Tutor: {reminder.tutorName}</p>
                    <p>Telefone: {reminder.phoneNumber}</p>
                    <p>Medicamentos: {reminder.medicationProducts.length}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-gray-500">
            Nenhum lembrete ativo encontrado.
          </p>
        )}
      </div>
    </div>
  );
} 