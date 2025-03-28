import { NextResponse } from 'next/server';

// GET /api/scheduler/status - Verificar status do agendador e listar tarefas
export async function GET() {
  try {
    // Verificar se estamos em ambiente Node.js e não Edge
    if (typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
      return NextResponse.json({ 
        success: false, 
        message: 'Não é possível verificar o agendador no ambiente Edge Runtime' 
      }, { status: 400 });
    }
    
    // Importar serviços de agendamento dinamicamente
    const { 
      listScheduledTasks, 
      startScheduler, 
      getSchedulerStatus 
    } = await import('@/app/lib/services/schedulerService');
    
    // Iniciar o agendador se ainda não estiver iniciado
    // Isso garante que sempre que este endpoint for chamado, o agendador estará rodando
    const schedulerRunning = startScheduler();
    
    // Reagendar todos os lembretes caso não haja tarefas
    const tasks = listScheduledTasks();
    
    // Obter informações adicionais do agendador
    const schedulerInfo = getSchedulerStatus();
    
    // Calcular estatísticas
    const now = new Date();
    const tasksWithTime = tasks.map(task => ({
      ...task,
      scheduledTimeObj: new Date(task.scheduledTime),
      timeUntil: new Date(task.scheduledTime).getTime() - now.getTime()
    }));
    
    const pendingTasks = tasksWithTime.filter(task => task.timeUntil > 0);
    const sortedTasks = [...pendingTasks].sort((a, b) => a.timeUntil - b.timeUntil);
    const nextTask = sortedTasks.length > 0 ? sortedTasks[0] : null;
    
    // Agrupar por reminderId para identificar quantos lembretes diferentes estão agendados
    const uniqueReminderIds = new Set<string>();
    tasks.forEach(task => uniqueReminderIds.add(task.reminderId));
    const uniqueRemindersCount = uniqueReminderIds.size;
    
    // Calcular uptime apenas se startTime existe
    let uptime = 0;
    if (schedulerInfo.startTime) {
      uptime = Math.floor((Date.now() - new Date(schedulerInfo.startTime).getTime()) / 1000);
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Agendador está ativo',
      schedulerInfo: {
        isRunning: schedulerRunning,
        lastCheck: schedulerInfo.lastCheck,
        checkInterval: schedulerInfo.checkInterval,
        startTime: schedulerInfo.startTime,
        uptime: uptime
      },
      stats: {
        totalTasks: tasks.length,
        pendingTasks: pendingTasks.length,
        uniqueReminders: uniqueRemindersCount
      },
      nextTask: nextTask ? {
        id: nextTask.id,
        reminderId: nextTask.reminderId,
        scheduledTime: nextTask.scheduledTime,
        timeUntilMs: nextTask.timeUntil,
        timeUntilSeconds: Math.floor(nextTask.timeUntil / 1000)
      } : null,
      tasks: tasks
    });
  } catch (error) {
    console.error('Erro ao verificar status do agendador:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro ao verificar status do agendador', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 