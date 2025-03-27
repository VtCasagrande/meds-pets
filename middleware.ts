import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname } = url;

  // Redirecionar as URLs da pasta routes para os endpoints corretos
  if (pathname.startsWith('/routes/')) {
    url.pathname = pathname.replace('/routes/', '/');
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/routes/:path*'],
}; 