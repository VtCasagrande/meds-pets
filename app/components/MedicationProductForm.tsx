'use client';

import { MedicationProduct } from '../lib/types';
import { useState, useEffect } from 'react';

interface MedicationProductFormProps {
  onAdd: (product: MedicationProduct) => void;
  onCancel: () => void;
  initialData?: MedicationProduct;
}

// Função para calcular a data de término com base na duração
function calculateEndDate(startDate: string, duration: number, durationUnit: string): string {
  console.log('Calculando data de término para:', startDate, duration, durationUnit);
  
  // Converter a string de data para um objeto Date
  // Ao usar o formato 'YYYY-MM-DDTHH:MM', o JavaScript assume UTC
  // Então vamos garantir que o fuso horário local seja respeitado
  
  // Primeiro, converta a string para um objeto Date
  const startDateObj = new Date(startDate);
  console.log('Data de início (objeto):', startDateObj);
  console.log('Data de início (ISO):', startDateObj.toISOString());
  console.log('Data local:', startDateObj.toString());
  
  // Extrair os componentes da data manualmente
  const year = startDateObj.getFullYear();
  const month = startDateObj.getMonth();
  const day = startDateObj.getDate();
  const hours = startDateObj.getHours();
  const minutes = startDateObj.getMinutes();
  const seconds = startDateObj.getSeconds();
  
  console.log(`Componentes: ${year}-${month+1}-${day} ${hours}:${minutes}:${seconds}`);
  
  // Criar um novo objeto date mantendo exatamente os mesmos componentes
  let endYear = year;
  let endMonth = month;
  let endDay = day;
  let endHours = hours;
  let endMinutes = minutes;
  
  // Aplicar a duração com base na unidade
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
  
  // Criar o objeto Date final usando todos os componentes
  const endDateObj = new Date(endYear, endMonth, endDay, endHours, endMinutes, seconds);
  
  console.log('Data final calculada (objeto):', endDateObj);
  console.log('Data final (ISO):', endDateObj.toISOString());
  console.log('Data final (local):', endDateObj.toString());
  
  // Extrair o ano, mês, dia, hora e minuto da data final
  const endDateString = endDateObj.toISOString().slice(0, 16);
  console.log('String formatada final:', endDateString);
  
  return endDateString;
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
      frequency: '', // Campo legado
      frequencyValue: 8,
      frequencyUnit: 'horas',
      duration: 7,
      durationUnit: 'dias',
      startDateTime: new Date().toISOString().slice(0, 16),
      endDateTime: ''
    }
  );

  // Calcular data de término quando a data de início ou a duração mudar
  useEffect(() => {
    if (product.startDateTime && product.duration && product.durationUnit) {
      const endDate = calculateEndDate(
        product.startDateTime, 
        product.duration, 
        product.durationUnit
      );
      setProduct(prev => ({ ...prev, endDateTime: endDate }));
    }
  }, [product.startDateTime, product.duration, product.durationUnit]);

  // Atualizar o campo de frequência legado quando os novos campos mudarem
  useEffect(() => {
    const legacyFrequency = `A cada ${product.frequencyValue} ${product.frequencyUnit}`;
    setProduct(prev => ({ ...prev, frequency: legacyFrequency }));
  }, [product.frequencyValue, product.frequencyUnit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    setProduct((prev) => {
      // Converter valores numéricos
      if (name === 'frequencyValue' || name === 'duration') {
        return { ...prev, [name]: Number(value) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.title || !product.quantity || !product.startDateTime) {
      alert('Por favor, preencha todos os campos do medicamento.');
      return;
    }
    
    console.log('Enviando medicamento:', product);
    onAdd(product);
    
    if (!initialData) {
      setProduct({
        title: '',
        quantity: '',
        frequency: '',
        frequencyValue: 8,
        frequencyUnit: 'horas',
        duration: 7,
        durationUnit: 'dias',
        startDateTime: new Date().toISOString().slice(0, 16),
        endDateTime: ''
      });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
      <h3 className="font-bold text-lg mb-4">
        {initialData ? 'Editar Medicamento' : 'Adicionar Medicamento'}
      </h3>
      
      <div>
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
          <label className="block text-sm font-medium text-gray-700">
            Frequência
          </label>
          <div className="flex space-x-2">
            <div className="w-1/3">
              <input
                type="number"
                id="frequencyValue"
                name="frequencyValue"
                min="1"
                required
                value={product.frequencyValue}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="w-2/3">
              <select
                id="frequencyUnit"
                name="frequencyUnit"
                value={product.frequencyUnit}
                onChange={handleChange}
                className="input-field"
              >
                <option value="minutos">Minutos</option>
                <option value="horas">Horas</option>
                <option value="dias">Dias</option>
              </select>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {product.frequency}
          </p>
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Duração do Tratamento
          </label>
          <div className="flex space-x-2">
            <div className="w-1/3">
              <input
                type="number"
                id="duration"
                name="duration"
                min="1"
                required
                value={product.duration}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div className="w-2/3">
              <select
                id="durationUnit"
                name="durationUnit"
                value={product.durationUnit}
                onChange={handleChange}
                className="input-field"
              >
                <option value="dias">Dias</option>
                <option value="semanas">Semanas</option>
                <option value="meses">Meses</option>
              </select>
            </div>
          </div>
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
        
        <div className="mb-4">
          <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700">
            Data de Término (Calculada)
          </label>
          <input
            type="datetime-local"
            id="endDateTime"
            name="endDateTime"
            readOnly
            value={product.endDateTime || ''}
            className="input-field bg-gray-100"
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
            type="button"
            onClick={handleSubmit}
            className="btn-primary"
          >
            {initialData ? 'Atualizar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
} 