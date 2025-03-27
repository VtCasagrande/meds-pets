import { NextRequest, NextResponse } from 'next/server';
import { startScheduler } from './lib/services/schedulerService';

let schedulerStarted = false;

export function middleware(request: NextRequest) {
  // Iniciar o agendador apenas uma vez
  if (!schedulerStarted) {
    console.log('Iniciando serviço de agendamento via middleware...');
    startScheduler();
    schedulerStarted = true;
  }
  
  return NextResponse.next();
}

// Configurar as rotas que acionarão o middleware
export const config = {
  matcher: [
    // Rotas da API de lembretes
    '/api/reminders/:path*',
  ],
}; 