'use client';

import { MedicationProduct } from '../lib/types';
import { formatDate } from '../lib/dateUtils';

interface MedicationProductListProps {
  products: MedicationProduct[];
  onEdit?: (index: number) => void;
  onDelete?: (index: number) => void;
  isEditable?: boolean;
}

export default function MedicationProductList({
  products,
  onEdit,
  onDelete,
  isEditable = false
}: MedicationProductListProps) {
  if (products.length === 0) {
    return (
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Nenhum medicamento adicionado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((product, index) => (
        <div 
          key={index}
          className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium">{product.title}</h4>
              <div className="text-sm text-gray-600 space-y-1 mt-1">
                <p>Quantidade: {product.quantity}</p>
                <p>Frequência: {product.frequency}</p>
                <p>Início: {formatDate(product.startDateTime)}</p>
              </div>
            </div>
            
            {isEditable && (
              <div className="flex space-x-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(index)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Editar"
                  >
                    Editar
                  </button>
                )}
                
                {onDelete && (
                  <button
                    onClick={() => onDelete(index)}
                    className="text-red-600 hover:text-red-800"
                    title="Remover"
                  >
                    Remover
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
} 