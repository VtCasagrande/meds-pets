import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/app/lib/db';
import { ObjectId } from 'mongodb';
import { getAuditLogs, logActivity } from '@/app/lib/services/auditLogService';
import { requireAdmin } from '@/app/lib/auth';

// GET /api/audit-logs - Listar logs de auditoria com filtros e paginação
export async function GET(request: NextRequest) {
  const session = await getServerSession();
  
  // Verificar autenticação
  if (!session) {
    return NextResponse.json(
      { error: 'Não autorizado' },
      { status: 401 }
    );
  }
  
  // Verificar permissões (apenas admin e creator podem ver logs)
  if ((session.user as any)?.role !== 'admin' && (session.user as any)?.role !== 'creator') {
    return NextResponse.json(
      { error: 'Permissão negada' },
      { status: 403 }
    );
  }
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    const mongoose = await import('mongoose');
    const db = mongoose.connection.db;
    console.log('Conexão estabelecida com sucesso');
    
    if (!db) {
      throw new Error('Não foi possível obter a conexão com o banco de dados');
    }
    
    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams;
    
    // Paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 25; // Registros por página
    const skip = (page - 1) * limit;
    
    // Filtros
    const entity = searchParams.get('entity');
    const action = searchParams.get('action');
    const email = searchParams.get('email');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Construir query de filtro
    const filter: any = {};
    
    if (entity) {
      filter.entity = entity;
    }
    
    if (action) {
      filter.action = action;
    }
    
    if (email) {
      filter.performedByEmail = { $regex: email, $options: 'i' }; // Case insensitive
    }
    
    // Filtro de período (data)
    if (startDate || endDate) {
      filter.createdAt = {};
      
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        // Adicionar 1 dia para incluir todo o dia final
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        filter.createdAt.$lt = endDateObj;
      }
    }
    
    // Obter total de registros para a paginação
    const total = await db.collection('auditLogs').countDocuments(filter);
    
    // Obter logs com paginação e ordenados por data de criação (mais recentes primeiro)
    const logs = await db
      .collection('auditLogs')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    
    // Retornar resultados formatados
    return NextResponse.json({
      logs: logs.map(log => ({
        ...log,
        _id: log._id.toString(),
        // Garantir que entityId seja string se existir
        entityId: log.entityId ? log.entityId.toString() : undefined
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar logs de auditoria' },
      { status: 500 }
    );
  }
}

// POST /api/audit-logs - Criar um log de auditoria manualmente (para testes)
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão - apenas administradores e criadores podem criar logs manualmente
    const authError = await requireAdmin(request);
    if (authError) return authError;
    
    // Obter dados da requisição
    const data = await request.json();
    const { action, entity, entityId, description, details } = data;
    
    // Validar dados necessários
    if (!action || !entity || !description) {
      return NextResponse.json(
        { error: 'action, entity e description são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Registrar log de auditoria
    await logActivity({
      action,
      entity,
      entityId,
      description,
      details,
      request
    });
    
    return NextResponse.json({
      success: true,
      message: 'Log de auditoria criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar log de auditoria:', error);
    return NextResponse.json(
      { error: 'Erro ao criar log de auditoria' },
      { status: 500 }
    );
  }
} 