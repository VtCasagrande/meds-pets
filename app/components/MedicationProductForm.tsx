'use client';

import React, { useState, useEffect } from "react";
import { MedicationProduct } from "@/app/types/types";

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
  initialData,
}: MedicationProductFormProps) {
  const [product, setProduct] = useState<MedicationProduct>({
    title: "",
    description: "",
    quantity: "",
    frequencyValue: 1,
    frequencyUnit: "day",
    startDateTime: "",
    endDateTime: "",
    dosage: "",
    dosageUnit: "mg",
  });

  useEffect(() => {
    if (initialData) {
      setProduct(initialData);
    }
  }, [initialData]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    // Impede o comportamento padrão do formulário (recarregar a página)
    e.preventDefault();
    
    // Impede a propagação do evento para formulários pais
    e.stopPropagation();
    
    // Validação de campos obrigatórios
    if (!product.title || !product.quantity || !product.frequencyValue || !product.startDateTime) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }
    
    onAdd(product);
  };

  return (
    <div className="border border-primary-light rounded-lg p-6 bg-white shadow-sm" onClick={(e) => e.stopPropagation()}>
      <h3 className="text-lg font-medium mb-4">Adicionar Medicamento</h3>
      
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label htmlFor="title" className="block text-dark-dark text-sm font-medium mb-2">
              Nome do Medicamento *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={product.title}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Nome do medicamento"
            />
          </div>
          
          <div>
            <label htmlFor="quantity" className="block text-dark-dark text-sm font-medium mb-2">
              Quantidade *
            </label>
            <input
              type="text"
              id="quantity"
              name="quantity"
              required
              value={product.quantity}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Ex: 1 comprimido, 10ml"
            />
          </div>
          
          <div>
            <label htmlFor="dosage" className="block text-dark-dark text-sm font-medium mb-2">
              Dosagem
            </label>
            <div className="flex">
              <input
                type="text"
                id="dosage"
                name="dosage"
                value={product.dosage}
                onChange={handleInputChange}
                className="input-field rounded-r-none flex-1"
                placeholder="Ex: 500"
              />
              <select
                name="dosageUnit"
                value={product.dosageUnit}
                onChange={handleInputChange}
                className="input-field rounded-l-none w-20 border-l-0"
              >
                <option value="mg">mg</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="mcg">mcg</option>
                <option value="UI">UI</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="frequencyValue" className="block text-dark-dark text-sm font-medium mb-2">
              Frequência *
            </label>
            <div className="flex">
              <input
                type="number"
                id="frequencyValue"
                name="frequencyValue"
                required
                min="1"
                value={product.frequencyValue}
                onChange={handleInputChange}
                className="input-field rounded-r-none w-20"
              />
              <select
                name="frequencyUnit"
                value={product.frequencyUnit}
                onChange={handleInputChange}
                className="input-field rounded-l-none flex-1 border-l-0"
              >
                <option value="hour">Hora(s)</option>
                <option value="day">Dia(s)</option>
                <option value="week">Semana(s)</option>
                <option value="month">Mês(es)</option>
              </select>
            </div>
          </div>
          
          <div>
            <label htmlFor="startDateTime" className="block text-dark-dark text-sm font-medium mb-2">
              Data/Hora de Início *
            </label>
            <input
              type="datetime-local"
              id="startDateTime"
              name="startDateTime"
              required
              value={product.startDateTime}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
          
          <div>
            <label htmlFor="endDateTime" className="block text-dark-dark text-sm font-medium mb-2">
              Data/Hora de Fim
            </label>
            <input
              type="datetime-local"
              id="endDateTime"
              name="endDateTime"
              value={product.endDateTime}
              onChange={handleInputChange}
              className="input-field"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="description" className="block text-dark-dark text-sm font-medium mb-2">
            Instruções
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={product.description}
            onChange={handleInputChange}
            className="input-field"
            placeholder="Instruções adicionais para administração"
          ></textarea>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            }}
            className="btn-outline"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {initialData ? 'Atualizar Medicamento' : 'Adicionar Medicamento'}
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