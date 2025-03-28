// Representação do produto/medicamento para os formulários e API
export type MedicationProduct = {
  id?: string;
  title: string;
  quantity: string;
  frequency: string; // Campo legado
  // Novos campos para estruturar melhor a frequência
  frequencyValue: number;
  frequencyUnit: 'minutos' | 'horas' | 'dias';
  // Campos para duração do tratamento
  duration: number;
  durationUnit: 'dias' | 'semanas' | 'meses';
  startDateTime: string; // ISO string para formulários
  endDateTime?: string; // Data de término calculada
}

// Representação do lembrete para os formulários e API
export type Reminder = {
  id?: string;
  _id?: string; // ID do MongoDB
  tutorName: string;
  petName: string;
  petBreed: string;
  phoneNumber: string;
  medicationProducts: MedicationProduct[];
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Estado da listagem de lembretes
export type RemindersState = {
  activeReminders: Reminder[];
  completedReminders: Reminder[];
}

// Tipos para webhooks
export type WebhookEventType = 'reminder_created' | 'reminder_updated' | 'reminder_notification' | 'reminder_finished' | 'reminder_deactivated' | 'reminder_deleted' | 'reminder_activated';

export type WebhookPayload = {
  reminderId: string;
  tutorName: string;
  petName: string;
  petBreed: string;
  phoneNumber: string;
  eventType: WebhookEventType;
  eventDescription: string;
  medicationProduct: {
    title: string;
    quantity: string;
    frequencyValue: number;
    frequencyUnit: string;
    duration: number;
    durationUnit: string;
    startDateTime: string;
    endDateTime?: string;
  }
} 