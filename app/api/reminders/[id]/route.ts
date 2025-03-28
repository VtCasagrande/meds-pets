import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload } from '@/app/lib/types';
import { Types } from 'mongoose';

// Importar funções do schedulerService apenas em ambiente Node.js
let scheduleReminderNotifications: (reminder: any, webhookUrl?: string, webhookSecret?: string) => Promise<void> = 
  async () => { console.log('Ambiente não suportado para agendamento'); };
let removeReminderNotifications: (reminderId: string) => void = 
  () => { console.log('Ambiente não suportado para remover notificações'); };

// Verificar se estamos em ambiente Node.js (não Edge)
if (typeof window === 'undefined' && typeof process !== 'undefined' &&
    process.env.NEXT_RUNTIME !== 'edge') {
  // Importação dinâmica para evitar problemas no Edge Runtime
  import('@/app/lib/services/schedulerService').then(module => {
    scheduleReminderNotifications = module.scheduleReminderNotifications;
    removeReminderNotifications = module.removeReminderNotifications;
  }).catch(err => {
    console.error('Erro ao importar serviço de agendamento:', err);
  });
}

// Função auxiliar para enviar webhook
async function sendWebhook(payload: WebhookPayload, webhookUrl?: string, webhookSecret?: string) {
  // Se não temos URL, não enviamos webhook
  if (!webhookUrl) {
    console.log('Nenhuma URL de webhook configurada, pulando envio');
    return null;
  }
  
  console.log(`Iniciando envio de webhook (${payload.eventType}) para URL: ${webhookUrl}`);
  console.log(`Payload do webhook: ${JSON.stringify(payload)}`);
  
  try {
    // Configurar headers para incluir a chave secreta, se fornecida
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
      console.log('Header X-Webhook-Secret configurado');
    }
    
    // Enviar o webhook para a URL configurada
    console.log(`Enviando requisição POST para ${webhookUrl}...`);
    const startTime = Date.now();
    
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    const responseStatus = webhookResponse.status;
    console.log(`Resposta do webhook: status ${responseStatus}, tempo: ${duration}ms`);
    
    let responseData;
    let responseText = '';
    
    try {
      responseText = await webhookResponse.text();
      console.log(`Texto da resposta: ${responseText}`);
      
      try {
        responseData = JSON.parse(responseText);
        console.log('Dados da resposta:', responseData);
      } catch (e) {
        console.log('Não foi possível obter dados JSON da resposta');
        responseData = { status: responseStatus };
      }
    } catch (e) {
      console.log('Não foi possível obter texto da resposta');
      responseText = 'Erro ao obter resposta';
      responseData = { status: responseStatus };
    }
    
    const success = responseStatus >= 200 && responseStatus < 300;
    
    // Registrar o log no banco de dados
    try {
      // Importar modelo do Mongoose dinamicamente
      console.log('Importando modelo WebhookLog...');
      const WebhookLogModel = (await import('@/app/lib/models/WebhookLog')).default;
      console.log('Modelo WebhookLog importado com sucesso');
      
      // Criar registro de log
      console.log('Criando registro de log no banco de dados...');
      const logEntry = await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: responseStatus,
        response: responseText.substring(0, 1000), // Limitar tamanho da resposta
        success: success,
        createdAt: new Date()
      });
      
      console.log(`Log de webhook ${payload.eventType} registrado com sucesso. ID: ${logEntry._id}`);
      
      // Verificar se o log foi realmente salvo
      const savedLog = await WebhookLogModel.findById(logEntry._id);
      console.log(`Verificação de log salvo: ${savedLog ? 'encontrado' : 'não encontrado'}`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return responseData;
  } catch (error) {
    console.error(`ERRO ao enviar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'Sem stack trace');
    
    // Registrar erro no banco de dados
    try {
      // Importar modelo do Mongoose dinamicamente
      console.log('Importando modelo WebhookLog para registro de erro...');
      const WebhookLogModel = (await import('@/app/lib/models/WebhookLog')).default;
      
      // Criar registro de log de erro
      console.log('Criando registro de log de erro no banco de dados...');
      const logEntry = await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: 0,
        response: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false,
        createdAt: new Date()
      });
      
      console.log(`Log de erro de webhook registrado. ID: ${logEntry._id}`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return null;
  }
}

// GET /api/reminders/[id] - Obter detalhes de um lembrete
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`GET /api/reminders/${id} - Buscando detalhes do lembrete`);
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Buscando lembrete com ID: ${id}`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Lembrete encontrado: ${reminder._id}`);
    return NextResponse.json(reminder);
  } catch (error) {
    console.error(`Erro ao buscar detalhes do lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes do lembrete' },
      { status: 500 }
    );
  }
}

// PUT /api/reminders/[id] - Atualizar um lembrete
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`PUT /api/reminders/${id} - Atualizando lembrete`);
  
  try {
    const body = await request.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));
    
    // Extrair a URL e chave secreta do webhook, se fornecidas
    // Ou usar as configurações de ambiente como fallback
    let webhookUrl = body.webhookUrl || process.env.WEBHOOK_URL || '';
    const webhookSecret = body.webhookSecret || process.env.WEBHOOK_SECRET || '';
    
    // Se não houver URL configurada, usar uma URL de teste do webhook.site para depuração
    if (!webhookUrl) {
      webhookUrl = 'https://webhook.site/2183e9be-ce1f-400d-bd28-c589a1938b44';
      console.log(`Usando URL de webhook de teste: ${webhookUrl}`);
    }
    
    console.log(`Variáveis de ambiente para webhook:
    - process.env.WEBHOOK_URL: ${process.env.WEBHOOK_URL ? 'definida' : 'não definida'}
    - process.env.WEBHOOK_SECRET: ${process.env.WEBHOOK_SECRET ? 'definido' : 'não definido'}`);
    
    console.log(`Configurações de webhook - URL: ${webhookUrl ? webhookUrl : 'não definida'}, Secret: ${webhookSecret ? 'configurado' : 'não configurado'}`);
    
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Verificando se o lembrete ${id} existe`);
    const existingReminder = await Reminder.findById(id);
    
    if (!existingReminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o lembrete foi desativado ou reativado
    const wasStatusChanged = existingReminder.isActive !== body.isActive;
    const actionType = body.isActive ? 'reminder_activated' : 'reminder_deactivated';
    const actionDescription = body.isActive 
      ? `Lembrete para ${body.petName} foi reativado` 
      : `Lembrete para ${body.petName} foi desativado`;
    
    console.log(`Status do lembrete ${wasStatusChanged ? 'foi alterado' : 'não foi alterado'}: ${existingReminder.isActive ? 'ativo' : 'inativo'} -> ${body.isActive ? 'ativo' : 'inativo'}`);
    
    // Remover campos do webhook dos dados do lembrete
    const reminderData = { ...body };
    delete reminderData.webhookUrl;
    delete reminderData.webhookSecret;
    
    // Remover agendamentos existentes
    console.log(`Removendo agendamentos existentes para lembrete ${id}...`);
    removeReminderNotifications(id);
    
    // Atualizar dados
    console.log(`Atualizando lembrete ${id}...`);
    const updatedReminder = await Reminder.findByIdAndUpdate(
      id,
      { ...reminderData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    console.log(`Lembrete ${id} atualizado com sucesso`);
    
    // Enviar webhook para o primeiro medicamento (atualização de lembrete)
    if (updatedReminder && updatedReminder.medicationProducts.length > 0) {
      const firstProduct = updatedReminder.medicationProducts[0];
      
      // Determinar o tipo de evento baseado na mudança de status
      let eventType: 'reminder_updated' | 'reminder_activated' | 'reminder_deactivated';
      let eventDescription: string;
      
      if (wasStatusChanged) {
        eventType = actionType as 'reminder_activated' | 'reminder_deactivated';
        eventDescription = actionDescription;
      } else {
        eventType = 'reminder_updated';
        eventDescription = 'Lembrete atualizado';
      }
      
      console.log(`Tipo de evento webhook: ${eventType}, descrição: ${eventDescription}`);
      
      // Preparar payload do webhook
      const webhookPayload: WebhookPayload = {
        reminderId: updatedReminder._id ? (updatedReminder._id instanceof Types.ObjectId ? updatedReminder._id.toString() : String(updatedReminder._id)) : id,
        tutorName: updatedReminder.tutorName,
        petName: updatedReminder.petName,
        petBreed: updatedReminder.petBreed || '',
        phoneNumber: updatedReminder.phoneNumber,
        eventType: eventType,
        eventDescription: eventDescription,
        medicationProduct: {
          title: firstProduct.title,
          quantity: firstProduct.quantity,
          frequencyValue: firstProduct.frequencyValue || 0,
          frequencyUnit: (firstProduct.frequencyUnit as 'minutos' | 'horas' | 'dias') || 'horas',
          duration: firstProduct.duration || 0,
          durationUnit: (firstProduct.durationUnit as 'dias' | 'semanas' | 'meses') || 'dias',
          startDateTime: firstProduct.startDateTime ? firstProduct.startDateTime.toISOString() : '',
          endDateTime: firstProduct.endDateTime ? firstProduct.endDateTime.toISOString() : ''
        }
      };
      
      // Enviar webhook de atualização
      await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
    }
    
    // Reagendar notificações se o lembrete estiver ativo
    if (updatedReminder && updatedReminder.isActive) {
      console.log(`Reagendando notificações para lembrete ${id}...`);
      await scheduleReminderNotifications(updatedReminder, webhookUrl, webhookSecret);
    }
    
    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error(`Erro ao atualizar lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar lembrete' },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[id] - Remover um lembrete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`DELETE /api/reminders/${id} - Removendo lembrete`);
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Verificando se o lembrete ${id} existe`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    // Remover agendamentos existentes antes de excluir o lembrete
    console.log(`Removendo agendamentos para lembrete ${id}...`);
    removeReminderNotifications(id);
    
    // Enviar webhook de exclusão
    console.log(`Enviando webhook para notificar exclusão do lembrete ${id}...`);
    
    // Obter configurações de webhook
    const webhookUrl = process.env.WEBHOOK_URL || '';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    
    if (webhookUrl) {
      // Caso seja necessário enviar webhook de exclusão
      const firstProduct = reminder.medicationProducts && reminder.medicationProducts.length > 0 
        ? reminder.medicationProducts[0] 
        : null;
      
      if (firstProduct) {
        const webhookPayload: WebhookPayload = {
          reminderId: id,
          tutorName: reminder.tutorName,
          petName: reminder.petName,
          petBreed: reminder.petBreed || '',
          phoneNumber: reminder.phoneNumber,
          eventType: 'reminder_deleted',
          eventDescription: `Lembrete para ${reminder.petName} foi excluído`,
          medicationProduct: {
            title: firstProduct.title,
            quantity: firstProduct.quantity,
            frequencyValue: firstProduct.frequencyValue || 0,
            frequencyUnit: (firstProduct.frequencyUnit as 'minutos' | 'horas' | 'dias') || 'horas',
            duration: firstProduct.duration || 0,
            durationUnit: (firstProduct.durationUnit as 'dias' | 'semanas' | 'meses') || 'dias',
            startDateTime: firstProduct.startDateTime ? firstProduct.startDateTime.toISOString() : '',
            endDateTime: firstProduct.endDateTime ? firstProduct.endDateTime.toISOString() : ''
          }
        };
        
        await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
      }
    }
    
    console.log(`Excluindo lembrete ${id}...`);
    await Reminder.findByIdAndDelete(id);
    
    console.log(`Lembrete ${id} excluído com sucesso`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Erro ao remover lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao remover lembrete' },
      { status: 500 }
    );
  }
} 