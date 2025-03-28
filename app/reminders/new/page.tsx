'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Reminder, MedicationProduct } from '@/app/lib/types';
import MedicationProductForm from '@/app/components/MedicationProductForm';
import MedicationProductList from '@/app/components/MedicationProductList';
import Link from 'next/link';

export default function NewReminderPage() {
  const router = useRouter();
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
  
  // Carregamento das configurações de webhook do localStorage
  useEffect(() => {
    // Carregar configurações do webhook
    const savedUrl = localStorage.getItem('webhookUrl') || '';
    const savedSecret = localStorage.getItem('webhookSecret') || '';
    setWebhookUrl(savedUrl);
    setWebhookSecret(savedSecret);
  }, []);

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
    if (!product.title || !product.quantity || !product.frequency || !product.startDateTime) {
      setError('Todos os campos do medicamento são obrigatórios.');
      return;
    }

    setError(null);
    
    console.log('Adicionando medicamento ao lembrete:', product);
    
    // Clone o produto para evitar referências compartilhadas
    const productToAdd = { ...product };
    
    try {
      setReminder((prev) => {
        console.log('Estado atual dos medicamentos:', prev.medicationProducts);
        
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
        
        console.log('Novo estado dos medicamentos:', updatedReminder.medicationProducts);
        return updatedReminder;
      });
      
      // Fechar formulário
      setShowProductForm(false);
      setEditingProductIndex(null);
    } catch (err) {
      console.error('Erro ao adicionar medicamento:', err);
      setError('Erro ao adicionar medicamento. Tente novamente.');
    }
  };

  const handleEditProduct = (index: number) => {
    setEditingProductIndex(index);
    setShowProductForm(true);
  };

  const handleDeleteProduct = (index: number) => {
    if (confirm('Tem certeza que deseja remover este medicamento?')) {
      setReminder((prev) => ({
        ...prev,
        medicationProducts: prev.medicationProducts.filter((_, i) => i !== index)
      }));
    }
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
      
      // Formatar os medicamentos para garantir que startDateTime e endDateTime sejam corretos
      const formattedReminder = {
        ...reminder,
        medicationProducts: reminder.medicationProducts.map(product => {
          console.log('Formatando produto para envio:', product);
          // Datas originais
          const startDateTime = new Date(product.startDateTime);
          const endDateTime = product.endDateTime ? new Date(product.endDateTime) : null;
          
          console.log('Data inicial:', startDateTime.toISOString());
          console.log('Data de término:', endDateTime ? endDateTime.toISOString() : 'não definida');
          
          return {
            ...product,
            // Garantir que as datas sejam gravadas como ISO strings
            startDateTime: startDateTime.toISOString(),
            endDateTime: endDateTime ? endDateTime.toISOString() : undefined
          };
        }),
        // Incluir configurações de webhook, se disponíveis
        webhookUrl,
        webhookSecret
      };
      
      console.log('Enviando dados:', JSON.stringify(formattedReminder, null, 2));
      
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formattedReminder)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erro da API:', errorData);
        throw new Error(errorData.error || 'Erro ao criar o lembrete');
      }
      
      // Apenas redirecionar se a operação de criação for bem-sucedida
      const data = await response.json();
      
      if (data && data._id) {
        // Redirecionar para a lista de lembretes após sucesso
        router.push('/reminders');
      } else {
        throw new Error('Resposta sem ID do lembrete');
      }
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      setError('Não foi possível criar o lembrete. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="mt-3">Adicionar Novo Lembrete</h1>
      </div>
      
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
      
      <div className="card mb-8">
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
                initialData={editingProductIndex !== null ? reminder.medicationProducts[editingProductIndex] : undefined}
              />
            ) : (
              <div className="mb-6">
                <h2 className="text-xl font-medium mb-4">Medicamentos</h2>
                
                {reminder.medicationProducts.length > 0 ? (
                  <MedicationProductList
                    products={reminder.medicationProducts}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                  />
                ) : (
                  <div className="border border-neutral-dark border-dashed rounded-lg p-8 text-center">
                    <p className="text-neutral-dark mb-4">
                      Nenhum medicamento adicionado ainda.
                    </p>
                  </div>
                )}
                
                <button
                  type="button" // Garantir que este botão seja do tipo "button" para não submeter o formulário principal
                  onClick={() => setShowProductForm(true)}
                  className="btn-secondary mt-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Adicionar Medicamento
                </button>
              </div>
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
            <Link href="/reminders" className="btn-outline">
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
                  Criando...
                </span>
              ) : (
                'Criar Lembrete'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 