import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload, WebhookEventType } from '@/app/lib/types';
import { Types } from 'mongoose';

// POST /api/reminders/webhook - Endpoint para disparar webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Obter os dados necessários
    const { 
      reminderId, 
      medicationIndex, 
      webhookUrl, 
      webhookSecret,
      eventType = 'reminder_notification',  // Padrão é notificação
      eventDescription = 'Lembrete de medicamento' 
    } = body;
    
    if (!reminderId || medicationIndex === undefined) {
      return NextResponse.json(
        { error: 'Dados de webhook incompletos' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Buscar o lembrete
    const reminder = await Reminder.findById(reminderId);
    
    if (!reminder || !reminder.isActive) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado ou não está ativo' },
        { status: 404 }
      );
    }
    
    // Verificar se o índice do medicamento é válido
    if (medicationIndex >= reminder.medicationProducts.length) {
      return NextResponse.json(
        { error: 'Índice de medicamento inválido' },
        { status: 400 }
      );
    }
    
    const medicationProduct = reminder.medicationProducts[medicationIndex];
    
    // Definir descrição do evento com base no tipo
    let finalEventDescription = eventDescription;
    if (!eventDescription) {
      switch (eventType as WebhookEventType) {
        case 'reminder_created':
          finalEventDescription = 'Novo lembrete criado';
          break;
        case 'reminder_updated':
          finalEventDescription = 'Lembrete atualizado';
          break;
        case 'reminder_notification':
          finalEventDescription = `Notificação de medicamento: ${medicationProduct.title}`;
          break;
        default:
          finalEventDescription = 'Evento de lembrete';
      }
    }
    
    // Preparar payload do webhook
    const webhookPayload: WebhookPayload = {
      reminderId: reminder._id ? (reminder._id instanceof Types.ObjectId ? reminder._id.toString() : String(reminder._id)) : reminderId,
      tutorName: reminder.tutorName,
      petName: reminder.petName,
      petBreed: reminder.petBreed || '',
      phoneNumber: reminder.phoneNumber,
      eventType: eventType as WebhookEventType,
      eventDescription: finalEventDescription,
      medicationProduct: {
        title: medicationProduct.title,
        quantity: medicationProduct.quantity,
        frequencyValue: medicationProduct.frequencyValue || 0,
        frequencyUnit: (medicationProduct.frequencyUnit as 'minutos' | 'horas' | 'dias') || 'horas',
        duration: medicationProduct.duration || 0,
        durationUnit: (medicationProduct.durationUnit as 'dias' | 'semanas' | 'meses') || 'dias',
        startDateTime: medicationProduct.startDateTime ? new Date(medicationProduct.startDateTime).toISOString() : '',
        endDateTime: medicationProduct.endDateTime ? new Date(medicationProduct.endDateTime).toISOString() : ''
      }
    };
    
    console.log('Payload preparado:', webhookPayload);
    
    // Verificar se temos um URL para enviar o webhook
    if (webhookUrl) {
      console.log(`Enviando webhook para URL: ${webhookUrl}`);
      
      try {
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
          body: JSON.stringify(webhookPayload)
        });
        
        const responseStatus = webhookResponse.status;
        console.log(`Resposta do webhook: status ${responseStatus}`);
        
        let responseData;
        try {
          responseData = await webhookResponse.json();
          console.log('Dados da resposta:', responseData);
        } catch (e) {
          console.log('Não foi possível obter dados JSON da resposta');
        }
        
        return NextResponse.json({
          success: true,
          message: 'Webhook processado com sucesso',
          payload: webhookPayload,
          webhookResponse: {
            status: responseStatus,
            data: responseData
          }
        });
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
        return NextResponse.json({
          success: false,
          error: 'Erro ao enviar webhook para a URL configurada',
          payload: webhookPayload
        }, { status: 500 });
      }
    } else {
      console.log('Nenhuma URL de webhook configurada, simulando envio bem-sucedido');
      
      // Simular envio bem-sucedido quando não há URL configurada
      return NextResponse.json({
        success: true,
        message: 'Webhook processado com sucesso (simulação)',
        payload: webhookPayload
      });
    }
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
} 