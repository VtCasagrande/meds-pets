import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import WebhookLog from '@/app/lib/models/WebhookLog';

// GET /api/webhook-logs - Listar todos os logs de webhook
export async function GET(request: NextRequest) {
  console.log('GET /api/webhook-logs - Iniciando busca de logs de webhook');
  
  try {
    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const reminderId = searchParams.get('reminderId');
    const eventType = searchParams.get('eventType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const success = searchParams.get('success');
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Construir filtro
    const filter: any = {};
    
    if (reminderId) {
      filter.reminderId = reminderId;
    }
    
    if (eventType) {
      filter.eventType = eventType;
    }
    
    if (success !== null) {
      filter.success = success === 'true';
    }
    
    // Filtrar por período de datas se fornecido
    if (startDate || endDate) {
      filter.createdAt = {};
      
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }
    
    // Calcular skip para paginação
    const skip = (page - 1) * limit;
    
    // Buscar total de registros para paginação
    const total = await WebhookLog.countDocuments(filter);
    
    // Buscar logs de webhook com paginação
    console.log('Buscando logs de webhook...');
    const logs = await WebhookLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Encontrados ${logs.length} logs de webhook`);
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Erro ao buscar logs de webhook:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao buscar logs de webhook' },
      { status: 500 }
    );
  }
} 