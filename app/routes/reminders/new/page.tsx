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
    setReminder((prev) => {
      if (editingProductIndex !== null) {
        // Editando um produto existente
        const updatedProducts = [...prev.medicationProducts];
        updatedProducts[editingProductIndex] = product;
        return {
          ...prev,
          medicationProducts: updatedProducts
        };
      } else {
        // Adicionando um novo produto
        return {
          ...prev,
          medicationProducts: [...prev.medicationProducts, product]
        };
      }
    });
    
    setShowProductForm(false);
    setEditingProductIndex(null);
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
      
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reminder)
      });
      
      if (!response.ok) {
        throw new Error('Erro ao criar o lembrete');
      }
      
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