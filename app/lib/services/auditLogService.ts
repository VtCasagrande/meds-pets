import { NextRequest } from 'next/server';
import dbConnect from '@/app/lib/db';
import AuditLog, { IAuditLog } from '../models/AuditLog';
import { getCurrentUserId } from '../auth';
import { getServerSession } from 'next-auth';
import { headers } from 'next/headers';

interface LogOptions {
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'register' | 'other';
  entity: 'reminder' | 'user' | 'webhook' | 'webhook_log' | 'scheduler' | 'audit_log' | 'system' | 'other';
  entityId?: string;
  description: string;
  details?: any;
  request?: NextRequest;
  performedByEmail?: string;
  performedById?: string;
}

/**
 * Interface para os parâmetros da função logActivity
 */
interface LogActivityParams {
  action: string;       // 'create', 'update', 'delete', 'login', 'logout', 'register', 'other'
  entity: string;       // 'reminder', 'user', 'webhook', 'webhook_log', 'audit_log', 'system', 'other'
  description: string;  // Descrição legível da ação
  details?: any;        // Detalhes adicionais sobre a ação
  entityId?: string;    // ID da entidade relacionada (se aplicável)
  performedBy?: string; // ID do usuário que realizou a ação (opcional - será obtido da sessão se não fornecido)
  performedByEmail?: string; // Email do usuário que realizou a ação (opcional)
  ipAddress?: string;   // Endereço IP (opcional - será obtido da requisição se não fornecido)
  userAgent?: string;   // User-Agent (opcional - será obtido da requisição se não fornecido)
  request?: NextRequest; // Objeto de requisição (opcional - para extrair informações adicionais)
}

/**
 * Registrar um log de auditoria
 */
export async function logActivity(params: LogActivityParams) {
  try {
    // Conectar ao banco de dados
    await dbConnect();
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Não foi possível obter a conexão com o banco de dados');
    }
    
    const collection = db.collection('auditLogs');
    
    let session;
    let headersList;
    
    // Obter a sessão atual se não foi fornecido o ID do usuário
    if (!params.performedBy || !params.performedByEmail) {
      if (params.request) {
        // Se temos o objeto de requisição, podemos obter a sessão dele
        session = await getServerSession();
      } else {
        // Caso contrário, tentar obter a sessão normalmente
        session = await getServerSession();
      }
    }
    
    // Obter cabeçalhos da requisição para IP e User-Agent se não fornecidos
    if (!params.ipAddress || !params.userAgent) {
      if (params.request) {
        // Se temos o objeto de requisição, podemos extrair as informações dele
        const requestHeaders = new Headers(params.request.headers);
        params.ipAddress = params.ipAddress || 
          requestHeaders.get('x-forwarded-for')?.split(',')[0].trim() || 
          'unknown';
        params.userAgent = params.userAgent || requestHeaders.get('user-agent') || 'unknown';
      } else {
        // Caso contrário, tentar obter dos cabeçalhos da requisição atual
        try {
          headersList = headers();
          params.ipAddress = params.ipAddress || 
            headersList.get('x-forwarded-for')?.split(',')[0].trim() || 
            'unknown';
          params.userAgent = params.userAgent || headersList.get('user-agent') || 'unknown';
        } catch (e) {
          // Fallback para valores padrão se não conseguirmos obter os cabeçalhos
          params.ipAddress = params.ipAddress || 'unknown';
          params.userAgent = params.userAgent || 'unknown';
        }
      }
    }
    
    // Criar documento do log
    const logEntry = {
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      description: params.description,
      details: params.details,
      performedBy: params.performedBy || session?.user?.id || null,
      performedByEmail: params.performedByEmail || (session?.user as any)?.email || null,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      createdAt: new Date()
    };
    
    // Inserir no banco de dados
    await collection.insertOne(logEntry);
    
    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar atividade no log de auditoria:', error);
    return { success: false, error };
  }
}

/**
 * Obter logs de auditoria com paginação e filtros
 */
export async function getAuditLogs({
  page = 1,
  limit = 25,
  entity,
  action,
  entityId,
  performedByEmail,
  startDate,
  endDate,
  sortDirection = 'desc'
}: {
  page?: number;
  limit?: number;
  entity?: string;
  action?: string;
  entityId?: string;
  performedByEmail?: string;
  startDate?: Date;
  endDate?: Date;
  sortDirection?: 'asc' | 'desc';
}) {
  await dbConnect();

  // Construir filtro
  const filter: any = {};

  if (entity) filter.entity = entity;
  if (action) filter.action = action;
  if (entityId) filter.entityId = entityId;
  if (performedByEmail) filter.performedByEmail = performedByEmail;

  // Filtrar por período
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = startDate;
    if (endDate) filter.createdAt.$lte = endDate;
  }

  // Calcular paginação
  const skip = (page - 1) * limit;

  // Ordenação
  const sort = { createdAt: sortDirection === 'asc' ? 1 : -1 } as { [key: string]: 1 | -1 };

  // Executar consulta
  const total = await AuditLog.countDocuments(filter);
  const logs = await AuditLog.find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limit);

  // Calcular total de páginas
  const totalPages = Math.ceil(total / limit);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  };
} 