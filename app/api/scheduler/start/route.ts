import { NextRequest, NextResponse } from 'next/server';
import { requireCreator } from '@/app/lib/auth';

// Flag para controlar se o agendador já foi iniciado
let schedulerStarted = false;

// POST /api/scheduler/start - Iniciar o agendador de webhooks (somente criador)
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão - apenas o criador pode iniciar o agendador
    const authError = await requireCreator(request);
    if (authError) return authError;
    
    // Verificar se o agendador já foi iniciado
    if (schedulerStarted) {
      return NextResponse.json({ 
        success: true, 
        message: 'Agendador já estava iniciado' 
      });
    }
    
    // Verificar se estamos em ambiente Node.js e não Edge
    if (typeof process === 'undefined' || process.env.NEXT_RUNTIME === 'edge') {
      return NextResponse.json({ 
        success: false, 
        message: 'Não é possível iniciar o agendador no ambiente Edge Runtime' 
      }, { status: 400 });
    }
    
    // Importar e iniciar o agendador dinamicamente
    try {
      const { startScheduler } = await import('@/app/lib/services/schedulerService');
      startScheduler();
      schedulerStarted = true;
      
      return NextResponse.json({ 
        success: true, 
        message: 'Agendador iniciado com sucesso' 
      });
    } catch (error) {
      console.error('Erro ao iniciar o agendador:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao iniciar o agendador', 
        error: error instanceof Error ? error.message : String(error) 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro na rota de iniciar agendador:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Erro interno do servidor', 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

// GET /api/scheduler/start - Verificar status do agendador (somente criador)
export async function GET(request: NextRequest) {
  try {
    // Verificar permissão - apenas o criador pode verificar o status do agendador
    const authError = await requireCreator(request);
    if (authError) return authError;
    
    return NextResponse.json({ 
      success: true, 
      started: schedulerStarted 
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