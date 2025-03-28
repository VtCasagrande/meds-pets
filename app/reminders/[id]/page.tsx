'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Reminder, MedicationProduct } from '@/app/lib/types';
import MedicationProductList from '@/app/components/MedicationProductList';
import Link from 'next/link';

export default function ReminderDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  
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
      
      setReminder(data);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar detalhes do lembrete:', error);
      setError('Não foi possível carregar os detalhes do lembrete.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleToggleActive = async () => {
    if (!reminder) return;
    
    try {
      setIsDeactivating(true);
      console.log(`${reminder.isActive ? 'Desativando' : 'Ativando'} lembrete: ${id}`);
      
      const updatedReminder = {
        ...reminder,
        isActive: !reminder.isActive
      };
      
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedReminder)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || `Erro ao ${reminder.isActive ? 'desativar' : 'ativar'} o lembrete`);
      }
      
      setReminder(updatedReminder);
    } catch (error) {
      console.error(`Erro ao ${reminder.isActive ? 'desativar' : 'ativar'} lembrete:`, error);
      setError(`Não foi possível ${reminder.isActive ? 'desativar' : 'ativar'} o lembrete. Tente novamente mais tarde.`);
    } finally {
      setIsDeactivating(false);
    }
  };
  
  const handleDelete = async () => {
    if (!reminder) return;
    
    if (!confirm(`Tem certeza que deseja excluir o lembrete para ${reminder.petName}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      setIsDeleting(true);
      console.log(`Excluindo lembrete: ${id}`);
      
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao excluir o lembrete');
      }
      
      router.push('/reminders');
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error);
      setError('Não foi possível excluir o lembrete. Tente novamente mais tarde.');
      setIsDeleting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };
  
  return (
    <div>
      <div className="mb-8">
        <Link href="/reminders" className="text-primary hover:text-primary-dark flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para a lista de lembretes
        </Link>
        <h1 className="mt-3">Detalhes do Lembrete</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-neutral-dark h-12 w-12 mb-2"></div>
            <div className="h-4 bg-neutral-dark rounded w-24"></div>
            <p className="text-dark-light mt-4">Carregando lembrete...</p>
          </div>
        </div>
      ) : error && !reminder ? (
        <div className="bg-accent/10 p-6 rounded-xl text-accent-dark border border-accent">
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchReminderDetails}
            className="mt-2 text-sm btn-accent px-3 py-1"
          >
            Tentar novamente
          </button>
        </div>
      ) : reminder ? (
        <div className="space-y-8">
          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`${
                reminder.isActive 
                  ? 'bg-success/10 text-success-dark border-success' 
                  : 'bg-neutral/10 text-dark-light border-neutral-dark'
              } px-3 py-1 rounded-full text-sm border flex items-center`}>
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  reminder.isActive ? 'bg-success animate-pulse' : 'bg-dark-light'
                }`}></span>
                {reminder.isActive ? 'Ativo' : 'Inativo'}
              </div>
              <div className="ml-2 text-dark-light text-sm">
                ID: {reminder.id}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link 
                href={`/reminders/${id}/edit`}
                className="btn-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Editar
              </Link>
              <button
                onClick={handleToggleActive}
                disabled={isDeactivating}
                className={`${
                  reminder.isActive ? 'btn-outline-accent' : 'btn-outline-success'
                }`}
              >
                {isDeactivating ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : reminder.isActive ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Desativar
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Ativar
                  </>
                )}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-outline-accent"
              >
                {isDeleting ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Excluir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Informações do Tutor e Pet */}
          <div className="card">
            <h2 className="text-xl font-medium mb-6">Informações do Tutor e Pet</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <div className="text-sm text-dark-light mb-1">Nome do Tutor</div>
                <div className="font-medium">{reminder.tutorName}</div>
              </div>
              
              <div>
                <div className="text-sm text-dark-light mb-1">Telefone</div>
                <div className="font-medium">{reminder.phoneNumber}</div>
              </div>
              
              <div>
                <div className="text-sm text-dark-light mb-1">Nome do Pet</div>
                <div className="font-medium">{reminder.petName}</div>
              </div>
              
              <div>
                <div className="text-sm text-dark-light mb-1">Raça do Pet</div>
                <div className="font-medium">{reminder.petBreed}</div>
              </div>
              
              {reminder.createdAt && (
                <div>
                  <div className="text-sm text-dark-light mb-1">Criado em</div>
                  <div className="font-medium">{formatDate(reminder.createdAt)}</div>
                </div>
              )}
              
              {reminder.updatedAt && (
                <div>
                  <div className="text-sm text-dark-light mb-1">Atualizado em</div>
                  <div className="font-medium">{formatDate(reminder.updatedAt)}</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Medicamentos */}
          <div className="card">
            <h2 className="text-xl font-medium mb-6">Medicamentos</h2>
            
            {reminder.medicationProducts.length > 0 ? (
              <MedicationProductList products={reminder.medicationProducts} />
            ) : (
              <div className="bg-neutral/20 rounded-lg p-6 text-center">
                <p className="text-dark-light">Nenhum medicamento cadastrado para este lembrete.</p>
              </div>
            )}
          </div>
          
          {/* Configurações de Webhook */}
          {(reminder.webhookUrl || reminder.webhookSecret) && (
            <div className="card">
              <h2 className="text-xl font-medium mb-6">Configurações de Webhook</h2>
              
              <div className="space-y-4">
                {reminder.webhookUrl && (
                  <div>
                    <div className="text-sm text-dark-light mb-1">URL do Webhook</div>
                    <div className="font-mono text-sm bg-neutral/20 p-2 rounded-lg overflow-x-auto">
                      {reminder.webhookUrl}
                    </div>
                  </div>
                )}
                
                {reminder.webhookSecret && (
                  <div>
                    <div className="text-sm text-dark-light mb-1">Segredo do Webhook</div>
                    <div className="font-mono text-sm bg-neutral/20 p-2 rounded-lg">
                      {reminder.webhookSecret}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
} 