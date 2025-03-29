// Representação do produto/medicamento para os formulários e API
export type MedicationProduct = {
  id?: string;
  title: string;
  description?: string; // Instruções ou notas adicionais
  quantity: string;
  dosage?: string; // Valor da dosagem
  dosageUnit?: string; // Unidade da dosagem (mg, g, ml, etc)
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
  webhookUrl?: string;
  webhookSecret?: string;
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
    frequencyUnit: 'minutos' | 'horas' | 'dias';
    duration: number;
    durationUnit: 'dias' | 'semanas' | 'meses';
    startDateTime: string;
    endDateTime?: string;
  }
}

// Tipos para usuários e autenticação
export type UserRole = 'admin' | 'user';

export type User = {
  id?: string;
  _id?: string; // ID do MongoDB
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type LoginCredentials = {
  email: string;
  password: string;
}

export type RegisterData = {
  name: string;
  email: string;
  password: string;
}

export type AuthResult = {
  success: boolean;
  message: string;
  user?: User;
} 