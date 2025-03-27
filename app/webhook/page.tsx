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
          <p>Configurações salvas com sucesso!</p>
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
        
        <button
          onClick={saveWebhookConfig}
          disabled={isSaving}
          className="px-4 py-2 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 disabled:opacity-50"
        >
          {isSaving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
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