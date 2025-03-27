'use client';

import { MedicationProduct } from '../lib/types';
import { useState } from 'react';

interface MedicationProductFormProps {
  onAdd: (product: MedicationProduct) => void;
  onCancel: () => void;
  initialData?: MedicationProduct;
}

export default function MedicationProductForm({
  onAdd,
  onCancel,
  initialData
}: MedicationProductFormProps) {
  const [product, setProduct] = useState<MedicationProduct>(
    initialData || {
      title: '',
      quantity: '',
      frequency: '',
      startDateTime: new Date().toISOString().slice(0, 16)
    }
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.title || !product.quantity || !product.frequency || !product.startDateTime) {
      alert('Por favor, preencha todos os campos do medicamento.');
      return;
    }
    
    onAdd(product);
    
    if (!initialData) {
      setProduct({
        title: '',
        quantity: '',
        frequency: '',
        startDateTime: new Date().toISOString().slice(0, 16)
      });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <h3 className="font-bold text-lg mb-4">
        {initialData ? 'Editar Medicamento' : 'Adicionar Medicamento'}
      </h3>
      
      <form onSubmit={handleSubmit} method="dialog">
        <div className="mb-4">
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            Nome do Medicamento
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            value={product.title}
            onChange={handleChange}
            className="input-field"
            placeholder="Ex: Antibiótico Amoxicilina"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantidade/Dosagem
          </label>
          <input
            type="text"
            id="quantity"
            name="quantity"
            required
            value={product.quantity}
            onChange={handleChange}
            className="input-field"
            placeholder="Ex: 1 comprimido, 10ml, etc."
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
            Frequência
          </label>
          <input
            type="text"
            id="frequency"
            name="frequency"
            required
            value={product.frequency}
            onChange={handleChange}
            className="input-field"
            placeholder="Ex: A cada 8 horas, 2x ao dia, etc."
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700">
            Data e Hora de Início
          </label>
          <input
            type="datetime-local"
            id="startDateTime"
            name="startDateTime"
            required
            value={product.startDateTime}
            onChange={handleChange}
            className="input-field"
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {initialData ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  );
} 