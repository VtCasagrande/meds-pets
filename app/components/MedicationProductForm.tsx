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
  durationUnit: string
): string {
  console.log('Calculando data de término para:', startDate, duration, durationUnit);
  
  // Converter a string de data para um objeto Date
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

// Função para verificar se a última dose ficará fora do período de tratamento
function checkLastDose(startDate: string, endDate: string, frequencyValue: number, frequencyUnit: string): { 
  isLastDoseIncomplete: boolean, 
  message: string,
  lastDoseTime: Date
} {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculando a duração total em milissegundos
  const durationMs = end.getTime() - start.getTime();
  
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
  const lastDoseTime = new Date(start.getTime() + (numberOfDoses * frequencyMs));
  
  // Verificando se a última dose ficaria muito próxima do final do tratamento
  // ou se o período termina logo após uma dose
  const timeLeftPercentage = ((end.getTime() - lastDoseTime.getTime()) / frequencyMs) * 100;
  const isLastDoseIncomplete = timeLeftPercentage < 90 && timeLeftPercentage > 5;
  
  let message = '';
  if (isLastDoseIncomplete) {
    message = `Atenção: A última dose ficará incompleta (${timeLeftPercentage.toFixed(0)}% do intervalo). A última dose completa será em ${lastDoseTime.toLocaleString('pt-BR')}.`;
  }
  
  return { isLastDoseIncomplete, message, lastDoseTime };
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
        product.durationUnit
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
      product.durationUnit
    );
    
    const finalProduct = {
      ...product,
      endDateTime: updatedEndDate
    };
    
    // Recalcular a verificação da última dose
    const lastDoseCheck = checkLastDose(
      finalProduct.startDateTime,
      finalProduct.endDateTime,
      finalProduct.frequencyValue,
      finalProduct.frequencyUnit
    );
    
    // Se a última dose for incompleta, perguntar ao usuário se deseja continuar
    if (lastDoseCheck.isLastDoseIncomplete) {
      const confirmContinue = confirm(
        `${lastDoseCheck.message}\n\nDeseja continuar mesmo assim ou ajustar a duração do tratamento?`
      );
      
      if (!confirmContinue) {
        return;
      }
    }
    
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
          {lastDoseInfo.isLastDoseIncomplete && (
            <p className="text-sm text-amber-600 mt-1 font-medium border-l-2 border-amber-500 pl-2">
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