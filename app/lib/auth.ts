import { getServerSession } from 'next-auth';
import dbConnect from './db';
import User from './models/User';
import { NextRequest, NextResponse } from 'next/server';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { Document, Types } from 'mongoose';
import { IUser } from './models/User';
import { User as UserType } from './types';

// Configuração do NextAuth
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email e senha são obrigatórios');
        }

        await dbConnect();
        
        const user = await User.findOne({ email: credentials.email }) as IUser & Document;
        
        if (!user) {
          throw new Error('Usuário não encontrado');
        }
        
        const isPasswordValid = await compare(credentials.password, user.password);
        
        if (!isPasswordValid) {
          throw new Error('Senha incorreta');
        }
        
        return {
          id: user._id instanceof Types.ObjectId ? user._id.toString() : String(user._id),
          name: user.name,
          email: user.email,
          role: user.role
        } as any; // Usar any para evitar problemas de tipagem
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'creator' | 'admin' | 'user';
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },
  secret: process.env.NEXTAUTH_SECRET || 'seu-segredo-aqui-para-desenvolvimento',
};

// Verificar se o usuário está autenticado
export async function isAuthenticated() {
  const session = await getServerSession(authOptions);
  return !!session?.user;
}

// Verificar se o usuário é um administrador ou criador
export async function isAdmin() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return false;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser && (currentUser.role === 'admin' || currentUser.role === 'creator');
}

// Verificar se o usuário é o criador
export async function isCreator() {
  const session = await getServerSession(authOptions);
  
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
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return null;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser && currentUser._id ? currentUser._id.toString() : null;
}

// Verificar o papel do usuário atual
export async function getCurrentUserRole() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return null;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser?.role || null;
} 