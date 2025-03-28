import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload } from '@/app/lib/types';
import { Types } from 'mongoose';
import { getCurrentUserId, getCurrentUserRole, requireAuth, authOptions } from '@/app/lib/auth';
import { logActivity } from '@/app/lib/services/auditLogService';
import { getServerSession } from 'next-auth';
import { logReminderCreation } from '@/app/lib/logHelpers';
import { Reminder as ReminderType } from '@/app/lib/types';

// Importar funções do schedulerService apenas em ambiente Node.js
let scheduleReminderNotifications: (reminder: any, webhookUrl?: string, webhookSecret?: string) => Promise<void> = 
  async () => { console.log('Ambiente não suportado para agendamento'); };

// Verificar se estamos em ambiente Node.js (não Edge)
if (typeof window === 'undefined' && typeof process !== 'undefined' &&
    process.env.NEXT_RUNTIME !== 'edge') {
  // Importação dinâmica para evitar problemas no Edge Runtime
  import('@/app/lib/services/schedulerService').then(module => {
    scheduleReminderNotifications = module.scheduleReminderNotifications;
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
  
  try {
    console.log(`Enviando webhook para URL: ${webhookUrl}`);
    
    // Configurar headers para incluir a chave secreta, se fornecida
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }
    
    // Enviar o webhook para a URL configurada
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const responseStatus = webhookResponse.status;
    console.log(`Resposta do webhook: status ${responseStatus}`);
    
    let responseData;
    let responseText = '';
    
    try {
      responseText = await webhookResponse.text();
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
      const WebhookLogModel = (await import('@/app/lib/models/WebhookLog')).default;
      
      // Criar registro de log
      await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: responseStatus,
        response: responseText.substring(0, 1000), // Limitar tamanho da resposta
        success: success,
        createdAt: new Date()
      });
      
      console.log(`Log de webhook ${payload.eventType} registrado com sucesso.`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return responseData;
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
    
    // Registrar erro no banco de dados
    try {
      // Importar modelo do Mongoose dinamicamente
      const WebhookLogModel = (await import('@/app/lib/models/WebhookLog')).default;
      
      // Criar registro de log de erro
      await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: 0,
        response: error instanceof Error ? error.message : 'Erro desconhecido',
        success: false,
        createdAt: new Date()
      });
      
      console.log(`Log de erro de webhook registrado.`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return null;
  }
}

// GET /api/reminders - Listar todos os lembretes (com restrições baseadas em função)
export async function GET(request: NextRequest) {
  console.log('GET /api/reminders - Iniciando busca de lembretes');
  
  try {
    // Verificar autenticação
    const authError = await requireAuth(request);
    if (authError) return authError;
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Verificar papel do usuário atual
    const userId = await getCurrentUserId();
    const userRole = await getCurrentUserRole();
    
    // Definir filtros com base no papel do usuário
    let activeFilter: any = { isActive: true };
    let completedFilter: any = { isActive: false };
    
    // Usuários comuns só veem seus próprios lembretes
    if (userRole === 'user' && userId) {
      const userEmail = request.headers.get('x-user-email') || '';
      console.log(`Usuário comum (${userEmail}) - filtrando apenas seus lembretes`);
      
      activeFilter = { 
        ...activeFilter, 
        createdBy: userId 
      };
      
      completedFilter = { 
        ...completedFilter, 
        createdBy: userId 
      };
    } else {
      console.log(`Usuário com permissão (${userRole}) - mostrando todos os lembretes`);
    }
    
    // Buscar lembretes ativos e não ativos
    console.log('Buscando lembretes ativos...');
    const activeReminders = await Reminder.find(activeFilter).sort({ createdAt: -1 });
    console.log(`Encontrados ${activeReminders.length} lembretes ativos`);
    
    console.log('Buscando lembretes finalizados...');
    const completedReminders = await Reminder.find(completedFilter).sort({ createdAt: -1 });
    console.log(`Encontrados ${completedReminders.length} lembretes finalizados`);
    
    return NextResponse.json({
      activeReminders,
      completedReminders
    });
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao buscar lembretes' },
      { status: 500 }
    );
  }
}

// POST /api/reminders - Criar um novo lembrete
export async function POST(request: NextRequest) {
  console.log('POST /api/reminders - Iniciando criação de lembrete');
  
  try {
    // Verificar autenticação
    const authError = await requireAuth(request);
    if (authError) return authError;
    
    const body = await request.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));
    
    // Obter ID do usuário atual para armazenar como criador
    const userId = await getCurrentUserId();
    const userEmail = (await getServerSession(authOptions))?.user?.email || '';
    
    // Extrair a URL e chave secreta do webhook, se fornecidas
    // Ou usar as configurações de ambiente como fallback
    const webhookUrl = body.webhookUrl || process.env.WEBHOOK_URL || '';
    const webhookSecret = body.webhookSecret || process.env.WEBHOOK_SECRET || '';
    
    // Validação básica
    if (!body.tutorName || !body.petName || !body.phoneNumber || !body.medicationProducts || body.medicationProducts.length === 0) {
      console.error('Dados incompletos recebidos');
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Verificar formato da data nos medicamentos
    try {
      body.medicationProducts = body.medicationProducts.map((product: { startDateTime: string | Date, endDateTime?: string | Date }) => ({
        ...product,
        startDateTime: new Date(product.startDateTime),
        ...(product.endDateTime && { endDateTime: new Date(product.endDateTime) })
      }));
      console.log('Datas dos medicamentos convertidas com sucesso');
    } catch (dateError) {
      console.error('Erro ao converter datas dos medicamentos:', dateError);
      return NextResponse.json(
        { error: 'Formato de data inválido nos medicamentos' },
        { status: 400 }
      );
    }
    
    // Criar novo lembrete
    console.log('Criando novo lembrete...');
    try {
      // Remover campos do webhook dos dados do lembrete
      const reminderData = { ...body };
      delete reminderData.webhookUrl;
      delete reminderData.webhookSecret;
      
      // Adicionar o ID do usuário como criador do lembrete
      if (userId) {
        reminderData.createdBy = userId;
      }
      
      const reminder = new Reminder(reminderData);
      await reminder.save();
      console.log('Lembrete criado com sucesso, ID:', reminder._id);
      
      // Registrar log de auditoria para criação de lembrete
      await logReminderCreation(
        reminder as unknown as ReminderType, 
        userId as string, 
        userEmail as string, 
        request
      );
      
      // Enviar webhook para o primeiro medicamento (criação de lembrete)
      if (reminder.medicationProducts.length > 0) {
        const firstProduct = reminder.medicationProducts[0];
        
        // Preparar payload do webhook
        const webhookPayload: WebhookPayload = {
          reminderId: reminder._id ? (reminder._id instanceof Types.ObjectId ? reminder._id.toString() : String(reminder._id)) : '',
          tutorName: reminder.tutorName,
          petName: reminder.petName,
          petBreed: reminder.petBreed || '',
          phoneNumber: reminder.phoneNumber,
          eventType: 'reminder_created',
          eventDescription: 'Novo lembrete criado',
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
        
        // Enviar webhook de criação
        await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
      }
      
      // Agendar notificações automáticas para cada medicamento
      console.log('Agendando notificações automáticas...');
      await scheduleReminderNotifications(reminder, webhookUrl, webhookSecret);
      
      return NextResponse.json(reminder, { status: 201 });
    } catch (dbError: any) {
      console.error('Erro ao salvar no banco de dados:', dbError);
      
      // Registrar log de erro
      await logActivity({
        action: 'create',
        entity: 'reminder',
        description: 'Erro ao criar lembrete',
        details: { error: dbError.message || 'Erro desconhecido' },
        request,
        performedBy: userId || undefined,
        performedByEmail: userEmail
      });
      
      // Verificar erros de validação
      if (dbError.name === 'ValidationError') {
        const validationErrors = Object.keys(dbError.errors).reduce((acc: any, key) => {
          acc[key] = dbError.errors[key].message;
          return acc;
        }, {});
        
        return NextResponse.json(
          { error: 'Erro de validação', details: validationErrors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao salvar no banco de dados', message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    // Obter dados do usuário para o log
    let userId = 'sistema';
    let userEmail = 'sistema@sistema.com';
    
    try {
      userId = await getCurrentUserId() || 'sistema';
      userEmail = (await getServerSession(authOptions))?.user?.email || 'sistema@sistema.com';
    } catch (e) {
      console.error('Erro ao obter dados do usuário para log:', e);
    }
    
    // Registrar log de erro
    await logActivity({
      action: 'create',
      entity: 'reminder',
      description: 'Erro ao processar criação de lembrete',
      details: { error: error instanceof Error ? error.message : 'Erro desconhecido' },
      request,
      performedBy: userId || undefined,
      performedByEmail: userEmail
    });
    
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    );
  }
} 