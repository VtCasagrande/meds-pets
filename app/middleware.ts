import { NextRequest, NextResponse } from 'next/server';

// Flag para controlar se o agendador já foi iniciado
let schedulerStarted = false;

export function middleware(request: NextRequest) {
  // Verificar se estamos em ambiente de servidor (não Edge)
  if (typeof window === 'undefined' && !schedulerStarted && typeof process !== 'undefined') {
    // Importar dinamicamente apenas em ambiente Node.js
    if (process.env.NODE_ENV !== 'production' || process.env.NEXT_RUNTIME !== 'edge') {
      import('./lib/services/schedulerService').then(({ startScheduler }) => {
        console.log('Iniciando serviço de agendamento via middleware...');
        startScheduler();
        schedulerStarted = true;
      }).catch(err => {
        console.error('Erro ao iniciar serviço de agendamento:', err);
      });
    } else {
      console.log('Ambiente Edge Runtime detectado, pulando inicialização do agendador.');
    }
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