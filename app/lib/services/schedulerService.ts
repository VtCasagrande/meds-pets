import { Reminder } from '../types';
import { WebhookPayload } from '../types';

// Em um ambiente de produção, isso seria implementado
// com um sistema de fila real como AWS SQS, RabbitMQ, etc.
// ou um sistema de agendamento como node-cron ou node-schedule.
// Este é um protótipo simples apenas para demonstração.

// Indicador de que estamos em ambiente Node.js (não Edge)
const isNodeEnvironment = typeof window === 'undefined' && typeof process !== 'undefined' && 
                          process.env.NEXT_RUNTIME !== 'edge';

// Armazenamento em memória para tarefas agendadas
// Na produção, isso seria armazenado em um banco de dados persistente
interface ScheduledTask {
  id: string;
  reminderId: string;
  medicationIndex: number;
  scheduledTime: Date;
  webhookUrl?: string;
  webhookSecret?: string;
}

// Simulação de uma fila de tarefas em memória
let scheduledTasks: ScheduledTask[] = [];

// Intervalo que verifica tarefas a cada minuto
let schedulerInterval: NodeJS.Timeout | null = null;

// Função auxiliar para formatar data segura (independente do tipo)
function formatDateSafe(date: any): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date && typeof date.toISOString === 'function') return date.toISOString();
  return '';
}

// Verificar lembretes finalizados diariamente
async function checkAllCompletedReminders() {
  if (!isNodeEnvironment) {
    return;
  }
  
  try {
    console.log('Verificando lembretes concluídos...');
    
    // Importar modelo do Mongoose dinamicamente
    const dbConnectPromise = import('../db').then(module => module.default);
    const ReminderModelPromise = import('../models/Reminder').then(module => module.default);
    
    // Aguardar importações dinâmicas
    const [dbConnect, ReminderModel] = await Promise.all([dbConnectPromise, ReminderModelPromise]);
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Buscar todos os lembretes ativos
    const activeReminders = await ReminderModel.find({ isActive: true });
    
    console.log(`Encontrados ${activeReminders.length} lembretes ativos para verificar.`);
    
    // Obter configurações de webhook
    const webhookUrl = process.env.WEBHOOK_URL || '';
    const webhookSecret = process.env.WEBHOOK_SECRET || '';
    
    // Verificar cada lembrete
    for (const reminderDoc of activeReminders) {
      const reminder: Reminder = {
        id: reminderDoc._id ? reminderDoc._id.toString() : '',
        _id: reminderDoc._id ? reminderDoc._id.toString() : '',
        tutorName: reminderDoc.tutorName,
        petName: reminderDoc.petName,
        petBreed: reminderDoc.petBreed || '',
        phoneNumber: reminderDoc.phoneNumber,
        isActive: reminderDoc.isActive,
        medicationProducts: reminderDoc.medicationProducts.map(product => {
          // Garantir que frequencyUnit seja um valor válido
          let frequencyUnit: 'minutos' | 'horas' | 'dias' = 'horas';
          if (product.frequencyUnit === 'minutos' || product.frequencyUnit === 'horas' || product.frequencyUnit === 'dias') {
            frequencyUnit = product.frequencyUnit;
          }
          
          // Garantir que durationUnit seja um valor válido
          let durationUnit: 'dias' | 'semanas' | 'meses' = 'dias';
          if (product.durationUnit === 'dias' || product.durationUnit === 'semanas' || product.durationUnit === 'meses') {
            durationUnit = product.durationUnit;
          }
          
          return {
            id: product.id || undefined,
            title: product.title,
            quantity: product.quantity,
            frequency: product.frequency || '',
            frequencyValue: product.frequencyValue || 0,
            frequencyUnit: frequencyUnit,
            duration: product.duration || 0,
            durationUnit: durationUnit,
            startDateTime: formatDateSafe(product.startDateTime),
            endDateTime: formatDateSafe(product.endDateTime)
          };
        }),
        createdAt: formatDateSafe(reminderDoc.createdAt),
        updatedAt: formatDateSafe(reminderDoc.updatedAt)
      };
      
      // Verificar se todos os tratamentos foram concluídos
      await checkReminderCompletion(reminder, webhookUrl, webhookSecret);
    }
    
    console.log('Verificação de lembretes concluídos finalizada.');
  } catch (error) {
    console.error('Erro ao verificar lembretes concluídos:', error);
  }
}

// Iniciar o agendador
export function startScheduler() {
  // Verificar se estamos em ambiente de servidor (não Edge)
  if (!isNodeEnvironment) {
    console.log('Agendador não iniciado: ambiente não suportado');
    return;
  }

  if (schedulerInterval) {
    return; // Já está rodando
  }
  
  console.log('Iniciando serviço de agendamento de webhooks...');
  
  // Verificar tarefas a cada 15 segundos para garantir boa resposta em intervalos curtos
  schedulerInterval = setInterval(checkScheduledTasks, 15 * 1000);
  
  // Verificar lembretes concluídos uma vez ao iniciar
  checkAllCompletedReminders();
  
  // E depois a cada 5 minutos (em vez de diariamente)
  setInterval(checkAllCompletedReminders, 5 * 60 * 1000);
  
  console.log('Serviço de agendamento iniciado.');
}

// Parar o agendador
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Serviço de agendamento interrompido.');
  }
}

// Verificar tarefas agendadas
async function checkScheduledTasks() {
  const now = new Date();
  console.log(`[${now.toISOString()}] Verificando tarefas agendadas...`);
  
  // Adicionar 1 segundo para prevenir problemas de timing e garantir que tarefas sejam executadas
  const checkTime = new Date(now.getTime() + 1000);
  
  // Filtrar tarefas que devem ser executadas agora
  const tasksToRun = scheduledTasks.filter(task => 
    task.scheduledTime <= checkTime
  );
  
  if (tasksToRun.length > 0) {
    console.log(`Encontradas ${tasksToRun.length} tarefas para executar.`);
    
    // Remover tarefas que serão executadas da lista
    scheduledTasks = scheduledTasks.filter(task => 
      !tasksToRun.some(t => t.id === task.id)
    );
    
    // Executar cada tarefa
    for (const task of tasksToRun) {
      await executeTask(task);
    }
  } else {
    console.log('Nenhuma tarefa para executar no momento.');
    
    // Registrar próximas tarefas agendadas para depuração
    if (scheduledTasks.length > 0) {
      const sortedTasks = [...scheduledTasks].sort((a, b) => 
        a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );
      
      console.log(`Próximas ${Math.min(3, sortedTasks.length)} tarefas agendadas:`);
      sortedTasks.slice(0, 3).forEach(task => {
        const timeUntil = Math.round((task.scheduledTime.getTime() - now.getTime()) / 1000);
        console.log(`- Tarefa ${task.id} para lembrete ${task.reminderId} em ${timeUntil} segundos (${task.scheduledTime.toISOString()})`);
      });
    }
  }
}

// Executar uma tarefa agendada
async function executeTask(task: ScheduledTask) {
  try {
    console.log(`Executando tarefa ${task.id} para lembrete ${task.reminderId}`);
    
    // Buscar informações atualizadas do lembrete no banco de dados
    const reminder = await fetchReminderById(task.reminderId);
    
    if (!reminder || !reminder.isActive) {
      console.log(`Lembrete ${task.reminderId} não encontrado ou não está ativo. Ignorando tarefa.`);
      return;
    }
    
    // Verificar se o medicamento ainda existe
    if (task.medicationIndex >= reminder.medicationProducts.length) {
      console.log(`Índice de medicamento ${task.medicationIndex} inválido para lembrete ${task.reminderId}`);
      return;
    }
    
    const medicationProduct = reminder.medicationProducts[task.medicationIndex];
    
    // Preparar payload do webhook
    const webhookPayload: WebhookPayload = {
      reminderId: reminder.id || reminder._id || task.reminderId,
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
        startDateTime: formatDateSafe(medicationProduct.startDateTime),
        endDateTime: formatDateSafe(medicationProduct.endDateTime)
      }
    };
    
    // Enviar webhook
    await sendWebhook(webhookPayload, task.webhookUrl, task.webhookSecret);
    
    console.log(`Tarefa ${task.id} executada com sucesso.`);
    
    // Agendar próxima notificação se necessário
    scheduleNextNotification(reminder, task.medicationIndex, task.webhookUrl, task.webhookSecret);
    
    // Verificar se todos os tratamentos foram concluídos
    await checkReminderCompletion(reminder, task.webhookUrl, task.webhookSecret);
  } catch (error) {
    console.error(`Erro ao executar tarefa ${task.id}:`, error);
  }
}

// Enviar webhook
async function sendWebhook(payload: WebhookPayload, webhookUrl?: string, webhookSecret?: string) {
  if (!webhookUrl) {
    console.log('Nenhuma URL de webhook configurada, ignorando envio.');
    return;
  }
  
  try {
    console.log(`Enviando webhook para ${webhookUrl} - Tipo: ${payload.eventType}`);
    console.log(`Payload: ${JSON.stringify(payload, null, 2)}`);
    
    // Configurar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
      console.log('Webhook Secret configurado no header');
    }
    
    // Enviar webhook
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const elapsedTime = Date.now() - startTime;
    const status = response.status;
    console.log(`Resposta do webhook: status ${status}, tempo: ${elapsedTime}ms`);
    
    // Tentar obter corpo da resposta
    try {
      const responseText = await response.text();
      if (responseText) {
        console.log(`Resposta do webhook: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      }
    } catch (textError) {
      console.log('Não foi possível obter texto da resposta');
    }
    
    if (status >= 200 && status < 300) {
      console.log(`Webhook ${payload.eventType} enviado com sucesso.`);
    } else {
      console.error(`Erro ao enviar webhook ${payload.eventType}: status ${status}`);
    }
  } catch (error) {
    console.error(`Erro ao enviar webhook ${payload.eventType}:`, error);
  }
}

// Buscar um lembrete no banco de dados
// Em um ambiente real, esta função usaria o mesmo modelo do MongoDB
async function fetchReminderById(reminderId: string): Promise<Reminder | null> {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para buscar lembrete');
    return null;
  }

  try {
    // Importar modelo do Mongoose dinamicamente para evitar problemas de SSR/Edge
    const dbConnectPromise = import('../db').then(module => module.default);
    const ReminderModelPromise = import('../models/Reminder').then(module => module.default);
    
    // Aguardar importações dinâmicas
    const [dbConnect, ReminderModel] = await Promise.all([dbConnectPromise, ReminderModelPromise]);
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Buscar lembrete
    const reminderDoc = await ReminderModel.findById(reminderId);
    
    // Se não encontrou o lembrete, retornar null
    if (!reminderDoc) {
      return null;
    }
    
    // Converter documento do MongoDB para o tipo Reminder
    const reminder: Reminder = {
      id: reminderDoc._id ? reminderDoc._id.toString() : reminderId,
      _id: reminderDoc._id ? reminderDoc._id.toString() : reminderId,
      tutorName: reminderDoc.tutorName,
      petName: reminderDoc.petName,
      petBreed: reminderDoc.petBreed || '',
      phoneNumber: reminderDoc.phoneNumber,
      isActive: reminderDoc.isActive,
      medicationProducts: reminderDoc.medicationProducts.map(product => {
        // Garantir que frequencyUnit seja um valor válido
        let frequencyUnit: 'minutos' | 'horas' | 'dias' = 'horas';
        if (product.frequencyUnit === 'minutos' || product.frequencyUnit === 'horas' || product.frequencyUnit === 'dias') {
          frequencyUnit = product.frequencyUnit;
        }
        
        // Garantir que durationUnit seja um valor válido
        let durationUnit: 'dias' | 'semanas' | 'meses' = 'dias';
        if (product.durationUnit === 'dias' || product.durationUnit === 'semanas' || product.durationUnit === 'meses') {
          durationUnit = product.durationUnit;
        }
        
        return {
          // O campo id pode não existir no modelo Mongoose
          id: product.id || undefined,
          title: product.title,
          quantity: product.quantity,
          frequency: product.frequency || '',
          frequencyValue: product.frequencyValue || 0,
          frequencyUnit: frequencyUnit,
          duration: product.duration || 0,
          durationUnit: durationUnit,
          startDateTime: formatDateSafe(product.startDateTime),
          endDateTime: formatDateSafe(product.endDateTime)
        };
      }),
      createdAt: formatDateSafe(reminderDoc.createdAt),
      updatedAt: formatDateSafe(reminderDoc.updatedAt)
    };
    
    return reminder;
  } catch (error) {
    console.error(`Erro ao buscar lembrete ${reminderId}:`, error);
    return null;
  }
}

// Agendar notificações para um lembrete
export async function scheduleReminderNotifications(
  reminder: Reminder, 
  webhookUrl?: string, 
  webhookSecret?: string
) {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para agendamento de notificações');
    return;
  }

  if (!reminder.isActive) {
    console.log(`Lembrete ${reminder.id || reminder._id} não está ativo. Ignorando agendamento.`);
    return;
  }
  
  console.log(`Agendando notificações para lembrete ${reminder.id || reminder._id}`);
  
  // Agendar notificações para cada medicamento
  reminder.medicationProducts.forEach((product, index) => {
    scheduleNextNotification(reminder, index, webhookUrl, webhookSecret);
  });
  
  console.log(`Notificações agendadas com sucesso para lembrete ${reminder.id || reminder._id}`);
}

// Agendar próxima notificação para um medicamento
function scheduleNextNotification(
  reminder: Reminder,
  medicationIndex: number,
  webhookUrl?: string,
  webhookSecret?: string
) {
  const product = reminder.medicationProducts[medicationIndex];
  
  // Se não tiver data de início ou estiver inativo, não agendar
  if (!product.startDateTime || !reminder.isActive) {
    return;
  }
  
  const startDate = new Date(product.startDateTime);
  const now = new Date();
  
  // Se a data de início for no futuro, agendar para essa data
  // Se for no passado, calcular a próxima data de acordo com a frequência
  let nextNotificationTime: Date;
  
  if (startDate > now) {
    // Data futura, simplesmente agendar para essa data
    nextNotificationTime = new Date(startDate);
  } else {
    // Data no passado, calcular próxima ocorrência
    const frequencyValue = product.frequencyValue || 8;
    // Garantir que frequencyUnit seja um valor válido
    let frequencyUnit: 'minutos' | 'horas' | 'dias' = 'horas';
    if (product.frequencyUnit === 'minutos' || product.frequencyUnit === 'horas' || product.frequencyUnit === 'dias') {
      frequencyUnit = product.frequencyUnit;
    }
    
    // Calcular intervalo em milissegundos
    let intervalMs = 0;
    switch (frequencyUnit) {
      case 'minutos':
        intervalMs = frequencyValue * 60 * 1000;
        break;
      case 'horas':
        intervalMs = frequencyValue * 60 * 60 * 1000;
        break;
      case 'dias':
        intervalMs = frequencyValue * 24 * 60 * 60 * 1000;
        break;
    }
    
    // Para intervalos muito curtos (menos de 1 minuto), forçar intervalo mínimo
    if (intervalMs < 30000) {
      console.log(`Intervalo de ${intervalMs}ms é muito curto, usando intervalo mínimo de 30 segundos`);
      intervalMs = 30000;
    }
    
    // Calcular quantos intervalos se passaram desde o início
    const timeSinceStart = now.getTime() - startDate.getTime();
    const intervals = Math.floor(timeSinceStart / intervalMs);
    
    // Calcular quando será a próxima ocorrência
    const calculatedTime = startDate.getTime() + (intervals + 1) * intervalMs;
    
    // Garantir que a próxima notificação seja no futuro (pelo menos 5 segundos no futuro)
    if (calculatedTime <= now.getTime() + 5000) {
      // Se a próxima notificação calculada for no passado ou muito próxima, agendar para o próximo intervalo
      nextNotificationTime = new Date(now.getTime() + intervalMs);
      console.log(`Próxima notificação calculada estava no passado ou muito próxima, agendada para ${intervalMs}ms a partir de agora`);
    } else {
      nextNotificationTime = new Date(calculatedTime);
    }
  }
  
  // Verificar se a data final já passou
  if (product.endDateTime) {
    const endDate = new Date(product.endDateTime);
    if (nextNotificationTime > endDate) {
      console.log(`Tratamento já finalizado para medicamento ${product.title}. Ignorando agendamento.`);
      return;
    }
  }
  
  // Gerar ID único para a tarefa
  const taskId = `${reminder.id || reminder._id}_${medicationIndex}_${Date.now()}`;
  
  // Adicionar à lista de tarefas agendadas
  scheduledTasks.push({
    id: taskId,
    reminderId: reminder.id || reminder._id || '',
    medicationIndex,
    scheduledTime: nextNotificationTime,
    webhookUrl,
    webhookSecret
  });
  
  console.log(`Notificação agendada para ${nextNotificationTime.toISOString()} para medicamento ${product.title}`);
}

// Remover todas as notificações agendadas para um lembrete
export function removeReminderNotifications(reminderId: string) {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para remover notificações');
    return;
  }

  const tasksCount = scheduledTasks.length;
  
  scheduledTasks = scheduledTasks.filter(task => task.reminderId !== reminderId);
  
  const removedCount = tasksCount - scheduledTasks.length;
  console.log(`Removidas ${removedCount} notificações agendadas para lembrete ${reminderId}`);
}

// Listar todas as tarefas agendadas (para depuração)
export function listScheduledTasks() {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para listar tarefas');
    return [];
  }

  return scheduledTasks.map(task => ({
    id: task.id,
    reminderId: task.reminderId,
    medicationIndex: task.medicationIndex,
    scheduledTime: task.scheduledTime.toISOString()
  }));
}

// Verificar se todos os tratamentos foram concluídos
async function checkReminderCompletion(reminder: Reminder, webhookUrl?: string, webhookSecret?: string) {
  if (!reminder.isActive) {
    return; // Já está inativo
  }
  
  const now = new Date();
  let allTreatmentsFinished = true;
  
  // Verificar se todos os tratamentos têm data de término e se já passaram
  for (const product of reminder.medicationProducts) {
    if (!product.endDateTime) {
      allTreatmentsFinished = false;
      break;
    }
    
    const endDate = new Date(product.endDateTime);
    if (endDate > now) {
      allTreatmentsFinished = false;
      break;
    }
  }
  
  // Se todos os tratamentos foram concluídos, marcar lembrete como inativo e enviar webhook
  if (allTreatmentsFinished && reminder.medicationProducts.length > 0) {
    console.log(`Todos os tratamentos do lembrete ${reminder.id || reminder._id} foram concluídos.`);
    
    try {
      // Importar modelo do Mongoose dinamicamente para evitar problemas de SSR/Edge
      const dbConnectPromise = import('../db').then(module => module.default);
      const ReminderModelPromise = import('../models/Reminder').then(module => module.default);
      
      // Aguardar importações dinâmicas
      const [dbConnect, ReminderModel] = await Promise.all([dbConnectPromise, ReminderModelPromise]);
      
      // Conectar ao banco de dados
      await dbConnect();
      
      // Atualizar lembrete para inativo
      await ReminderModel.findByIdAndUpdate(
        reminder.id || reminder._id,
        { isActive: false, updatedAt: new Date() }
      );
      
      console.log(`Lembrete ${reminder.id || reminder._id} marcado como inativo.`);
      
      // Enviar webhook de finalização
      if (webhookUrl) {
        const firstProduct = reminder.medicationProducts[0];
        
        const webhookPayload: WebhookPayload = {
          reminderId: reminder.id || reminder._id || '',
          tutorName: reminder.tutorName,
          petName: reminder.petName,
          petBreed: reminder.petBreed || '',
          phoneNumber: reminder.phoneNumber,
          eventType: 'reminder_finished',
          eventDescription: `Todos os tratamentos para ${reminder.petName} foram concluídos`,
          medicationProduct: {
            title: firstProduct.title,
            quantity: firstProduct.quantity,
            frequencyValue: firstProduct.frequencyValue || 0,
            frequencyUnit: firstProduct.frequencyUnit || 'horas',
            duration: firstProduct.duration || 0,
            durationUnit: firstProduct.durationUnit || 'dias',
            startDateTime: formatDateSafe(firstProduct.startDateTime),
            endDateTime: formatDateSafe(firstProduct.endDateTime)
          }
        };
        
        await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
        console.log(`Webhook de finalização enviado para lembrete ${reminder.id || reminder._id}`);
      }
      
      // Remover todas as notificações agendadas
      removeReminderNotifications(reminder.id || reminder._id || '');
    } catch (error) {
      console.error(`Erro ao marcar lembrete ${reminder.id || reminder._id} como inativo:`, error);
    }
  }
}