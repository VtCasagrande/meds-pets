import { getServerSession } from 'next-auth';
import dbConnect from './db';
import User from './models/User';
import { NextRequest, NextResponse } from 'next/server';

// Verificar se o usuário está autenticado
export async function isAuthenticated() {
  const session = await getServerSession();
  return !!session?.user;
}

// Verificar se o usuário é um administrador ou criador
export async function isAdmin() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser && (currentUser.role === 'admin' || currentUser.role === 'creator');
}

// Verificar se o usuário é o criador
export async function isCreator() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser && currentUser.role === 'creator';
}

// Middleware para rotas que exigem autenticação
export async function requireAuth(req: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json(
      { message: 'Acesso negado. Autenticação necessária.' },
      { status: 401 }
    );
  }
  return null;
}

// Middleware para rotas que exigem papel de administrador ou criador
export async function requireAdmin(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json(
      { message: 'Acesso negado. Apenas administradores podem acessar esta API.' },
      { status: 403 }
    );
  }
  return null;
}

// Middleware para rotas que exigem papel de criador
export async function requireCreator(req: NextRequest) {
  if (!(await isCreator())) {
    return NextResponse.json(
      { message: 'Acesso negado. Apenas o criador pode acessar esta funcionalidade.' },
      { status: 403 }
    );
  }
  return null;
}

// Obter o ID do usuário atual
export async function getCurrentUserId() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return null;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser?._id.toString() || null;
}

// Verificar o papel do usuário atual
export async function getCurrentUserRole() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return null;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser?.role || null;
} 