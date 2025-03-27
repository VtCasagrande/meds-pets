'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reminder } from '@/app/lib/types';
import MedicationProductList from '@/app/components/MedicationProductList';
import { formatDate, formatRelativeDate } from '@/app/lib/dateUtils';
import Link from 'next/link';
import WebhooksList from '@/app/components/WebhooksList';

export default function ReminderDetailsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  useEffect(() => {
    fetchReminderDetails();
  }, [id]);

  const fetchReminderDetails = async () => {
    try {
      setIsLoading(true);
      console.log(`Buscando detalhes do lembrete: ${id}`);
      const response = await fetch(`/api/reminders/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao buscar detalhes do lembrete');
      }
      
      const data = await response.json();
      console.log('Dados do lembrete recebidos:', data);
      
      // Converter campos de data para garantir compatibilidade
      if (data.medicationProducts) {
        data.medicationProducts = data.medicationProducts.map((product: any) => ({
          ...product,
          startDateTime: product.startDateTime || new Date().toISOString()
        }));
      }

      setReminder(data);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar detalhes do lembrete:', error);
      setError('Não foi possível carregar os detalhes do lembrete.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!reminder) return;
    
    try {
      setIsTogglingStatus(true);
      
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...reminder,
          isActive: !reminder.isActive
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao atualizar status do lembrete');
      }
      
      const updatedReminder = await response.json();
      setReminder(updatedReminder);
    } catch (error) {
      console.error('Erro ao atualizar status do lembrete:', error);
      setError('Não foi possível atualizar o status do lembrete.');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este lembrete?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir lembrete');
      }
      
      router.push('/reminders');
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      setError('Não foi possível excluir o lembrete.');
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <p>Carregando detalhes do lembrete...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 p-4 rounded-md text-red-800">
        <p>{error}</p>
        <button 
          onClick={fetchReminderDetails}
          className="text-red-600 font-medium mt-2 underline"
        >
          Tentar novamente
        </button>
        <Link href="/reminders" className="text-blue-600 ml-4">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  if (!reminder) {
    return (
      <div className="text-center p-8">
        <p>Lembrete não encontrado.</p>
        <Link href="/reminders" className="text-blue-600 mt-2 block">
          Voltar para a lista de lembretes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/reminders" className="text-blue-600 hover:text-blue-800">
          &larr; Voltar para a lista de lembretes
        </Link>
        <div className="flex justify-between items-center mt-2">
          <h2 className="text-2xl font-bold">Detalhes do Lembrete</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleToggleStatus}
              disabled={isTogglingStatus}
              className={`py-2 px-4 rounded-lg shadow-md text-white text-sm font-semibold ${
                reminder.isActive
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-green-500 hover:bg-green-600'
              } disabled:opacity-50`}
            >
              {isTogglingStatus
                ? 'Atualizando...'
                : reminder.isActive
                ? 'Marcar como Finalizado'
                : 'Reativar Lembrete'}
            </button>
            
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="py-2 px-4 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold">{reminder.petName}</h3>
            <p className="text-gray-500">Lembrete {reminder.isActive ? 'Ativo' : 'Finalizado'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            reminder.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {reminder.isActive ? 'Ativo' : 'Finalizado'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Informações do Tutor</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="mb-2"><span className="font-medium">Nome:</span> {reminder.tutorName}</p>
              <p><span className="font-medium">Telefone:</span> {reminder.phoneNumber}</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Informações do Pet</h4>
            <div className="bg-gray-50 p-4 rounded-md">
              <p className="mb-2"><span className="font-medium">Nome:</span> {reminder.petName}</p>
              <p><span className="font-medium">Raça:</span> {reminder.petBreed}</p>
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <h4 className="text-lg font-semibold mb-3">Medicamentos</h4>
          <MedicationProductList products={reminder.medicationProducts} />
        </div>
        
        {reminder.isActive && (
          <WebhooksList 
            medications={reminder.medicationProducts}
            reminderId={id}
          />
        )}
        
        {reminder.createdAt && (
          <div className="text-xs text-gray-500 mt-4 pt-4 border-t border-gray-200">
            <p>Criado {formatRelativeDate(reminder.createdAt)}</p>
            {reminder.updatedAt && reminder.updatedAt !== reminder.createdAt && (
              <p>Atualizado {formatRelativeDate(reminder.updatedAt)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 