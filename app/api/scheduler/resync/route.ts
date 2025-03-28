import { NextResponse } from 'next/server';

// POST /api/scheduler/resync - Recarregar e reagendar todos os lembretes ativos
export async function POST() {
  try {
    // Verificar se estamos em ambiente Node.js e não Edge
    if (typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
      return NextResponse.json({ 
        success: false, 
        message: 'Não é possível executar o resync no ambiente Edge Runtime' 
      }, { status: 400 });
    }
    
    console.log('Iniciando ressincronização de todos os lembretes...');
    
    // Importar tudo o que precisamos de forma dinâmica
    const dbConnectPromise = import('@/app/lib/db').then(module => module.default);
    const ReminderModelPromise = import('@/app/lib/models/Reminder').then(module => module.default);
    const schedulerPromise = import('@/app/lib/services/schedulerService').then(module => module);
    
    // Aguardar todas as importações
    const [dbConnect, ReminderModel, scheduler] = await Promise.all([
      dbConnectPromise, 
      ReminderModelPromise, 
      schedulerPromise
    ]);
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Buscar todos os lembretes ativos
    const activeReminders = await ReminderModel.find({ isActive: true });
    console.log(`Encontrados ${activeReminders.length} lembretes ativos para ressincronizar.`);
    
    if (activeReminders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum lembrete ativo encontrado para ressincronizar',
        count: 0
      });
    }
    
    // Parar o agendador atual para limpar todas as tarefas existentes
    scheduler.stopScheduler();
    
    // Reiniciar o agendador
    scheduler.startScheduler();
    
    // Webhooks configurados no ambiente
    const webhookUrl = process.env.WEBHOOK_URL || '';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    
    // Reagendar cada lembrete
    for (const reminderDoc of activeReminders) {
      // Verificação de segurança para o _id
      const id = reminderDoc._id ? reminderDoc._id.toString() : `unknown-${Date.now()}`;
      
      // Converter documento do MongoDB para o formato Reminder
      const reminder = {
        id: id,
        _id: id,
        tutorName: reminderDoc.tutorName || '',
        petName: reminderDoc.petName || '',
        petBreed: reminderDoc.petBreed || '',
        phoneNumber: reminderDoc.phoneNumber || '',
        isActive: reminderDoc.isActive !== false, // Garantir que seja true se não for explicitamente false
        webhookUrl: reminderDoc.webhookUrl || webhookUrl,
        webhookSecret: reminderDoc.webhookSecret || webhookSecret,
        medicationProducts: (reminderDoc.medicationProducts || []).map(product => {
          // Garantir tipos corretos para frequencyUnit e durationUnit
          const frequencyUnit = (product.frequencyUnit as 'minutos' | 'horas' | 'dias') || 'horas';
          const durationUnit = (product.durationUnit as 'dias' | 'semanas' | 'meses') || 'dias';
          
          return {
            id: product._id ? product._id.toString() : undefined,
            title: product.title || '',
            quantity: product.quantity || '',
            frequency: product.frequency || '',
            frequencyValue: product.frequencyValue || 8,
            frequencyUnit: frequencyUnit,
            duration: product.duration || 0,
            durationUnit: durationUnit,
            startDateTime: product.startDateTime instanceof Date ? 
              product.startDateTime.toISOString() : 
              product.startDateTime || new Date().toISOString(),
            endDateTime: product.endDateTime instanceof Date ? 
              product.endDateTime.toISOString() : 
              product.endDateTime
          };
        }),
        createdAt: reminderDoc.createdAt instanceof Date ? reminderDoc.createdAt.toISOString() : undefined,
        updatedAt: reminderDoc.updatedAt instanceof Date ? reminderDoc.updatedAt.toISOString() : undefined
      };
      
      // Reagendar as notificações
      await scheduler.scheduleReminderNotifications(
        reminder, 
        reminder.webhookUrl || webhookUrl, 
        reminder.webhookSecret || webhookSecret
      );
      
      console.log(`Reagendadas notificações para lembrete ${reminder.id}: ${reminder.petName}`);
    }
    
    // Obter estado atual das tarefas agendadas
    const currentTasks = scheduler.listScheduledTasks();
    const uniqueReminders = new Set();
    currentTasks.forEach(task => uniqueReminders.add(task.reminderId));
    
    return NextResponse.json({
      success: true,
      message: `Ressincronização completa. ${activeReminders.length} lembretes ressincronizados com sucesso.`,
      stats: {
        activeReminders: activeReminders.length,
        tasksScheduled: currentTasks.length,
        uniqueReminders: uniqueReminders.size
      }
    });
  } catch (error) {
    console.error('Erro na ressincronização de lembretes:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro na ressincronização', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 