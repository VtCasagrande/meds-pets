import { NextResponse } from 'next/server';

// Flag para controlar se o agendador já foi iniciado
let schedulerStarted = false;

// POST /api/scheduler/start - Iniciar o agendador de webhooks
export async function POST() {
  try {
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

// GET /api/scheduler/start - Verificar status do agendador
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    started: schedulerStarted 
  });
} 