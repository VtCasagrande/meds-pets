'use client';

import { useEffect, useState } from 'react';
import { Reminder, RemindersState } from '@/app/lib/types';
import ReminderCard from '@/app/components/ReminderCard';
import Link from 'next/link';

export default function RemindersPage() {
  const [reminderState, setReminderState] = useState<RemindersState>({
    activeReminders: [],
    completedReminders: []
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredReminders, setFilteredReminders] = useState<{
    active: Reminder[];
    completed: Reminder[];
  }>({
    active: [],
    completed: []
  });

  useEffect(() => {
    fetchReminders();
  }, []);

  // Efeito para filtrar os lembretes com base no termo de pesquisa
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredReminders({
        active: reminderState.activeReminders,
        completed: reminderState.completedReminders
      });
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    
    // Filtrar lembretes ativos
    const filteredActive = reminderState.activeReminders.filter(reminder => 
      reminder.tutorName.toLowerCase().includes(term) ||
      reminder.petName.toLowerCase().includes(term) ||
      reminder.petBreed.toLowerCase().includes(term) ||
      reminder.phoneNumber.includes(term) ||
      reminder.medicationProducts.some(product => 
        product.title.toLowerCase().includes(term) ||
        product.quantity.toLowerCase().includes(term)
      )
    );
    
    // Filtrar lembretes finalizados
    const filteredCompleted = reminderState.completedReminders.filter(reminder => 
      reminder.tutorName.toLowerCase().includes(term) ||
      reminder.petName.toLowerCase().includes(term) ||
      reminder.petBreed.toLowerCase().includes(term) ||
      reminder.phoneNumber.includes(term) ||
      reminder.medicationProducts.some(product => 
        product.title.toLowerCase().includes(term) ||
        product.quantity.toLowerCase().includes(term)
      )
    );
    
    setFilteredReminders({
      active: filteredActive,
      completed: filteredCompleted
    });
  }, [searchTerm, reminderState]);
  
  const fetchReminders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/reminders');
      
      if (!response.ok) {
        throw new Error('Erro ao buscar lembretes');
      }
      
      const data = await response.json();
      
      // Garantir que todos os lembretes tenham o campo id preenchido com o _id do MongoDB
      const processedActiveReminders = data.activeReminders.map((reminder: any) => ({
        ...reminder,
        id: reminder._id || reminder.id
      }));
      
      const processedCompletedReminders = data.completedReminders.map((reminder: any) => ({
        ...reminder,
        id: reminder._id || reminder.id
      }));
      
      setReminderState({
        activeReminders: processedActiveReminders,
        completedReminders: processedCompletedReminders
      });
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
      setError('Não foi possível carregar os lembretes. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  // Limpar pesquisa
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // Determinar quais lembretes mostrar
  const activeRemindersToShow = filteredReminders.active;
  const completedRemindersToShow = filteredReminders.completed;

  return (
    <div>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
        <h1 className="text-2xl mb-0">Lembretes de Medicamentos</h1>
        <Link href="/reminders/new" className="btn-primary">
          Adicionar Novo Lembrete
        </Link>
      </div>
      
      {/* Campo de Pesquisa */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar por tutor, pet, medicamento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-light">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button 
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-light hover:text-dark"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="text-xs text-dark-light mt-2">
            <span className="font-medium">{activeRemindersToShow.length}</span> lembrete(s) ativo(s) e{' '}
            <span className="font-medium">{completedRemindersToShow.length}</span> finalizado(s) encontrados
          </div>
        )}
      </div>
      
      {/* Tabs */}
      <div className="border-b border-neutral-dark mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-primary text-primary-dark'
                : 'border-transparent text-dark-light hover:text-dark hover:border-neutral-dark'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Ativos ({activeRemindersToShow.length})
          </button>
          <button
            className={`py-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-primary text-primary-dark'
                : 'border-transparent text-dark-light hover:text-dark hover:border-neutral-dark'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Finalizados ({completedRemindersToShow.length})
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-neutral-dark h-12 w-12 mb-2"></div>
            <div className="h-4 bg-neutral-dark rounded w-24"></div>
            <p className="text-dark-light mt-4">Carregando lembretes...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-accent/10 p-6 rounded-xl text-accent-dark border border-accent">
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchReminders}
            className="mt-2 text-sm btn-accent px-3 py-1"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {/* Resultados de busca - quando pesquisando */}
          {searchTerm && activeRemindersToShow.length === 0 && completedRemindersToShow.length === 0 && (
            <div className="text-center p-8 bg-neutral rounded-xl border border-neutral-dark">
              <div className="mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-dark-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-dark font-medium mb-1">Nenhum resultado encontrado</p>
              <p className="text-dark-light text-sm">Tente outros termos ou verifique a ortografia</p>
              <button onClick={handleClearSearch} className="btn-outline mt-4 text-sm">
                Limpar pesquisa
              </button>
            </div>
          )}
          
          {/* Lista de lembretes */}
          {!searchTerm || (activeTab === 'active' ? activeRemindersToShow.length > 0 : completedRemindersToShow.length > 0) ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTab === 'active' ? (
                activeRemindersToShow.length > 0 ? (
                  activeRemindersToShow.map((reminder: Reminder) => (
                    <ReminderCard key={reminder.id} reminder={reminder} />
                  ))
                ) : (
                  <div className="col-span-full text-center p-8 bg-neutral rounded-xl border border-neutral-dark">
                    <p className="text-dark-light">Nenhum lembrete ativo encontrado.</p>
                    <Link href="/reminders/new" className="btn-primary mt-4 inline-block">
                      Adicionar um novo lembrete
                    </Link>
                  </div>
                )
              ) : completedRemindersToShow.length > 0 ? (
                completedRemindersToShow.map((reminder: Reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))
              ) : (
                <div className="col-span-full text-center p-8 bg-neutral rounded-xl border border-neutral-dark">
                  <p className="text-dark-light">Nenhum lembrete finalizado encontrado.</p>
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
} 