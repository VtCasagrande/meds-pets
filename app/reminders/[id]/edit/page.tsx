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
            const endDate = new Date(startDateTime);
            console.log('Data inicial para cálculo:', endDate.toISOString());
            
            // Preservar a hora original
            const originalHours = endDate.getHours();
            const originalMinutes = endDate.getMinutes();
            
            // Calcular com base na duração
            if (durationUnit === 'dias') {
              endDate.setDate(endDate.getDate() + duration);
            } else if (durationUnit === 'semanas') {
              endDate.setDate(endDate.getDate() + (duration * 7));
            } else if (durationUnit === 'meses') {
              endDate.setMonth(endDate.getMonth() + duration);
            }
            
            // Garantir que a hora seja mantida
            endDate.setHours(originalHours, originalMinutes);
            
            console.log('Data final calculada:', endDate.toISOString());
            endDateTime = endDate.toISOString().slice(0, 16);
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
      
      // Feedback visual
      alert(editingProductIndex !== null ? 'Medicamento atualizado com sucesso!' : 'Medicamento adicionado com sucesso!');
      
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
        }))
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
      
      // Feedback de sucesso
      alert('Lembrete atualizado com sucesso!');
      
      // Redirecionar para a página de detalhes do lembrete
      router.push(`/reminders/${id}`);
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      setError('Não foi possível atualizar o lembrete. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <p>Carregando dados do lembrete...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href={`/reminders/${id}`} className="text-blue-600 hover:text-blue-800">
          &larr; Voltar para detalhes do lembrete
        </Link>
        <h2 className="text-2xl font-bold mt-2">Editar Lembrete</h2>
      </div>
      
      {error && (
        <div className="bg-red-100 p-4 rounded-md text-red-800 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label htmlFor="tutorName" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="petName" className="block text-sm font-medium text-gray-700 mb-1">
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
              <label htmlFor="petBreed" className="block text-sm font-medium text-gray-700 mb-1">
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
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Medicamentos</h3>
              
              {!showProductForm && (
                <button
                  type="button"
                  onClick={() => setShowProductForm(true)}
                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                  + Adicionar Medicamento
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
              <MedicationProductList
                products={reminder.medicationProducts}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                isEditable={true}
              />
            )}
          </div>
          
          <div className="flex justify-end mt-8">
            <Link
              href={`/reminders/${id}`}
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || reminder.medicationProducts.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 