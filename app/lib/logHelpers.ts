import { NextRequest } from 'next/server';
import { logActivity } from './services/auditLogService';
import { IReminder } from './models/Reminder';

/**
 * Registra um log de auditoria para ações de login
 */
export async function logLogin(userId: string, email: string, request?: NextRequest) {
  await logActivity({
    action: 'login',
    entity: 'user',
    entityId: userId,
    description: `Login no sistema por ${email}`,
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para ações de logout
 */
export async function logLogout(userId: string, email: string, request?: NextRequest) {
  await logActivity({
    action: 'logout',
    entity: 'user',
    entityId: userId,
    description: `Logout do sistema por ${email}`,
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para ações de registro
 */
export async function logRegister(userId: string, email: string, request?: NextRequest) {
  await logActivity({
    action: 'register',
    entity: 'user',
    entityId: userId,
    description: `Novo usuário registrado: ${email}`,
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para ações de criação de lembrete
 */
export async function logReminderCreation(reminder: IReminder, userId: string, email: string, request?: NextRequest) {
  const reminderId = reminder.id || reminder._id;
  await logActivity({
    action: 'create',
    entity: 'reminder',
    entityId: reminderId?.toString(),
    description: `Lembrete criado para ${reminder.petName} (${reminder.tutorName})`,
    details: {
      tutorName: reminder.tutorName,
      petName: reminder.petName,
      petBreed: reminder.petBreed,
      phoneNumber: reminder.phoneNumber,
      medicationCount: reminder.medicationProducts.length,
      isActive: reminder.isActive
    },
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para ações de atualização de lembrete
 */
export async function logReminderUpdate(
  reminder: IReminder, 
  oldData: any, 
  userId: string, 
  email: string, 
  request?: NextRequest
) {
  const reminderId = reminder.id || reminder._id;
  await logActivity({
    action: 'update',
    entity: 'reminder',
    entityId: reminderId?.toString(),
    description: `Lembrete atualizado para ${reminder.petName} (${reminder.tutorName})`,
    details: {
      current: {
        tutorName: reminder.tutorName,
        petName: reminder.petName,
        petBreed: reminder.petBreed,
        phoneNumber: reminder.phoneNumber,
        medicationCount: reminder.medicationProducts.length,
        isActive: reminder.isActive
      },
      previous: oldData
    },
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para ações de exclusão de lembrete
 */
export async function logReminderDeletion(
  reminder: IReminder, 
  userId: string, 
  email: string, 
  request?: NextRequest
) {
  const reminderId = reminder.id || reminder._id;
  await logActivity({
    action: 'delete',
    entity: 'reminder',
    entityId: reminderId?.toString(),
    description: `Lembrete excluído para ${reminder.petName} (${reminder.tutorName})`,
    details: {
      tutorName: reminder.tutorName,
      petName: reminder.petName,
      petBreed: reminder.petBreed,
      phoneNumber: reminder.phoneNumber,
      medicationCount: reminder.medicationProducts.length
    },
    performedBy: userId,
    performedByEmail: email,
    request
  });
}

/**
 * Registra um log de auditoria para alterações de permissão de usuário
 */
export async function logPermissionChange(
  targetUserId: string, 
  targetEmail: string, 
  oldRole: string, 
  newRole: string, 
  performedByUserId: string, 
  performedByEmail: string, 
  request?: NextRequest
) {
  await logActivity({
    action: 'update',
    entity: 'user',
    entityId: targetUserId,
    description: `Alteração de permissão de "${oldRole}" para "${newRole}" para usuário ${targetEmail}`,
    details: {
      oldRole,
      newRole
    },
    performedBy: performedByUserId,
    performedByEmail: performedByEmail,
    request
  });
}

/**
 * Registra um log de auditoria para ações em webhooks
 */
export async function logWebhookAction(
  action: 'create' | 'update' | 'delete',
  reminderId: string,
  webhookUrl: string,
  tutorName: string,
  petName: string,
  userId: string,
  email: string,
  request?: NextRequest
) {
  let description = '';
  
  switch (action) {
    case 'create':
      description = `Webhook criado para o lembrete de ${petName} (${tutorName})`;
      break;
    case 'update':
      description = `Webhook atualizado para o lembrete de ${petName} (${tutorName})`;
      break;
    case 'delete':
      description = `Webhook removido para o lembrete de ${petName} (${tutorName})`;
      break;
  }
  
  await logActivity({
    action,
    entity: 'webhook',
    entityId: reminderId,
    description,
    details: {
      webhookUrl,
      tutorName,
      petName
    },
    performedBy: userId,
    performedByEmail: email,
    request
  });
} 