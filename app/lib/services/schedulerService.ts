import { Reminder } from '../types';
import { WebhookPayload, WebhookEventType } from '../types';
import dbConnect from '../db';
import { Types } from 'mongoose';

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

// Variáveis de monitoramento para o agendador
let schedulerStartTime: Date | null = null;
let schedulerLastCheck: Date | null = null;
let schedulerCheckInterval: number = 15 * 1000; // 15 segundos padrão

// Função auxiliar para formatar data segura (independente do tipo)
function formatDateSafe(date: any): string {
  if (!date) return '';
  if (typeof date === 'string') return date;
  if (date && typeof date.toISOString === 'function') return date.toISOString();
  return '';
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
        id: reminderDoc._id ? (reminderDoc._id instanceof Types.ObjectId ? reminderDoc._id.toString() : String(reminderDoc._id)) : '',
        _id: reminderDoc._id ? (reminderDoc._id instanceof Types.ObjectId ? reminderDoc._id.toString() : String(reminderDoc._id)) : '',
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
export function startScheduler(): boolean {
  // Verificar se estamos em ambiente de servidor (não Edge)
  if (!isNodeEnvironment) {
    console.log('Agendador não iniciado: ambiente não suportado');
    return false;
  }

  if (schedulerInterval) {
    return true; // Já está rodando
  }
  
  console.log('Iniciando serviço de agendamento de webhooks...');
  
  // Registrar o tempo de início
  schedulerStartTime = new Date();
  
  // Verificar tarefas a cada 15 segundos para garantir boa resposta em intervalos curtos
  schedulerCheckInterval = 15 * 1000;
  schedulerInterval = setInterval(() => {
    schedulerLastCheck = new Date();
    checkScheduledTasks();
  }, schedulerCheckInterval);
  
  // Verificar lembretes concluídos uma vez ao iniciar
  checkAllCompletedReminders();
  
  // E depois a cada 5 minutos (em vez de diariamente)
  setInterval(checkAllCompletedReminders, 5 * 60 * 1000);
  
  console.log('Serviço de agendamento iniciado.');
  return true;
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
    
    // Listar detalhes das tarefas a serem executadas
    tasksToRun.forEach((task, index) => {
      console.log(`  ${index + 1}. Tarefa ${task.id} - Agendada para: ${task.scheduledTime.toISOString()}`);
    });
    
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
        const timeUntilFormatted = formatTimeInterval(timeUntil);
        console.log(`- Tarefa ${task.id} para lembrete ${task.reminderId} em ${timeUntil} segundos (${timeUntilFormatted}) - Programada para ${task.scheduledTime.toISOString()}`);
      });
    }
  }
}

// Função auxiliar para formatar intervalo de tempo
function formatTimeInterval(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} segundos`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutos e ${seconds % 60} segundos`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours} horas e ${minutes} minutos`;
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return `${days} dias e ${hours} horas`;
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
    console.log(`Executando tarefa para medicamento: ${medicationProduct.title}`);
    console.log(`📋 DETALHES DA FREQUÊNCIA: ${medicationProduct.frequencyValue} ${medicationProduct.frequencyUnit}`);
    
    // Obter as configurações de webhook do lembrete ou da tarefa
    const webhookUrl = reminder.webhookUrl || task.webhookUrl || process.env.WEBHOOK_URL;
    const webhookSecret = reminder.webhookSecret || task.webhookSecret || process.env.WEBHOOK_SECRET;
    
    console.log(`Configurações de webhook - URL: ${webhookUrl || 'não configurada'}, Secret: ${webhookSecret ? 'configurado' : 'não configurado'}`);
    
    // Validar tipos de frequencyUnit e durationUnit
    const validFrequencyUnit = validateFrequencyUnit(medicationProduct.frequencyUnit);
    const validDurationUnit = validateDurationUnit(medicationProduct.durationUnit);
    
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
        frequencyUnit: validFrequencyUnit,
        duration: medicationProduct.duration || 0,
        durationUnit: validDurationUnit,
        startDateTime: formatDateSafe(medicationProduct.startDateTime),
        endDateTime: formatDateSafe(medicationProduct.endDateTime)
      }
    };
    
    // Enviar webhook
    if (webhookUrl) {
      console.log(`📤 ENVIANDO WEBHOOK para a frequência ${medicationProduct.frequencyValue} ${medicationProduct.frequencyUnit}`);
      const result = await sendWebhook(webhookPayload, webhookUrl, webhookSecret);
      if (result && result.success) {
        console.log(`✅ Webhook enviado com sucesso para a frequência ${medicationProduct.frequencyValue} ${medicationProduct.frequencyUnit}`);
      } else {
        console.error(`❌ Falha ao enviar webhook: ${result?.message || 'erro desconhecido'}`);
      }
    } else {
      console.log('URL de webhook não configurada, pulando envio de notificação');
    }
    
    console.log(`Tarefa ${task.id} executada com sucesso.`);
    
    // Agendar próxima notificação
    // Para frequências em minutos, agendar imediatamente a próxima
    const now = new Date();
    
    // Determinar o intervalo em milissegundos
    let intervalMs = 0;
    const frequencyValue = medicationProduct.frequencyValue || 8;
    const frequencyUnit = validateFrequencyUnit(medicationProduct.frequencyUnit);
    
    // Calcular intervalo em milissegundos
    switch (frequencyUnit) {
      case 'minutos':
        intervalMs = frequencyValue * 60 * 1000;
        console.log(`Frequência em minutos: ${frequencyValue} (${intervalMs}ms)`);
        break;
      case 'horas':
        intervalMs = frequencyValue * 60 * 60 * 1000;
        console.log(`Frequência em horas: ${frequencyValue} (${intervalMs}ms)`);
        break;
      case 'dias':
        intervalMs = frequencyValue * 24 * 60 * 60 * 1000;
        console.log(`Frequência em dias: ${frequencyValue} (${intervalMs}ms)`);
        break;
    }
    
    // Data para a próxima notificação (agora + intervalo)
    const nextNotificationTime = new Date(now.getTime() + intervalMs);
    
    // Verificar se a data final já passou
    let shouldScheduleNext = true;
    
    if (medicationProduct.endDateTime) {
      const endDate = new Date(medicationProduct.endDateTime);
      console.log(`Data de término: ${endDate.toISOString()}`);
      
      if (nextNotificationTime > endDate) {
        console.log(`Tratamento finalizado para medicamento ${medicationProduct.title}. Não agendando próxima notificação.`);
        shouldScheduleNext = false;
      }
    }
    
    if (shouldScheduleNext) {
      // Gerar ID único para a tarefa
      const taskId = `${reminder.id || reminder._id}_${task.medicationIndex}_${Date.now()}`;
      
      // Adicionar à lista de tarefas agendadas com as configurações de webhook do lembrete
      scheduledTasks.push({
        id: taskId,
        reminderId: reminder.id || reminder._id || '',
        medicationIndex: task.medicationIndex,
        scheduledTime: nextNotificationTime,
        webhookUrl: webhookUrl,
        webhookSecret: webhookSecret
      });
      
      console.log(`📅 PRÓXIMA NOTIFICAÇÃO agendada para ${nextNotificationTime.toISOString()}`);
      console.log(`⏱️ Tempo até a próxima notificação: ${Math.round(intervalMs/1000)} segundos`);
    }
    
    // Verificar se todos os tratamentos foram concluídos
    await checkReminderCompletion(reminder, webhookUrl, webhookSecret);
  } catch (error) {
    console.error(`Erro ao executar tarefa ${task.id}:`, error);
  }
}

// Enviar webhook
async function sendWebhook(payload: WebhookPayload, webhookUrl?: string, webhookSecret?: string) {
  if (!webhookUrl) {
    console.warn('⚠️ Nenhuma URL de webhook configurada para o lembrete, não será possível enviar a notificação!');
    console.warn('Configure a URL do webhook na página de configurações ou diretamente no objeto do lembrete.');
    return { status: 0, success: false, message: 'Nenhuma URL de webhook configurada' };
  }
  
  try {
    console.log(`Enviando webhook para ${webhookUrl} - Tipo: ${payload.eventType}`);
    
    // Verificar se o webhook é para o GitHub
    const isGitHubWebhook = webhookUrl.includes('github.com') || webhookUrl.includes('api.github.com');
    
    // Configurar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };
    
    // Adicionar o token de autenticação para GitHub se for um webhook do GitHub
    if (isGitHubWebhook && webhookSecret) {
      headers['Authorization'] = `Bearer ${webhookSecret}`;
      console.log('GitHub token configurado no header');
    } else if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
      console.log('Webhook Secret configurado no header');
    }
    
    // Definir o tipo para o payload final
    type FinalPayloadType = WebhookPayload | {
      message: string;
      content: string;
      branch: string;
    };
    
    // Formatar payload específico para o GitHub se for um webhook do GitHub
    let finalPayload: FinalPayloadType = payload;
    
    if (isGitHubWebhook) {
      // Criar payload específico para o GitHub
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const eventType = payload.eventType.replace(/_/g, '-');
      const fileName = `${eventType}-${timestamp}.json`;
      
      const commitMessage = `Atualização: ${payload.eventType} para ${payload.petName} - ${payload.medicationProduct.title}`;
      
      // Verificar se o webhookUrl contém o caminho completo para criar o arquivo
      let apiPath = webhookUrl;
      
      // Se a URL não termina com o caminho do arquivo, adicionar o caminho do arquivo
      if (!apiPath.includes('/contents/')) {
        const repoPath = apiPath.split('/repos/')[1];
        if (repoPath) {
          const [owner, repo] = repoPath.split('/');
          apiPath = `https://api.github.com/repos/${owner}/${repo}/contents/webhooks/${fileName}`;
        }
      } else if (!apiPath.endsWith('.json')) {
        apiPath = `${apiPath}/${fileName}`;
      }
      
      console.log(`URL final do GitHub: ${apiPath}`);
      
      const githubPayload = {
        message: commitMessage,
        content: Buffer.from(JSON.stringify(payload, null, 2)).toString('base64'),
        branch: 'main'
      };
      
      finalPayload = githubPayload;
      webhookUrl = apiPath;
      
      console.log('Payload formatado para GitHub:', finalPayload);
    }
    
    // Enviar webhook
    console.log(`Iniciando requisição POST para ${webhookUrl}...`);
    const startTime = Date.now();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(finalPayload)
    });
    
    const elapsedTime = Date.now() - startTime;
    const status = response.status;
    console.log(`✅ Resposta do webhook recebida: status ${status}, tempo: ${elapsedTime}ms`);
    
    // Variável para armazenar o texto da resposta
    let responseText = '';
    
    // Tentar obter corpo da resposta
    try {
      responseText = await response.text();
      if (responseText) {
        console.log(`Resposta do webhook: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      }
    } catch (textError) {
      console.error('Não foi possível obter texto da resposta:', textError);
      responseText = 'Erro ao obter resposta';
    }
    
    const success = status >= 200 && status < 300;
    
    if (success) {
      console.log(`✅ Webhook ${payload.eventType} enviado com sucesso para ${webhookUrl}.`);
      if (isGitHubWebhook) {
        console.log('✅ Atualização enviada para o GitHub com sucesso!');
      }
    } else {
      console.error(`❌ Erro ao enviar webhook ${payload.eventType}: status ${status}`);
      console.error(`Resposta: ${responseText}`);
    }
    
    // Registrar o log no banco de dados
    try {
      // Importar modelo do Mongoose dinamicamente
      const dbConnectPromise = import('../db').then(module => module.default);
      const WebhookLogModelPromise = import('../models/WebhookLog').then(module => module.default);
      
      // Aguardar importações dinâmicas
      const [dbConnect, WebhookLogModel] = await Promise.all([dbConnectPromise, WebhookLogModelPromise]);
      
      // Conectar ao banco de dados
      await dbConnect();
      
      // Criar registro de log
      await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: status,
        response: responseText.substring(0, 1000), // Limitar tamanho da resposta
        success: success,
        isGitHub: isGitHubWebhook,
        createdAt: new Date()
      });
      
      console.log(`📝 Log de webhook ${payload.eventType} registrado com sucesso.`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return { status, success, message: responseText };
  } catch (error) {
    console.error(`❌ Erro ao enviar webhook ${payload.eventType}:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Detalhes do erro: ${errorMessage}`);
    
    // Registrar erro no banco de dados
    try {
      // Importar modelo do Mongoose dinamicamente
      const dbConnectPromise = import('../db').then(module => module.default);
      const WebhookLogModelPromise = import('../models/WebhookLog').then(module => module.default);
      
      // Aguardar importações dinâmicas
      const [dbConnect, WebhookLogModel] = await Promise.all([dbConnectPromise, WebhookLogModelPromise]);
      
      // Conectar ao banco de dados
      await dbConnect();
      
      // Criar registro de log de erro
      await WebhookLogModel.create({
        reminderId: payload.reminderId,
        eventType: payload.eventType,
        eventDescription: payload.eventDescription,
        payload: payload,
        statusCode: 0,
        response: errorMessage,
        success: false,
        createdAt: new Date()
      });
      
      console.log(`📝 Log de erro de webhook registrado.`);
    } catch (logError) {
      console.error(`Erro ao registrar log de webhook:`, logError);
    }
    
    return { status: 0, success: false, message: errorMessage };
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
      id: reminderDoc._id ? (reminderDoc._id instanceof Types.ObjectId ? reminderDoc._id.toString() : String(reminderDoc._id)) : reminderId,
      _id: reminderDoc._id ? (reminderDoc._id instanceof Types.ObjectId ? reminderDoc._id.toString() : String(reminderDoc._id)) : reminderId,
      tutorName: reminderDoc.tutorName,
      petName: reminderDoc.petName,
      petBreed: reminderDoc.petBreed || '',
      phoneNumber: reminderDoc.phoneNumber,
      isActive: reminderDoc.isActive,
      webhookUrl: reminderDoc.webhookUrl,
      webhookSecret: reminderDoc.webhookSecret,
      medicationProducts: reminderDoc.medicationProducts.map(product => {
        // Validar frequencyUnit e durationUnit
        const frequencyUnit = validateFrequencyUnit(product.frequencyUnit);
        const durationUnit = validateDurationUnit(product.durationUnit);
        
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
  reminder: any, 
  webhookUrl?: string, 
  webhookSecret?: string
): Promise<void> {
  // Verificar ambiente Node.js (não Edge)
  if (!isNodeEnvironment) {
    console.log('Agendamento de notificações pulado: ambiente não suportado');
    return;
  }

  try {
    console.log(`Agendando notificações para o lembrete ${reminder._id || 'novo'}`);
    
    // Iniciar agendador se não estiver rodando
    if (!schedulerInterval) {
      console.log('Agendador não iniciado, iniciando agora...');
      startScheduler();
    }
    
    // URL e segredo do webhook (preferência para os valores passados como parâmetro)
    const hookUrl = webhookUrl || process.env.WEBHOOK_URL || '';
    const hookSecret = webhookSecret || process.env.WEBHOOK_SECRET || '';
    
    if (!hookUrl) {
      console.log('Nenhuma URL de webhook configurada para notificações');
    }
    
    // Verificar se o lembrete é válido
    if (!reminder || !reminder.medicationProducts || !Array.isArray(reminder.medicationProducts)) {
      console.error('Lembrete inválido para agendamento:', reminder);
      return;
    }
    
    // ID do lembrete seguro (garantindo string para uso em comparações)
    const reminderId = reminder._id ? 
      (reminder._id instanceof Types.ObjectId ? reminder._id.toString() : String(reminder._id)) : 
      '';
    
    if (!reminderId) {
      console.error('Lembrete sem ID não pode ser agendado');
      return;
    }
    
    // Primeiro, remover qualquer tarefa existente para este lembrete para evitar duplicação
    console.log(`Removendo tarefas existentes para o lembrete ${reminderId}`);
    removeTasksForReminder(reminderId);
    
    // Adicionar novas tarefas para cada medicamento
    const now = new Date();
    
    // Contadores para log
    let addedTasks = 0;
    let skipppedTasks = 0;
    
    // Para cada medicamento no lembrete
    await Promise.all(reminder.medicationProducts.map(async (product: any, index: number) => {
      try {
        // Validar dados do produto
        if (!product.startDateTime) {
          console.error(`Medicamento ${index} sem data de início, pulando agendamento`);
          skipppedTasks++;
          return;
        }
        
        console.log(`Agendando notificações para o medicamento "${product.title}" (índice ${index})`);
        
        // Converter para objeto Date
        const startDateTime = new Date(product.startDateTime);
        
        // Se a data de início já passou, recalcular a próxima dose
        if (startDateTime < now) {
          console.log(`Data inicial ${startDateTime.toISOString()} já passou, calculando próxima dose`);
          
          // Obter dados de frequência do medicamento
          const frequencyValue = product.frequencyValue || 8;
          const frequencyUnit = validateFrequencyUnit(product.frequencyUnit);
          
          // Verificar se temos data de término
          const endDateTime = product.endDateTime ? new Date(product.endDateTime) : null;
          
          // Se já passou da data de término, não agendar
          if (endDateTime && now > endDateTime) {
            console.log(`Medicamento ${index} já ultrapassou a data de término (${endDateTime.toISOString()}), não será agendado`);
            skipppedTasks++;
            return;
          }
          
          // Calcular tempo decorrido desde o início em milissegundos
          const elapsedMs = now.getTime() - startDateTime.getTime();
          
          // Converter frequência para milissegundos
          let frequencyMs = 0;
          switch (frequencyUnit) {
            case 'minutos':
              frequencyMs = frequencyValue * 60 * 1000;
              break;
            case 'horas':
              frequencyMs = frequencyValue * 60 * 60 * 1000;
              break;
            case 'dias':
              frequencyMs = frequencyValue * 24 * 60 * 60 * 1000;
              break;
          }
          
          // Calcular quantas doses já deveriam ter sido tomadas
          const dosesElapsed = Math.floor(elapsedMs / frequencyMs);
          
          // Calcular quando seria a próxima dose
          const nextDoseTime = new Date(startDateTime.getTime() + (dosesElapsed + 1) * frequencyMs);
          
          console.log(`Próxima dose calculada para ${nextDoseTime.toISOString()}`);
          
          // Agendar a próxima dose
          if (!endDateTime || nextDoseTime <= endDateTime) {
            console.log(`Agendando notificação para ${nextDoseTime.toISOString()}`);
            
            const taskId = `reminder_${reminderId}_med_${index}_dose_${dosesElapsed + 1}`;
            
            // Adicionar à lista de tarefas
            scheduledTasks.push({
              id: taskId,
              reminderId: reminderId,
              medicationIndex: index,
              scheduledTime: nextDoseTime,
              webhookUrl: hookUrl,
              webhookSecret: hookSecret
            });
            
            addedTasks++;
          } else {
            console.log(`Próxima dose calculada (${nextDoseTime.toISOString()}) está depois da data de término, pulando`);
            skipppedTasks++;
          }
        } else {
          // A data de início ainda não chegou, agendar normalmente
          console.log(`Agendando notificação para a data inicial ${startDateTime.toISOString()}`);
          
          const taskId = `reminder_${reminderId}_med_${index}_dose_1`;
          
          // Adicionar à lista de tarefas
          scheduledTasks.push({
            id: taskId,
            reminderId: reminderId,
            medicationIndex: index,
            scheduledTime: startDateTime,
            webhookUrl: hookUrl,
            webhookSecret: hookSecret
          });
          
          addedTasks++;
        }
      } catch (productError) {
        console.error(`Erro ao agendar notificações para o medicamento ${index}:`, productError);
      }
    }));
    
    console.log(`Agendamento completo para lembrete ${reminderId}: ${addedTasks} tarefas agendadas, ${skipppedTasks} puladas`);
    
    // Ordenar tarefas por data
    scheduledTasks.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
    
    // Verificar tarefas imediatamente após agendar
    checkScheduledTasks();
  } catch (error) {
    console.error('Erro ao agendar notificações:', error);
  }
}

// Remover tarefas agendadas para um lembrete específico
function removeTasksForReminder(reminderId: string): void {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para remover tarefas');
    return;
  }

  const tasksCount = scheduledTasks.length;
  
  // Filtrar para manter apenas tarefas que não pertencem a este lembrete
  scheduledTasks = scheduledTasks.filter(task => task.reminderId !== reminderId);
  
  const removedCount = tasksCount - scheduledTasks.length;
  console.log(`Removidas ${removedCount} tarefas agendadas para o lembrete ${reminderId}`);
}

// Alias para removeTasksForReminder para manter compatibilidade com código existente
export const removeReminderNotifications = removeTasksForReminder;

// Listar todas as tarefas agendadas (para visualização no painel)
export function listScheduledTasks() {
  if (!isNodeEnvironment) {
    console.log('Ambiente não suportado para listar tarefas');
    return [];
  }
  
  return scheduledTasks.map(task => ({
    id: task.id,
    reminderId: task.reminderId,
    medicationIndex: task.medicationIndex,
    scheduledTime: task.scheduledTime instanceof Date ? task.scheduledTime.toISOString() : task.scheduledTime,
    webhookUrl: task.webhookUrl,
    webhookSecret: task.webhookSecret ? '[SECRET]' : undefined // não expor o segredo
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
        
        // Validar tipos para garantir compatibilidade
        const validFrequencyUnit = validateFrequencyUnit(firstProduct.frequencyUnit);
        const validDurationUnit = validateDurationUnit(firstProduct.durationUnit);
        
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
            frequencyUnit: validFrequencyUnit,
            duration: firstProduct.duration || 0,
            durationUnit: validDurationUnit,
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

// Obter status do agendador
export function getSchedulerStatus() {
  return {
    isRunning: !!schedulerInterval,
    startTime: schedulerStartTime ? schedulerStartTime.toISOString() : null,
    lastCheck: schedulerLastCheck ? schedulerLastCheck.toISOString() : null,
    checkInterval: schedulerCheckInterval,
    scheduledTasksCount: scheduledTasks.length,
    uniqueRemindersCount: new Set(scheduledTasks.map(t => t.reminderId)).size
  };
}