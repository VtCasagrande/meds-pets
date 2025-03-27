'use client';

import { Reminder } from '../lib/types';
import { formatDate, formatRelativeDate } from '../lib/dateUtils';
import Link from 'next/link';

interface ReminderCardProps {
  reminder: Reminder;
}

export default function ReminderCard({ reminder }: ReminderCardProps) {
  const statusClass = reminder.isActive 
    ? 'bg-green-100 text-green-800' 
    : 'bg-gray-100 text-gray-800';
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold">{reminder.petName}</h3>
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusClass}`}>
            {reminder.isActive ? 'Ativo' : 'Finalizado'}
          </span>
        </div>
        
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Tutor:</span> {reminder.tutorName}</p>
          <p><span className="font-medium">Raça:</span> {reminder.petBreed}</p>
          <p><span className="font-medium">Telefone:</span> {reminder.phoneNumber}</p>
          
          <div className="mt-3">
            <p className="font-medium mb-1">Medicamentos:</p>
            <ul className="list-disc pl-5 space-y-1">
              {reminder.medicationProducts.map((product, index) => (
                <li key={index}>
                  <div className="font-medium">{product.title}</div>
                  <div className="text-xs text-gray-600">
                    Quantidade: {product.quantity} | 
                    Frequência: {product.frequency} | 
                    Início: {formatDate(product.startDateTime)}
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {reminder.createdAt && (
            <p className="text-xs text-gray-500 mt-2">
              Criado {formatRelativeDate(reminder.createdAt)}
            </p>
          )}
        </div>
      </div>
      
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <Link 
          href={`/reminders/${reminder.id}`} 
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
} 