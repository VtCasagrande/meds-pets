import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para o produto/medicamento
export interface IMedicationProduct {
  id?: string;
  title: string;
  quantity: string;
  frequency: string;
  // Novos campos para estruturar melhor a frequência
  frequencyValue?: number;
  frequencyUnit?: string;
  // Campos para duração do tratamento
  duration?: number;
  durationUnit?: string;
  startDateTime: Date;
  endDateTime?: Date;
}

// Interface para o Reminder
export interface IReminder extends Document {
  tutorName: string;
  petName: string;
  petBreed: string;
  phoneNumber: string;
  medicationProducts: IMedicationProduct[];
  isActive: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  createdBy?: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para o produto/medicamento
const MedicationProductSchema = new Schema({
  title: { type: String, required: true },
  quantity: { type: String, required: true },
  frequency: { type: String, required: true },
  // Novos campos para estruturar melhor a frequência
  frequencyValue: { type: Number, required: false },
  frequencyUnit: { type: String, required: false },
  // Campos para duração do tratamento
  duration: { type: Number, required: false },
  durationUnit: { type: String, required: false },
  startDateTime: { type: Date, required: true },
  endDateTime: { type: Date, required: false }
});

// Schema para o Reminder
const ReminderSchema = new Schema({
  tutorName: { type: String, required: true },
  petName: { type: String, required: true },
  petBreed: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  medicationProducts: [MedicationProductSchema],
  isActive: { type: Boolean, default: true },
  webhookUrl: { type: String, required: false },
  webhookSecret: { type: String, required: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Garantir que o modelo seja criado apenas uma vez
const Reminder: Model<IReminder> = mongoose.models.Reminder || 
  mongoose.model<IReminder>('Reminder', ReminderSchema);

export default Reminder; 