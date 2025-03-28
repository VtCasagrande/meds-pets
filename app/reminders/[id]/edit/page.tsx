'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Reminder, MedicationProduct } from '@/app/lib/types';
import MedicationProductForm from '@/app/components/MedicationProductForm';
import MedicationProductList from '@/app/components/MedicationProductList';
import Link from 'next/link';

export default function EditReminderPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductIndex, setEditingProductIndex] = useState<number | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [webhookSecret, setWebhookSecret] = useState<string>('');
  const [showWebhookConfig, setShowWebhookConfig] = useState(false);
  
  const [reminder, setReminder] = useState<Reminder>({
    tutorName: '',
    petName: '',
    petBreed: '',
    phoneNumber: '',
    medicationProducts: [],
    isActive: true
  });

  // Carregar os dados do lembrete quando a página for carregada
  useEffect(() => {
    fetchReminderDetails();
  }, [id]);

  const fetchReminderDetails = async () => {
    try {
      setIsLoading(true);
      console.log(`Buscando detalhes do lembrete para edição: ${id}`);
      const response = await fetch(`/api/reminders/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao buscar detalhes do lembrete');
      }
      
      const data = await response.json();
      console.log('Dados do lembrete recebidos:', data);
      
      // Carregar configurações de webhook
      setWebhookUrl(data.webhookUrl || localStorage.getItem('webhookUrl') || '');
      setWebhookSecret(data.webhookSecret || localStorage.getItem('webhookSecret') || '');
      
      // Garantir que todos os produtos de medicamento tenham o formato correto
      if (data.medicationProducts) {
        data.medicationProducts = data.medicationProducts.map((product: any) => {
          let startDateTime = '';
          
          // Verificar se startDateTime existe e formatá-lo corretamente
          if (product.startDateTime) {
            // Converter para objeto Date (seja de string ou objeto Date do MongoDB)
            const startDate = new Date(product.startDateTime);
            // Formatar para o formato datetime-local (YYYY-MM-DDTHH:MM)
            startDateTime = startDate.toISOString().slice(0, 16);
            console.log('Data formatada:', startDateTime);
          } else {
            // Se não houver data, usar data atual
            startDateTime = new Date().toISOString().slice(0, 16);
          }
          
          // Definir valores padrão para novos campos se não existirem
          const frequencyValue = product.frequencyValue || 8;
          const frequencyUnit = product.frequencyUnit || 'horas';
          const duration = product.duration || 7;
          const durationUnit = product.durationUnit || 'dias';
          
          // Calcular data de término se não existir
          let endDateTime = product.endDateTime ? new Date(product.endDateTime).toISOString().slice(0, 16) : '';
          if (!endDateTime && startDateTime) {
            // Converter a string de data para um objeto Date
            // Garantindo que a hora seja preservada exatamente
            const startDateObj = new Date(startDateTime);
            console.log('Data de início original:', startDateTime);
            console.log('Data de início como objeto:', startDateObj.toString());
            
            // Extrair os componentes da data manualmente
            const year = startDateObj.getFullYear();
            const month = startDateObj.getMonth();
            const day = startDateObj.getDate();
            const hours = startDateObj.getHours();
            const minutes = startDateObj.getMinutes();
            const seconds = startDateObj.getSeconds();
            
            console.log(`Componentes extraídos: ${year}-${month+1}-${day} ${hours}:${minutes}:${seconds}`);
            
            // Criar um novo objeto date mantendo exatamente os mesmos componentes
            let endYear = year;
            let endMonth = month;
            let endDay = day;
            let endHours = hours;
            let endMinutes = minutes;
            
            // Aplicar a duração com base na unidade escolhida
            switch(durationUnit) {
              case 'minutos':
                endMinutes += duration;
                break;
              case 'horas':
                endHours += duration;
                break;
              case 'dias':
                endDay += duration;
                break;
              case 'semanas':
                endDay += duration * 7;
                break;
              case 'meses':
                endMonth += duration;
                break;
            }
            
            // Criar o objeto Date final com todos os componentes ajustados
            const endDateObj = new Date(endYear, endMonth, endDay, endHours, endMinutes, seconds);
            
            console.log('Data final como objeto:', endDateObj.toString());
            console.log('Data final ISO:', endDateObj.toISOString());
            
            // Formatar para o formato datetime-local
            endDateTime = endDateObj.toISOString().slice(0, 16);
            console.log('String formatada final:', endDateTime);
          }
          
          // Construir o objeto de produto atualizado
          return {
            ...product,
            startDateTime,
            endDateTime,
            frequencyValue,
            frequencyUnit,
            duration,
            durationUnit,
            // Garantir que o campo legado de frequência esteja atualizado
            frequency: `A cada ${frequencyValue} ${frequencyUnit}`
          };
        });
      }

      setReminder(data);
      setError(null);
    } catch (error) {
      console.error('Erro ao buscar detalhes do lembrete:', error);
      setError('Não foi possível carregar os detalhes do lembrete para edição.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReminder((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleWebhookChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'webhookUrl') {
      setWebhookUrl(value);
      localStorage.setItem('webhookUrl', value);
    } else if (name === 'webhookSecret') {
      setWebhookSecret(value);
      localStorage.setItem('webhookSecret', value);
    }
  };

  const handleAddProduct = (product: MedicationProduct) => {
    if (!product.title || !product.quantity || !product.startDateTime) {
      setError('Todos os campos do medicamento são obrigatórios.');
      return;
    }

    setError(null);
    
    console.log('Adicionando/editando medicamento:', product);
    
    // Clone o produto para evitar referências compartilhadas
    const productToAdd = { ...product };
    
    try {
      setReminder((prev) => {
        let updatedReminder;
        if (editingProductIndex !== null) {
          // Editando um produto existente
          const updatedProducts = [...prev.medicationProducts];
          updatedProducts[editingProductIndex] = productToAdd;
          updatedReminder = {
            ...prev,
            medicationProducts: updatedProducts
          };
        } else {
          // Adicionando um novo produto
          updatedReminder = {
            ...prev,
            medicationProducts: [...prev.medicationProducts, productToAdd]
          };
        }
        
        return updatedReminder;
      });
      
      // Fechar formulário
      setShowProductForm(false);
      setEditingProductIndex(null);
    } catch (err) {
      console.error('Erro ao adicionar/editar medicamento:', err);
      setError('Erro ao processar medicamento. Tente novamente.');
    }
  };

  const handleEditProduct = (index: number) => {
    setEditingProductIndex(index);
    setShowProductForm(true);
  };

  const handleDeleteProduct = (index: number) => {
    if (!confirm('Tem certeza que deseja remover este medicamento?')) {
      return;
    }
    
    setReminder((prev) => ({
      ...prev,
      medicationProducts: prev.medicationProducts.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (reminder.medicationProducts.length === 0) {
      setError('Adicione pelo menos um medicamento ao lembrete.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Formatar os medicamentos para envio
      const formattedReminder = {
        ...reminder,
        medicationProducts: reminder.medicationProducts.map(product => ({
          ...product,
          // Garantir que as datas estejam no formato correto para o MongoDB
          startDateTime: new Date(product.startDateTime).toISOString(),
          endDateTime: product.endDateTime ? new Date(product.endDateTime).toISOString() : undefined
        })),
        // Incluir configurações de webhook
        webhookUrl,
        webhookSecret
      };
      
      console.log('Enviando dados atualizados:', JSON.stringify(formattedReminder, null, 2));
      
      const response = await fetch(`/api/reminders/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedReminder)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao atualizar o lembrete');
      }
      
      // Redirecionar para a visualização do lembrete
      router.push(`/reminders/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      setError('Não foi possível atualizar o lembrete. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <Link href={`/reminders/${id}`} className="text-primary hover:text-primary-dark flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar para detalhes do lembrete
        </Link>
        <h1 className="mt-3">Editar Lembrete</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center p-12">
          <div className="animate-pulse flex flex-col items-center">
            <div className="rounded-full bg-neutral-dark h-12 w-12 mb-2"></div>
            <div className="h-4 bg-neutral-dark rounded w-24"></div>
            <p className="text-dark-light mt-4">Carregando lembrete...</p>
          </div>
        </div>
      ) : error && !reminder.id ? (
        <div className="bg-accent/10 p-6 rounded-xl text-accent-dark border border-accent">
          <p className="font-medium">{error}</p>
          <button 
            onClick={fetchReminderDetails}
            className="mt-2 text-sm btn-accent px-3 py-1"
          >
            Tentar novamente
          </button>
        </div>
      ) : (
        <div className="card mb-8">
          {error && (
            <div className="bg-accent/10 p-4 rounded-lg text-accent-dark border border-accent mb-6">
              <div className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p>{error}</p>
              </div>
            </div>
          )}
          
          <h2 className="text-xl font-medium mb-6">Informações do Tutor e Pet</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label htmlFor="tutorName" className="block text-dark-dark text-sm font-medium mb-2">
                  Nome do Tutor
                </label>
                <input
                  type="text"
                  id="tutorName"
                  name="tutorName"
                  required
                  value={reminder.tutorName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Nome completo do tutor"
                />
              </div>
              
              <div>
                <label htmlFor="phoneNumber" className="block text-dark-dark text-sm font-medium mb-2">
                  Telefone
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  required
                  value={reminder.phoneNumber}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="(99) 99999-9999"
                />
              </div>
              
              <div>
                <label htmlFor="petName" className="block text-dark-dark text-sm font-medium mb-2">
                  Nome do Pet
                </label>
                <input
                  type="text"
                  id="petName"
                  name="petName"
                  required
                  value={reminder.petName}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Nome do pet"
                />
              </div>
              
              <div>
                <label htmlFor="petBreed" className="block text-dark-dark text-sm font-medium mb-2">
                  Raça do Pet
                </label>
                <input
                  type="text"
                  id="petBreed"
                  name="petBreed"
                  required
                  value={reminder.petBreed}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Raça do pet"
                />
              </div>
            </div>
            
            <div className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium">Medicamentos</h2>
                
                {!showProductForm && (
                  <button
                    type="button"
                    onClick={() => setShowProductForm(true)}
                    className="btn-secondary flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Adicionar Medicamento
                  </button>
                )}
              </div>
              
              {showProductForm ? (
                <MedicationProductForm
                  onAdd={handleAddProduct}
                  onCancel={() => {
                    setShowProductForm(false);
                    setEditingProductIndex(null);
                  }}
                  initialData={
                    editingProductIndex !== null
                      ? reminder.medicationProducts[editingProductIndex]
                      : undefined
                  }
                />
              ) : (
                <MedicationProductList
                  products={reminder.medicationProducts}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              )}
            </div>
            
            {/* Configurações de Webhook (Avançado) - Colapsável */}
            <div className="mb-8">
              <button
                type="button"
                onClick={() => setShowWebhookConfig(!showWebhookConfig)}
                className="flex items-center text-dark-light hover:text-dark font-medium text-sm mb-2"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className={`h-4 w-4 mr-1 transition-transform ${showWebhookConfig ? 'rotate-90' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Configurações Avançadas (Webhook)
              </button>
              
              {showWebhookConfig && (
                <div className="bg-neutral/50 border border-neutral-dark rounded-lg p-4 space-y-4">
                  <p className="text-xs text-dark-light mb-4">
                    Configure um webhook para receber notificações quando for hora de administrar o medicamento.
                    Estas configurações são opcionais.
                  </p>
                  
                  <div>
                    <label htmlFor="webhookUrl" className="block text-dark-dark text-sm font-medium mb-1">
                      URL do Webhook
                    </label>
                    <input
                      type="url"
                      id="webhookUrl"
                      name="webhookUrl"
                      value={webhookUrl}
                      onChange={handleWebhookChange}
                      className="input-field"
                      placeholder="https://seu-webhook.com/endpoint"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="webhookSecret" className="block text-dark-dark text-sm font-medium mb-1">
                      Segredo do Webhook
                    </label>
                    <input
                      type="text"
                      id="webhookSecret"
                      name="webhookSecret"
                      value={webhookSecret}
                      onChange={handleWebhookChange}
                      className="input-field"
                      placeholder="Chave secreta para autenticação"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-dark">
              <Link href={`/reminders/${id}`} className="btn-outline">
                Cancelar
              </Link>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </span>
                ) : (
                  'Salvar Alterações'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 