import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';
import { Reminder as ReminderType, MedicationProduct } from '@/app/lib/types';
import { Types } from 'mongoose';

interface UpdateWebhooksRequest {
  webhookUrl: string;
  webhookSecret?: string;
}

// Interface que estende o tipo do Reminder para incluir os tipos do MongoDB
interface ReminderDocument {
  _id: Types.ObjectId;
  tutorName: string;
  petName: string;
  petBreed: string;
  phoneNumber: string;
  isActive: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  medicationProducts: Array<{
    id?: string;
    title: string;
    quantity: string;
    frequency: string;
    frequencyValue?: number;
    frequencyUnit?: string;
    duration?: number;
    durationUnit?: string;
    startDateTime: Date;
    endDateTime?: Date;
  }>;
}

// Função para validar e converter o frequencyUnit para um dos valores aceitos
function validateFrequencyUnit(value?: string): 'minutos' | 'horas' | 'dias' {
  if (value === 'minutos' || value === 'horas' || value === 'dias') {
    return value;
  }
  return 'horas'; // valor padrão
}

// Função para validar e converter o durationUnit para um dos valores aceitos
function validateDurationUnit(value?: string): 'dias' | 'semanas' | 'meses' {
  if (value === 'dias' || value === 'semanas' || value === 'meses') {
    return value;
  }
  return 'dias'; // valor padrão
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
      const reminders = await Reminder.find({ isActive: true }) as ReminderDocument[];
      
      // Aguardar importação dinâmica
      const schedulerService = await schedulerServicePromise;
      
      // Parar o agendador atual
      schedulerService.stopScheduler();
      
      // Reiniciar o agendador
      schedulerService.startScheduler();
      
      console.log(`Serviço de agendamento reiniciado com as novas configurações de webhook`);
      
      // Reagendar notificações para cada lembrete
      for (const reminder of reminders) {
        const medicationProducts: MedicationProduct[] = reminder.medicationProducts.map(product => ({
          id: product.id?.toString(),
          title: product.title,
          quantity: product.quantity,
          frequency: product.frequency,
          frequencyValue: product.frequencyValue || 0,
          frequencyUnit: validateFrequencyUnit(product.frequencyUnit),
          duration: product.duration || 0,
          durationUnit: validateDurationUnit(product.durationUnit),
          startDateTime: product.startDateTime.toISOString(),
          endDateTime: product.endDateTime ? product.endDateTime.toISOString() : undefined
        }));

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
            medicationProducts
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