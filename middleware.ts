// Middleware vazio para evitar erro de "must export a middleware or a default function"
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Rotas que requerem autenticação
const protectedRoutes = [
  '/reminders/new',
  '/reminders/[id]/edit',
  '/profile',
  '/permissions',
];

// Rotas que requerem permissão de administrador
const adminRoutes = [
  '/admin',
];

// Rotas que requerem permissão de criador
const creatorRoutes = [
  '/webhook',
  '/webhook-logs',
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
  
  // Verificar se é uma rota exclusiva do criador
  const isCreatorRoute = creatorRoutes.some(route => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
  
  // Se não for nenhum tipo de rota restrita, continuar
  if (!isProtectedRoute && !isAdminRoute && !isCreatorRoute) {
    return NextResponse.next();
  }
  
  // Verificar o token de autenticação
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  // Adicionar tipagem ao token para incluir o papel "creator"
  type UserRole = 'user' | 'admin' | 'creator' | undefined;
  const userRole = token?.role as UserRole;
  
  // Se não estiver autenticado e for qualquer tipo de rota protegida, redirecionar para o login
  if (!token && (isProtectedRoute || isAdminRoute || isCreatorRoute)) {
    const url = new URL('/auth/login', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }
  
  // Se for uma rota de administrador, verificar se o usuário é administrador ou criador
  if (isAdminRoute && userRole !== 'admin' && userRole !== 'creator') {
    // Se não for administrador ou criador, redirecionar para a página inicial
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Se for uma rota exclusiva do criador, verificar se o usuário é criador
  if (isCreatorRoute && userRole !== 'creator') {
    // Se não for criador, redirecionar para a página inicial
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