'use client';

import { Reminder } from '../lib/types';
import { formatDate, formatRelativeDate } from '../lib/dateUtils';
import Link from 'next/link';

interface ReminderCardProps {
  reminder: Reminder;
}

export default function ReminderCard({ reminder }: ReminderCardProps) {
  const statusClass = reminder.isActive 
    ? 'bg-primary-light/20 text-primary-dark' 
    : 'bg-neutral-dark/20 text-dark';
  
  return (
    <div className="card hover:shadow-card transition-shadow">
      <div className="mb-4">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold">{reminder.petName}</h3>
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${statusClass}`}>
            {reminder.isActive ? 'Ativo' : 'Finalizado'}
          </span>
        </div>
        
        <div className="space-y-3 text-sm">
          <p className="flex items-center">
            <span className="font-medium w-20">Tutor:</span> 
            <span>{reminder.tutorName}</span>
          </p>
          <p className="flex items-center">
            <span className="font-medium w-20">Raça:</span> 
            <span>{reminder.petBreed}</span>
          </p>
          <p className="flex items-center">
            <span className="font-medium w-20">Telefone:</span> 
            <span>{reminder.phoneNumber}</span>
          </p>
          
          <div className="mt-4">
            <p className="font-medium mb-2">Medicamentos:</p>
            <ul className="space-y-3">
              {reminder.medicationProducts.map((product, index) => (
                <li key={index} className="bg-neutral/50 p-3 rounded-lg">
                  <div className="font-medium text-primary-dark">{product.title}</div>
                  <div className="text-xs text-dark-light mt-1 space-y-1">
                    <div><span className="font-medium">Quantidade:</span> {product.quantity}</div>
                    <div><span className="font-medium">Frequência:</span> {product.frequency}</div>
                    <div><span className="font-medium">Início:</span> {formatDate(product.startDateTime)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          
          {reminder.createdAt && (
            <p className="text-xs text-dark-light mt-3">
              Criado {formatRelativeDate(reminder.createdAt)}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-auto pt-3 border-t border-neutral-dark flex justify-end">
        <Link 
          href={`/reminders/${reminder._id || reminder.id}`} 
          className="btn-primary text-xs px-3 py-1"
        >
          Ver detalhes
        </Link>
      </div>
    </div>
  );
} 