// Middleware vazio para evitar erro de "must export a middleware or a default function"
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Retorna a requisição sem modificações
  return NextResponse.next();
}

// Opcional: Configuração de matcher para definir em quais rotas este middleware será aplicado
export const config = {
  matcher: [],
}; 