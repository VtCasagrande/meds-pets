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
  
  // Verificar tarefas a cada 30 segundos
  // Em produção, este intervalo seria ajustado conforme necessário
  schedulerInterval = setInterval(checkScheduledTasks, 30 * 1000);
  
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
  
  // Filtrar tarefas que devem ser executadas agora
  const tasksToRun = scheduledTasks.filter(task => 
    task.scheduledTime <= now
  );
  
  if (tasksToRun.length > 0) {
    console.log(`Encontradas ${tasksToRun.length} tarefas para executar.`);
    
    // Remover tarefas que serão executadas da lista
    scheduledTasks = scheduledTasks.filter(task => 
      task.scheduledTime > now
    );
    
    // Executar cada tarefa
    for (const task of tasksToRun) {
      await executeTask(task);
    }
  } else {
    console.log('Nenhuma tarefa para executar no momento.');
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
    console.log(`Enviando webhook para ${webhookUrl}`);
    
    // Configurar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }
    
    // Enviar webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    const status = response.status;
    console.log(`Resposta do webhook: status ${status}`);
    
    if (status >= 200 && status < 300) {
      console.log('Webhook enviado com sucesso.');
    } else {
      console.error(`Erro ao enviar webhook: status ${status}`);
    }
  } catch (error) {
    console.error('Erro ao enviar webhook:', error);
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
    
    // Calcular quantos intervalos se passaram desde o início
    const timeSinceStart = now.getTime() - startDate.getTime();
    const intervals = Math.floor(timeSinceStart / intervalMs);
    
    // Calcular quando será a próxima ocorrência
    nextNotificationTime = new Date(startDate.getTime() + (intervals + 1) * intervalMs);
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