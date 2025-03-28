import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLog extends Document {
  action: string; // Tipo de ação: create, update, delete, etc.
  entity: string; // Entidade afetada: reminder, user, etc.
  entityId?: string; // ID da entidade afetada (opcional)
  description: string; // Descrição da ação
  details?: any; // Detalhes adicionais (opcional, pode conter estado anterior e novo)
  performedBy?: Schema.Types.ObjectId; // Referência ao usuário que realizou a ação
  performedByEmail?: string; // Email do usuário que realizou a ação
  createdAt: Date; // Data e hora da ação
  ipAddress?: string; // Endereço IP de onde a ação foi realizada
  userAgent?: string; // User-Agent do navegador/cliente
}

const AuditLogSchema = new Schema({
  action: { 
    type: String, 
    required: true,
    enum: ['create', 'update', 'delete', 'login', 'logout', 'register', 'other']
  },
  entity: { 
    type: String, 
    required: true,
    enum: ['reminder', 'user', 'webhook', 'webhook_log', 'scheduler', 'audit_log', 'system', 'other']
  },
  entityId: { 
    type: String, 
    required: false
  },
  description: { 
    type: String, 
    required: true 
  },
  details: { 
    type: Schema.Types.Mixed, 
    required: false 
  },
  performedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  performedByEmail: { 
    type: String, 
    required: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  ipAddress: { 
    type: String, 
    required: false 
  },
  userAgent: { 
    type: String, 
    required: false 
  }
});

// Criar índices para melhorar a performance nas consultas mais comuns
AuditLogSchema.index({ createdAt: -1 }); // Ordenar por data mais recente
AuditLogSchema.index({ entity: 1, entityId: 1 }); // Buscar por entidade específica
AuditLogSchema.index({ performedBy: 1 }); // Buscar por usuário
AuditLogSchema.index({ performedByEmail: 1 }); // Buscar por email

// Garantir que o modelo seja criado apenas uma vez
const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || 
  mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog; 