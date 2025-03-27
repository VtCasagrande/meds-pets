import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { WebhookPayload } from '@/app/lib/types';

// POST /api/reminders/webhook - Endpoint para disparar webhook
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validar se é uma solicitação de webhook válida
    // Aqui você pode verificar tokens de autenticação, chaves de API, etc.
    
    const { reminderId, medicationIndex } = body;
    
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
    
    // Preparar payload do webhook
    const webhookPayload: WebhookPayload = {
      reminderId: reminder._id.toString(),
      tutorName: reminder.tutorName,
      petName: reminder.petName,
      phoneNumber: reminder.phoneNumber,
      medicationProduct: {
        title: medicationProduct.title,
        quantity: medicationProduct.quantity
      }
    };
    
    // Aqui você pode enviar as notificações para os serviços externos
    // Exemplo: enviar SMS, notificar APIs externas, etc.
    console.log('Enviando notificação:', webhookPayload);
    
    // Simular envio bem-sucedido
    return NextResponse.json({
      success: true,
      message: 'Webhook processado com sucesso',
      payload: webhookPayload
    });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
} 