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
    
    // Tratamento especial para campos numéricos
    if (name === 'frequencyValue' || name === 'duration') {
      const numValue = parseInt(value);
      setProduct({ ...product, [name]: isNaN(numValue) ? 0 : numValue });
      // Força recálculo após alterar valores importantes
      setTimeout(forceRecalculation, 100);
    } else {
      setProduct({ ...product, [name]: value });
      
      // Para os campos que afetam o cálculo das datas, forçar recálculo
      if (['frequencyUnit', 'durationUnit', 'startDateTime'].includes(name)) {
        setTimeout(forceRecalculation, 100);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Impedir o comportamento padrão de submissão do formulário
    onAdd(product);
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-xl mb-6">
        {initialData ? 'Editar Medicamento' : 'Adicionar Novo Medicamento'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nome do Medicamento */}
          <div className="col-span-2">
            <label className="block text-dark-dark text-sm font-medium mb-2" htmlFor="title">
              Nome do Medicamento
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={product.title}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: Amoxicilina, Vermífugo, etc."
              required
            />
          </div>
          
          {/* Quantidade/Dosagem */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-dark-dark text-sm font-medium mb-2" htmlFor="quantity">
              Dosagem
            </label>
            <input
              type="text"
              id="quantity"
              name="quantity"
              value={product.quantity}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: 1 comprimido, 5ml, etc."
              required
            />
          </div>
          
          {/* Frequência - Novo formato com dois campos */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-dark-dark text-sm font-medium mb-2">
              Frequência
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  name="frequencyValue"
                  value={product.frequencyValue}
                  onChange={handleChange}
                  className="input-field"
                  min="1"
                  required
                />
              </div>
              <div className="w-1/2">
                <select
                  name="frequencyUnit"
                  value={product.frequencyUnit}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="horas">horas</option>
                  <option value="dias">dias</option>
                  <option value="minutos">minutos</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-dark-light mt-1">
              Ex: A cada 8 horas, a cada 12 horas, etc.
            </p>
          </div>
          
          {/* Data e hora de início */}
          <div>
            <label className="block text-dark-dark text-sm font-medium mb-2" htmlFor="startDateTime">
              Data e Hora de Início
            </label>
            <input
              type="datetime-local"
              id="startDateTime"
              name="startDateTime"
              value={product.startDateTime}
              onChange={handleChange}
              className="input-field"
              required
            />
          </div>
          
          {/* Duração - Novo formato com dois campos */}
          <div>
            <label className="block text-dark-dark text-sm font-medium mb-2">
              Duração do Tratamento
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <input
                  type="number"
                  name="duration"
                  value={product.duration}
                  onChange={handleChange}
                  className="input-field"
                  min="1"
                  required
                />
              </div>
              <div className="w-1/2">
                <select
                  name="durationUnit"
                  value={product.durationUnit}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="dias">dias</option>
                  <option value="semanas">semanas</option>
                  <option value="meses">meses</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Data calculada de término */}
          <div className="col-span-2">
            <label className="block text-dark-dark text-sm font-medium mb-2" htmlFor="endDateTime">
              Data e Hora de Término (calculada automaticamente)
            </label>
            <input
              type="datetime-local"
              id="endDateTime"
              name="endDateTime"
              value={product.endDateTime}
              className="input-field bg-neutral-dark/10 cursor-not-allowed"
              disabled
            />
            {lastDoseInfo.message && (
              <p className="text-xs text-accent-dark mt-1">{lastDoseInfo.message}</p>
            )}
          </div>
        </div>
        
        {/* Visualização de doses */}
        {product.startDateTime && product.endDateTime && (
          <div className="bg-neutral/50 p-4 rounded-lg mt-6 border border-neutral-dark">
            <h4 className="font-medium text-sm mb-2">Informações sobre as doses</h4>
            <MedicationDoseSchedule product={product} />
          </div>
        )}
        
        {/* Botões de ação */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-dark mt-6">
          <button 
            type="button" 
            onClick={onCancel}
            className="btn-outline"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            className="btn-primary"
          >
            {initialData ? 'Atualizar' : 'Adicionar'} Medicamento
          </button>
        </div>
      </form>
    </div>
  );
}

// Componente para mostrar um preview das doses do medicamento
function MedicationDoseSchedule({ product }: { product: MedicationProduct }) {
  const { startDateTime, endDateTime, frequencyValue, frequencyUnit } = product;
  const [doses, setDoses] = useState<Date[]>([]);
  
  useEffect(() => {
    if (startDateTime && endDateTime && frequencyValue) {
      // Calcular as doses entre o início e o fim
      const start = new Date(startDateTime);
      const end = new Date(endDateTime);
      
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
      
      // Gerar array com as datas das doses
      const doseArray: Date[] = [];
      let currentDose = new Date(start);
      
      while (currentDose <= end) {
        doseArray.push(new Date(currentDose));
        currentDose = new Date(currentDose.getTime() + frequencyMs);
      }
      
      // Limitar a 10 doses para visualização
      setDoses(doseArray.slice(0, 10));
    }
  }, [startDateTime, endDateTime, frequencyValue, frequencyUnit]);
  
  // Formatar data para exibição
  const formatDateDisplay = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Exibir próximas doses
  return (
    <div>
      <p className="text-xs text-dark-light mb-2">
        {doses.length > 0 
          ? `Mostrando ${doses.length} ${doses.length === 1 ? 'dose' : 'doses'}${doses.length === 10 ? ' (primeiras 10)' : ''}`
          : 'Sem doses para mostrar'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {doses.map((dose, index) => (
          <div key={index} className="text-xs bg-white p-2 rounded border border-neutral-dark">
            <span className="font-medium text-primary-dark">
              Dose {index + 1}:
            </span>{' '}
            {formatDateDisplay(dose)}
          </div>
        ))}
      </div>
      {doses.length === 10 && (
        <p className="text-xs text-accent-dark mt-2">Existem mais doses. São exibidas apenas as 10 primeiras.</p>
      )}
    </div>
  );
} 