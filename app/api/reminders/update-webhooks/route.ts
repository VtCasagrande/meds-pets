import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';

interface UpdateWebhooksRequest {
  webhookUrl: string;
  webhookSecret?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Obter body da requisição
    const body: UpdateWebhooksRequest = await request.json();
    
    // Verificar se a URL de webhook foi fornecida
    if (!body.webhookUrl) {
      return NextResponse.json(
        { error: 'URL de webhook é obrigatória' },
        { status: 400 }
      );
    }
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Atualizar todos os lembretes ativos
    const result = await Reminder.updateMany(
      { isActive: true },
      { 
        $set: { 
          webhookUrl: body.webhookUrl,
          webhookSecret: body.webhookSecret || '',
          updatedAt: new Date()
        } 
      }
    );
    
    console.log(`Webhooks atualizados para ${result.modifiedCount} lembretes ativos`);
    
    // Reagendar notificações para garantir que elas usem as novas configurações
    try {
      // Importar serviço de agendamento dinamicamente
      const schedulerServicePromise = import('@/app/lib/services/schedulerService').then(module => module);
      
      // Buscar lembretes ativos atualizados
      const reminders = await Reminder.find({ isActive: true });
      
      // Aguardar importação dinâmica
      const schedulerService = await schedulerServicePromise;
      
      // Parar o agendador atual
      schedulerService.stopScheduler();
      
      // Reiniciar o agendador
      schedulerService.startScheduler();
      
      console.log(`Serviço de agendamento reiniciado com as novas configurações de webhook`);
      
      // Reagendar notificações para cada lembrete
      for (const reminder of reminders) {
        await schedulerService.scheduleReminderNotifications(
          {
            id: reminder._id.toString(),
            _id: reminder._id.toString(),
            tutorName: reminder.tutorName,
            petName: reminder.petName,
            petBreed: reminder.petBreed || '',
            phoneNumber: reminder.phoneNumber,
            isActive: reminder.isActive,
            webhookUrl: reminder.webhookUrl,
            webhookSecret: reminder.webhookSecret,
            medicationProducts: reminder.medicationProducts.map(product => ({
              id: product.id?.toString(),
              title: product.title,
              quantity: product.quantity,
              frequency: product.frequency,
              frequencyValue: product.frequencyValue || 0,
              frequencyUnit: product.frequencyUnit || 'horas',
              duration: product.duration || 0,
              durationUnit: product.durationUnit || 'dias',
              startDateTime: product.startDateTime.toISOString(),
              endDateTime: product.endDateTime ? product.endDateTime.toISOString() : undefined
            }))
          },
          body.webhookUrl,
          body.webhookSecret
        );
      }
      
      console.log(`Notificações reagendadas para ${reminders.length} lembretes`);
    } catch (error) {
      console.error('Erro ao reagendar notificações:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Webhooks atualizados com sucesso',
      updatedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Erro ao atualizar webhooks:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar requisição',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
} 