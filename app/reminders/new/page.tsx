'use client';

import { useState } from 'react';
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
  
  const [reminder, setReminder] = useState<Reminder>({
    tutorName: '',
    petName: '',
    petBreed: '',
    phoneNumber: '',
    medicationProducts: [],
    isActive: true
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setReminder((prev) => ({
      ...prev,
      [name]: value
    }));
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
      
      // Feedback visual
      alert('Medicamento adicionado com sucesso!');
      
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
        })
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
      
      // Redirecionar para a lista de lembretes após sucesso
      router.push('/reminders');
    } catch (error) {
      console.error('Erro ao criar lembrete:', error);
      setError('Não foi possível criar o lembrete. Tente novamente mais tarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/reminders" className="text-blue-600 hover:text-blue-800">
          &larr; Voltar para a lista de lembretes
        </Link>
        <h2 className="text-2xl font-bold mt-2">Adicionar Novo Lembrete</h2>
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
              href="/reminders"
              className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 mr-3"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || reminder.medicationProducts.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Lembrete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 