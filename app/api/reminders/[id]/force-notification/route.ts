import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload } from '@/app/lib/types';
import { removeReminderNotifications } from '@/app/lib/services/schedulerService';

// Função auxiliar para enviar webhook
async function sendWebhook(payload: WebhookPayload, webhookUrl?: string, webhookSecret?: string) {
  // Se não temos URL, não enviamos webhook
  if (!webhookUrl) {
    console.log('Nenhuma URL de webhook configurada, usando URL de teste');
    webhookUrl = 'https://webhook.site/2183e9be-ce1f-400d-bd28-c589a1938b44';
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

// POST /api/reminders/[id]/force-notification - Forçar uma notificação imediata e agendar a próxima
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`POST /api/reminders/${id}/force-notification - Forçando notificação e reagendando`);
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Buscar lembrete
    console.log(`Buscando lembrete com ID: ${id}`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    if (!reminder.isActive) {
      console.log(`Lembrete com ID ${id} não está ativo`);
      return NextResponse.json(
        { error: 'Não é possível enviar notificação para um lembrete inativo' },
        { status: 400 }
      );
    }
    
    // Verificar se há produtos de medicação
    if (!reminder.medicationProducts || reminder.medicationProducts.length === 0) {
      console.log(`Lembrete com ID ${id} não possui medicamentos`);
      return NextResponse.json(
        { error: 'Lembrete não possui medicamentos' },
        { status: 400 }
      );
    }
    
    // Remover agendamentos existentes
    console.log(`Removendo agendamentos existentes para lembrete ${id}`);
    removeReminderNotifications(id);
    
    // Usar o primeiro medicamento
    const medicationProduct = reminder.medicationProducts[0];
    console.log(`Usando medicamento '${medicationProduct.title}'`);
    
    // Extrair a URL e chave secreta do webhook das variáveis de ambiente ou dos dados do corpo da requisição
    const reminderData = await request.json().catch(() => ({}));
    
    // Usar URL e segredo do corpo da requisição, ou variáveis de ambiente, ou URL padrão
    const webhookUrl = reminderData.webhookUrl || process.env.WEBHOOK_URL || 'https://webhook.site/2183e9be-ce1f-400d-bd28-c589a1938b44';
    const webhookSecret = reminderData.webhookSecret || process.env.WEBHOOK_SECRET || '';
    
    console.log(`Configurações de webhook - URL: ${webhookUrl}, Secret: ${webhookSecret ? 'configurado' : 'não configurado'}`);
    
    // Preparar payload do webhook
    const webhookPayload: WebhookPayload = {
      reminderId: reminder._id ? reminder._id.toString() : id,
      tutorName: reminder.tutorName,
      petName: reminder.petName,
      petBreed: reminder.petBreed || '',
      phoneNumber: reminder.phoneNumber,
      eventType: 'reminder_notification',
      eventDescription: `Hora do medicamento: ${medicationProduct.title}`,
      medicationProduct: {
        title: medicationProduct.title,
        quantity: medicationProduct.quantity,
        frequencyValue: medicationProduct.frequencyValue || 0,
        frequencyUnit: medicationProduct.frequencyUnit || 'horas',
        duration: medicationProduct.duration || 0,
        durationUnit: medicationProduct.durationUnit || 'dias',
        startDateTime: medicationProduct.startDateTime ? medicationProduct.startDateTime.toISOString() : '',
        endDateTime: medicationProduct.endDateTime ? medicationProduct.endDateTime.toISOString() : ''
      }
    };
    
    // Enviar webhook
    await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
    
    // Agendar próxima notificação com base na frequência
    const now = new Date();
    
    // Determinar o intervalo em milissegundos
    let intervalMs = 0;
    const frequencyValue = medicationProduct.frequencyValue || 8;
    const frequencyUnit = medicationProduct.frequencyUnit || 'horas';
    
    // Calcular intervalo em milissegundos
    switch (frequencyUnit) {
      case 'minutos':
        intervalMs = frequencyValue * 60 * 1000;
        console.log(`Frequência em minutos: ${frequencyValue} (${intervalMs}ms)`);
        break;
      case 'horas':
        intervalMs = frequencyValue * 60 * 60 * 1000;
        console.log(`Frequência em horas: ${frequencyValue} (${intervalMs}ms)`);
        break;
      case 'dias':
        intervalMs = frequencyValue * 24 * 60 * 60 * 1000;
        console.log(`Frequência em dias: ${frequencyValue} (${intervalMs}ms)`);
        break;
    }
    
    // Agendar próxima notificação em x minutos no futuro
    const nextNotificationTime = new Date(now.getTime() + intervalMs);
    
    // Verificar se a data final já passou
    let shouldScheduleNext = true;
    
    if (medicationProduct.endDateTime) {
      const endDate = new Date(medicationProduct.endDateTime);
      if (nextNotificationTime > endDate) {
        console.log(`Tratamento finalizado para medicamento ${medicationProduct.title}. Não agendando próxima notificação.`);
        shouldScheduleNext = false;
      }
    }
    
    if (shouldScheduleNext) {
      // Importar função de agendamento sem ter que reformular a lógica
      const { scheduleReminderNotifications } = await import('@/app/lib/services/schedulerService');
      
      // Reagendar com as novas configurações
      await scheduleReminderNotifications({
        ...reminder.toObject(),
        id: reminder._id.toString(),
        _id: reminder._id.toString()
      }, webhookUrl, webhookSecret);
      
      console.log(`Próxima notificação agendada para ${nextNotificationTime.toISOString()}`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Notificação enviada e próxima agendada com sucesso',
      reminderId: id,
      medicationTitle: medicationProduct.title,
      nextNotification: shouldScheduleNext ? nextNotificationTime.toISOString() : null,
      frequency: `${medicationProduct.frequencyValue} ${medicationProduct.frequencyUnit}`
    });
  } catch (error) {
    console.error(`Erro ao forçar notificação para lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao forçar notificação e reagendamento' },
      { status: 500 }
    );
  }
} 