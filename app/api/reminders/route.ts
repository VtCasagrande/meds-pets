import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload } from '@/app/lib/types';

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
    
    try {
      const responseData = await webhookResponse.json();
      console.log('Dados da resposta:', responseData);
      return responseData;
    } catch (e) {
      console.log('Não foi possível obter dados JSON da resposta');
      return { status: responseStatus };
    }
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
    return null;
  }
}

// GET /api/reminders - Listar todos os lembretes
export async function GET() {
  console.log('GET /api/reminders - Iniciando busca de lembretes');
  
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Buscar lembretes ativos e não ativos
    console.log('Buscando lembretes ativos...');
    const activeReminders = await Reminder.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`Encontrados ${activeReminders.length} lembretes ativos`);
    
    console.log('Buscando lembretes finalizados...');
    const completedReminders = await Reminder.find({ isActive: false }).sort({ createdAt: -1 });
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
    const body = await request.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));
    
    // Extrair a URL e chave secreta do webhook, se fornecidas
    const { webhookUrl, webhookSecret } = body;
    
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
      
      const reminder = new Reminder(reminderData);
      await reminder.save();
      console.log('Lembrete criado com sucesso, ID:', reminder._id);
      
      // Enviar webhook para o primeiro medicamento (criação de lembrete)
      if (reminder.medicationProducts.length > 0) {
        const firstProduct = reminder.medicationProducts[0];
        
        // Preparar payload do webhook
        const webhookPayload: WebhookPayload = {
          reminderId: reminder._id.toString(),
          tutorName: reminder.tutorName,
          petName: reminder.petName,
          phoneNumber: reminder.phoneNumber,
          eventType: 'reminder_created',
          eventDescription: 'Novo lembrete criado',
          medicationProduct: {
            title: firstProduct.title,
            quantity: firstProduct.quantity,
            frequencyValue: firstProduct.frequencyValue || 0,
            frequencyUnit: firstProduct.frequencyUnit || 'horas',
            duration: firstProduct.duration || 0,
            durationUnit: firstProduct.durationUnit || 'dias',
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
      console.error('Detalhes do erro:', {
        name: dbError.name,
        code: dbError.code,
        message: dbError.message,
        errors: dbError.errors
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
    
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    );
  }
} 