// Middleware vazio para evitar erro de "must export a middleware or a default function"
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rotas que requerem autenticação
const protectedRoutes = [
  '/reminders/new',
  '/reminders/[id]/edit',
  '/webhook',
  '/webhook-logs',
  '/scheduler',
];

// Rotas que requerem permissão de administrador
const adminRoutes = [
  '/admin',
  '/scheduler',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => {
    if (route.includes('[')) {
      // Para rotas dinâmicas como /reminders/[id]/edit
      const baseRoute = route.split('/').slice(0, -1).join('/');
      const pattern = route.replace(/\[\w+\]/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(pathname) || pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });
  
  // Verificar se é uma rota de administrador
  const isAdminRoute = adminRoutes.some(route => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
  
  // Se não for uma rota protegida, continuar
  if (!isProtectedRoute && !isAdminRoute) {
    return NextResponse.next();
  }
  
  // Verificar o token de autenticação
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Se não estiver autenticado e for uma rota protegida, redirecionar para o login
  if (!token && isProtectedRoute) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }
  
  // Se for uma rota de administrador, verificar se o usuário é administrador
  if (isAdminRoute && token?.role !== 'admin') {
    // Se não for administrador, redirecionar para a página inicial
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Permitir o acesso se todas as verificações forem aprovadas
  return NextResponse.next();
}

// Configuração de matcher para definir em quais rotas este middleware será aplicado
export const config = {
  matcher: [
    /*
     * Corresponde a todas as rotas, exceto:
     * 1. Rotas de API (incluindo rotas de autenticação do NextAuth.js)
     * 2. Rotas de recursos estáticos (arquivos em /public)
     * 3. Rotas de arquivos específicos como favicon.ico
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 