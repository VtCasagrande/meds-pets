import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import WebhookLog from '@/app/lib/models/WebhookLog';
import { requireCreator } from '@/app/lib/auth';

// GET /api/webhook-logs - Listar todos os logs de webhook (somente criador)
export async function GET(request: NextRequest) {
  console.log('GET /api/webhook-logs - Iniciando busca de logs de webhook');
  
  try {
    // Verificar permissão - apenas o criador pode acessar logs de webhook
    const authError = await requireCreator(request);
    if (authError) return authError;
    
    // Obter parâmetros de consulta
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const reminderId = searchParams.get('reminderId');
    const eventType = searchParams.get('eventType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const success = searchParams.get('success');
    
    console.log(`Parâmetros de busca: page=${page}, limit=${limit}, reminderId=${reminderId || 'null'}, eventType=${eventType || 'null'}, success=${success || 'null'}`);
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Verificar se o modelo WebhookLog existe
    const modelNames = Object.keys(WebhookLog.db.models);
    console.log(`Modelos disponíveis: ${modelNames.join(', ')}`);
    console.log(`Modelo WebhookLog existe: ${modelNames.includes('WebhookLog')}`);
    
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
    
    console.log(`Filtro aplicado: ${JSON.stringify(filter)}`);
    
    // Calcular skip para paginação
    const skip = (page - 1) * limit;
    
    // Buscar total de registros para paginação
    console.log('Contando total de registros...');
    const total = await WebhookLog.countDocuments(filter);
    console.log(`Total de registros: ${total}`);
    
    // Buscar logs de webhook com paginação
    console.log('Buscando logs de webhook...');
    const logs = await WebhookLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    console.log(`Encontrados ${logs.length} logs de webhook`);
    console.log(`Exemplo do primeiro log: ${logs.length > 0 ? JSON.stringify(logs[0]) : 'nenhum'}`);
    
    // Calcular informações de paginação
    const totalPages = Math.ceil(total / limit);
    
    // Retornar resposta
    console.log(`Retornando ${logs.length} logs de webhook com informações de paginação`);
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

// POST /api/webhook-logs - Criar um log de teste (somente criador)
export async function POST(request: NextRequest) {
  console.log('POST /api/webhook-logs - Criando log de teste');
  
  try {
    // Verificar permissão - apenas o criador pode criar logs de teste
    const authError = await requireCreator(request);
    if (authError) return authError;
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Criar um log de teste
    const testLog = await WebhookLog.create({
      reminderId: 'test-' + Date.now(),
      eventType: 'test_event',
      eventDescription: 'Este é um log de teste',
      payload: { test: true, date: new Date().toISOString() },
      statusCode: 200,
      response: 'Resposta de teste',
      success: true,
      createdAt: new Date()
    });
    
    console.log(`Log de teste criado com sucesso, ID: ${testLog._id}`);
    
    // Buscar o log criado para confirmar
    const fetchedLog = await WebhookLog.findById(testLog._id);
    
    if (fetchedLog) {
      console.log('Log de teste encontrado na base de dados');
    } else {
      console.error('Log de teste NÃO encontrado na base de dados após criação!');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Log de teste criado com sucesso',
      log: testLog
    });
  } catch (error) {
    console.error('Erro ao criar log de teste:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar log de teste', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
} 