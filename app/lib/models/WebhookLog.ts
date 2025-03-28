import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface para o log de webhook
export interface IWebhookLog extends Document {
  reminderId: string;
  eventType: string;
  eventDescription: string;
  payload: object;
  statusCode: number;
  response: string;
  success: boolean;
  createdAt: Date;
}

// Schema para o log de webhook
const WebhookLogSchema = new Schema({
  reminderId: { type: String, required: true, index: true },
  eventType: { type: String, required: true, index: true },
  eventDescription: { type: String, required: true },
  payload: { type: Object, required: true },
  statusCode: { type: Number, required: true },
  response: { type: String },
  success: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Garantir que o modelo seja criado apenas uma vez
const WebhookLog: Model<IWebhookLog> = mongoose.models.WebhookLog || 
  mongoose.model<IWebhookLog>('WebhookLog', WebhookLogSchema);

export default WebhookLog; 