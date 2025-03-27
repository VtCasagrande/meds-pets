import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para o produto/medicamento
export interface IMedicationProduct {
  title: string;
  quantity: string;
  frequency: string;
  startDateTime: Date;
}

// Interface para o Reminder
export interface IReminder extends Document {
  tutorName: string;
  petName: string;
  petBreed: string;
  phoneNumber: string;
  medicationProducts: IMedicationProduct[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para o produto/medicamento
const MedicationProductSchema = new Schema({
  title: { type: String, required: true },
  quantity: { type: String, required: true },
  frequency: { type: String, required: true },
  startDateTime: { type: Date, required: true }
});

// Schema para o Reminder
const ReminderSchema = new Schema({
  tutorName: { type: String, required: true },
  petName: { type: String, required: true },
  petBreed: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  medicationProducts: [MedicationProductSchema],
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Garantir que o modelo seja criado apenas uma vez
const Reminder: Model<IReminder> = mongoose.models.Reminder || 
  mongoose.model<IReminder>('Reminder', ReminderSchema);

export default Reminder; 