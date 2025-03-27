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

  useEffect(() => {
    fetchReminders();
  }, []);

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Lembretes de Medicamentos</h2>
        <Link href="/reminders/new" className="btn-primary">
          Adicionar Novo Lembrete
        </Link>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('active')}
          >
            Ativos ({reminderState.activeReminders.length})
          </button>
          <button
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('completed')}
          >
            Finalizados ({reminderState.completedReminders.length})
          </button>
        </div>
      </div>
      
      {isLoading ? (
        <div className="text-center p-8">
          <p>Carregando lembretes...</p>
        </div>
      ) : error ? (
        <div className="bg-red-100 p-4 rounded-md text-red-800">
          <p>{error}</p>
          <button 
            onClick={fetchReminders}
            className="text-red-600 font-medium mt-2 underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeTab === 'active' ? (
            reminderState.activeReminders.length > 0 ? (
              reminderState.activeReminders.map((reminder: Reminder) => (
                <ReminderCard key={reminder.id} reminder={reminder} />
              ))
            ) : (
              <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">Nenhum lembrete ativo encontrado.</p>
                <Link href="/reminders/new" className="text-blue-600 font-medium mt-2 block">
                  Adicionar um novo lembrete
                </Link>
              </div>
            )
          ) : reminderState.completedReminders.length > 0 ? (
            reminderState.completedReminders.map((reminder: Reminder) => (
              <ReminderCard key={reminder.id} reminder={reminder} />
            ))
          ) : (
            <div className="col-span-full text-center p-8 bg-gray-50 rounded-lg">
              <p className="text-gray-500">Nenhum lembrete finalizado encontrado.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 