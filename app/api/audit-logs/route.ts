import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import dbConnect from '@/app/lib/db';
import { ObjectId } from 'mongodb';
import { getAuditLogs, logActivity } from '@/app/lib/services/auditLogService';
import { requireAdmin } from '@/app/lib/auth';
import AuditLog from '@/app/lib/models/AuditLog';

// GET /api/audit-logs - Listar logs de auditoria com filtros e paginação
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
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
    await dbConnect();
    
    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams;
    
    // Paginação
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 25; // Registros por página
    
    // Filtros
    const entity = searchParams.get('entity') || undefined;
    const action = searchParams.get('action') || undefined;
    const email = searchParams.get('email') || undefined;
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    
    // Usar a função getAuditLogs para obter os logs
    const result = await getAuditLogs({
      page,
      limit,
      entity,
      action,
      performedByEmail: email,
      startDate,
      endDate,
      sortDirection: 'desc'
    });
    
    // Retornar resultados formatados
    return NextResponse.json({
      logs: result.logs.map(log => {
        const logObj = log.toObject ? log.toObject() : log;
        return {
          ...logObj,
          _id: logObj._id?.toString() || '',
          // Garantir que entityId seja string se existir
          entityId: logObj.entityId ? logObj.entityId.toString() : undefined
        }
      }),
      pagination: result.pagination
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