'use client';

import { useState, useEffect } from 'react';
import { MedicationProduct } from '../lib/types';
import { formatDate } from '../lib/dateUtils';

interface WebhooksListProps {
  medications: MedicationProduct[];
  reminderId: string;
}

export default function WebhooksList({ medications, reminderId }: WebhooksListProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');

  useEffect(() => {
    // Carregar configurações de webhook do localStorage
    try {
      const savedUrl = localStorage.getItem('webhookUrl') || '';
      const savedSecret = localStorage.getItem('webhookSecret') || '';
      setWebhookUrl(savedUrl);
      setWebhookSecret(savedSecret);
    } catch (err) {
      console.error('Erro ao carregar configurações do webhook:', err);
    }
  }, []);

  const triggerWebhook = async (medicationIndex: number) => {
    setLoading(medicationIndex);
    setError(null);
    setSuccess(null);
    
    try {
      console.log(`Disparando webhook para medicamento ${medicationIndex} com URL: ${webhookUrl}`);
      
      const response = await fetch('/api/reminders/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderId,
          medicationIndex,
          webhookUrl,
          webhookSecret
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao disparar webhook');
      }

      const data = await response.json();
      console.log('Webhook disparado com sucesso:', data);
      setSuccess(medicationIndex);
    } catch (err) {
      console.error('Erro ao disparar webhook:', err);
      setError(`Erro ao disparar webhook: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold mb-3">Disparar Notificações (Webhooks)</h4>
      
      {!webhookUrl && (
        <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md mb-4">
          <p>Nenhuma URL de webhook configurada. As notificações serão simuladas.</p>
          <a 
            href="/webhook" 
            className="text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
          >
            Configurar Webhook
          </a>
        </div>
      )}
      
      {webhookUrl && (
        <div className="bg-blue-50 text-blue-800 p-3 rounded-md mb-4">
          <p><strong>URL configurada:</strong> {webhookUrl}</p>
          {webhookSecret && <p><strong>Autenticação:</strong> Configurada</p>}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success !== null && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
          Notificação enviada com sucesso para {medications[success]?.title || 'o medicamento'}!
        </div>
      )}
      
      <div className="space-y-3">
        {medications.map((medication, index) => (
          <div 
            key={index} 
            className="bg-gray-50 p-4 rounded-lg border border-gray-200"
          >
            <div className="flex justify-between items-start">
              <div>
                <h5 className="font-medium">{medication.title}</h5>
                <div className="text-sm text-gray-600 space-y-1 mt-1">
                  <p>Quantidade: {medication.quantity}</p>
                  <p>Frequência: {medication.frequency}</p>
                  <p>Programado para: {formatDate(medication.startDateTime)}</p>
                </div>
              </div>
              <button
                onClick={() => triggerWebhook(index)}
                disabled={loading === index}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
              >
                {loading === index ? 'Enviando...' : 'Enviar Notificação'}
              </button>
            </div>
          </div>
        ))}
        
        {medications.length === 0 && (
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Nenhum medicamento para notificar.</p>
          </div>
        )}
      </div>
    </div>
  );
} 