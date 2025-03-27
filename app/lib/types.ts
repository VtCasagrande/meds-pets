// Representação do produto/medicamento para os formulários e API
export type MedicationProduct = {
  id?: string;
  title: string;
  quantity: string;
  frequency: string;
  startDateTime: string; // ISO string para formulários
}

// Representação do lembrete para os formulários e API
export type Reminder = {
  id?: string;
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
export type WebhookPayload = {
  reminderId: string;
  tutorName: string;
  petName: string;
  phoneNumber: string;
  medicationProduct: {
    title: string;
    quantity: string;
  }
} 