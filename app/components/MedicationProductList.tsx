'use client';

import { MedicationProduct } from '@/app/lib/types';

interface MedicationProductListProps {
  products: MedicationProduct[];
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
}

export default function MedicationProductList({
  products,
  onEdit,
  onDelete
}: MedicationProductListProps) {
  // Função para formatar a data
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Se não houver produtos, retorna uma mensagem
  if (products.length === 0) {
    return (
      <div className="bg-neutral/50 rounded-lg p-6 text-center border border-neutral-dark">
        <p className="text-dark-light">Nenhum medicamento adicionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {products.map((product, index) => (
        <div 
          key={index} 
          className="bg-white rounded-lg shadow-soft border border-neutral-dark overflow-hidden transition-shadow hover:shadow-card"
        >
          <div className="p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-lg font-medium text-primary-dark">
                {product.title}
              </h3>
              
              {/* Ações do medicamento */}
              {(onEdit || onDelete) && (
                <div className="flex space-x-2">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(index)}
                      className="text-secondary hover:text-secondary-dark transition-colors p-1"
                      title="Editar medicamento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  
                  {onDelete && (
                    <button
                      onClick={() => onDelete(index)}
                      className="text-accent hover:text-accent-dark transition-colors p-1"
                      title="Remover medicamento"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-dark mb-2">
                  <span className="font-medium">Dosagem:</span> {product.quantity}
                </p>
                <p className="text-dark mb-2">
                  <span className="font-medium">Frequência:</span> {product.frequency}
                </p>
                <p className="text-dark mb-2">
                  <span className="font-medium">Duração:</span> {product.duration} {product.durationUnit}
                </p>
              </div>
              
              <div>
                <p className="text-dark mb-2">
                  <span className="font-medium">Início:</span><br />
                  <span className="inline-block mt-1 bg-primary/10 text-primary-dark py-1 px-2 rounded font-medium">
                    {formatDate(product.startDateTime)}
                  </span>
                </p>
                
                {product.endDateTime && (
                  <p className="text-dark">
                    <span className="font-medium">Término:</span><br />
                    <span className="inline-block mt-1 bg-accent/10 text-accent-dark py-1 px-2 rounded font-medium">
                      {formatDate(product.endDateTime)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 