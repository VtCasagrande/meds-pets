'use client';

import { MedicationProduct } from '../lib/types';
import { useState, useEffect } from 'react';

interface MedicationProductFormProps {
  onAdd: (product: MedicationProduct) => void;
  onCancel: () => void;
  initialData?: MedicationProduct;
}

// Função para calcular a data de término com base na duração e frequência
function calculateEndDate(
  startDate: string, 
  duration: number, 
  durationUnit: string,
  frequencyValue: number,
  frequencyUnit: string
): string {
  console.log('Calculando data de término para:', startDate, duration, durationUnit, frequencyValue, frequencyUnit);
  
  // Converter a string de data para um objeto Date
  const startDateObj = new Date(startDate);
  
  // Primeiro calculamos a data de término baseada apenas na duração
  // Extrair os componentes da data manualmente
  const year = startDateObj.getFullYear();
  const month = startDateObj.getMonth();
  const day = startDateObj.getDate();
  const hours = startDateObj.getHours();
  const minutes = startDateObj.getMinutes();
  const seconds = startDateObj.getSeconds();
  
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
  
  // Criar o objeto Date final baseado apenas na duração
  const durationEndDateObj = new Date(endYear, endMonth, endDay, endHours, endMinutes, seconds);
  
  // Agora vamos calcular a data final com base na frequência do medicamento
  // (para garantir que termine após uma dose completa)
  
  // Calculando a duração total em milissegundos
  const durationMs = durationEndDateObj.getTime() - startDateObj.getTime();
  
  // Convertendo a frequência para milissegundos
  let frequencyMs = 0;
  switch(frequencyUnit) {
    case 'minutos':
      frequencyMs = frequencyValue * 60 * 1000;
      break;
    case 'horas':
      frequencyMs = frequencyValue * 60 * 60 * 1000;
      break;
    case 'dias':
      frequencyMs = frequencyValue * 24 * 60 * 60 * 1000;
      break;
  }
  
  // Calculando o número de doses completas que cabem no período
  const numberOfDoses = Math.floor(durationMs / frequencyMs);
  
  // Calculando quando seria a última dose completa
  const lastDoseTime = new Date(startDateObj.getTime() + (numberOfDoses * frequencyMs));
  
  // Usar a data da última dose completa como data final
  const finalEndDate = lastDoseTime;
  
  console.log('Data final baseada na duração:', durationEndDateObj.toISOString());
  console.log('Data final baseada nas doses completas:', finalEndDate.toISOString());
  
  // Extrair o ano, mês, dia, hora e minuto da data final
  const endDateString = finalEndDate.toISOString().slice(0, 16);
  console.log('String formatada final:', endDateString);
  
  return endDateString;
}

// Função para verificar se a última dose ficará fora do período de tratamento
function checkLastDose(startDate: string, endDate: string, frequencyValue: number, frequencyUnit: string): { 
  isLastDoseIncomplete: boolean, 
  message: string,
  lastDoseTime: Date
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Convertendo a frequência para milissegundos
  let frequencyMs = 0;
  switch(frequencyUnit) {
    case 'minutos':
      frequencyMs = frequencyValue * 60 * 1000;
      break;
    case 'horas':
      frequencyMs = frequencyValue * 60 * 60 * 1000;
      break;
    case 'dias':
      frequencyMs = frequencyValue * 24 * 60 * 60 * 1000;
      break;
  }
  
  // A próxima dose após a última dose completa
  const nextDoseTime = new Date(end.getTime() + frequencyMs);
  
  // Calcular quando seria a última dose baseada na frequência simples
  // partindo da data inicial e verificando se coincide com a data final
  const expectedDoses = Math.round((end.getTime() - start.getTime()) / frequencyMs);
  const expectedEndTime = new Date(start.getTime() + (expectedDoses * frequencyMs));
  
  // Verificar se a data final é aproximadamente igual à data esperada
  // (permitindo uma pequena margem para arredondamentos)
  const difference = Math.abs(expectedEndTime.getTime() - end.getTime());
  const isSignificantDifference = difference > (frequencyMs * 0.05);
  
  let message = '';
  if (isSignificantDifference) {
    message = `Nota: A próxima dose seria em ${nextDoseTime.toLocaleString('pt-BR')}.`;
  }
  
  return { 
    isLastDoseIncomplete: false,
    message, 
    lastDoseTime: end 
  };
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
  
  // Contador para forçar atualizações quando necessário
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Estado para armazenar informações sobre a última dose
  const [lastDoseInfo, setLastDoseInfo] = useState<{
    isLastDoseIncomplete: boolean;
    message: string;
    lastDoseTime?: Date;
  }>({
    isLastDoseIncomplete: false,
    message: ''
  });
  
  // Função para forçar recálculo da data final
  const forceRecalculation = () => {
    console.log('Forçando recálculo da data final...');
    setForceUpdate(prev => prev + 1);
  };

  // Calcular data de término quando a data de início, duração ou frequência mudar
  useEffect(() => {
    if (product.startDateTime && product.duration && product.durationUnit) {
      console.log('Recalculando data de término devido a mudanças em:', {
        startDateTime: product.startDateTime,
        duration: product.duration,
        durationUnit: product.durationUnit,
        frequencyValue: product.frequencyValue,
        frequencyUnit: product.frequencyUnit,
        forceUpdate
      });
      
      // Forçar recálculo ao alterar duração e frequência
      // Isso resolve o problema de estado do React que pode não detectar mudanças profundas
      const endDate = calculateEndDate(
        product.startDateTime, 
        product.duration, 
        product.durationUnit,
        product.frequencyValue,
        product.frequencyUnit
      );
      
      console.log('Nova data de término calculada:', endDate);
      setProduct(prev => {
        const updated = { ...prev, endDateTime: endDate };
        console.log('Novo estado do produto:', updated);
        return updated;
      });
    }
  }, [product.startDateTime, product.duration, product.durationUnit, forceUpdate]);

  // Atualizar o campo de frequência legado quando os novos campos mudarem
  useEffect(() => {
    const legacyFrequency = `A cada ${product.frequencyValue} ${product.frequencyUnit}`;
    setProduct(prev => ({ ...prev, frequency: legacyFrequency }));
  }, [product.frequencyValue, product.frequencyUnit]);
  
  // Verificar se a última dose ficará incompleta
  useEffect(() => {
    if (product.startDateTime && product.endDateTime && product.frequencyValue && product.frequencyUnit) {
      console.log('Verificando última dose para:', {
        start: product.startDateTime,
        end: product.endDateTime,
        frequencyValue: product.frequencyValue,
        frequencyUnit: product.frequencyUnit
      });
      
      const info = checkLastDose(
        product.startDateTime,
        product.endDateTime,
        product.frequencyValue,
        product.frequencyUnit
      );
      
      console.log('Resultado da verificação da última dose:', info);
      setLastDoseInfo(info);
    }
  }, [product.startDateTime, product.endDateTime, product.frequencyValue, product.frequencyUnit]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    setProduct((prev) => {
      // Converter valores numéricos
      if (name === 'frequencyValue' || name === 'duration') {
        return { ...prev, [name]: Number(value) };
      }
      
      // Se o campo alterado for relacionado à frequência, vamos garantir
      // que a data de término seja recalculada
      if (name === 'frequencyValue' || name === 'frequencyUnit') {
        // Programar um recálculo forçado
        setTimeout(() => forceRecalculation(), 0);
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
    
    // Garantir que a data final está atualizada antes de enviar
    const updatedEndDate = calculateEndDate(
      product.startDateTime, 
      product.duration, 
      product.durationUnit,
      product.frequencyValue,
      product.frequencyUnit
    );
    
    const finalProduct = {
      ...product,
      endDateTime: updatedEndDate
    };
    
    console.log('Enviando medicamento:', finalProduct);
    onAdd(finalProduct);
    
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
          {product.endDateTime && (
            <p className="text-sm text-gray-500 mt-1">
              Término: {new Date(product.endDateTime).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
          {lastDoseInfo.message && (
            <p className="text-sm text-blue-600 mt-1 font-medium border-l-2 border-blue-500 pl-2">
              {lastDoseInfo.message}
            </p>
          )}
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