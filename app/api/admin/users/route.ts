import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import dbConnect from '@/app/lib/db';
import User, { IUser } from '@/app/lib/models/User';
import bcrypt from 'bcryptjs';
import { Document, Types } from 'mongoose';

// Verificar se o usuário é admin
async function isAdmin() {
  const session = await getServerSession();
  
  if (!session || !session.user) {
    return false;
  }
  
  await dbConnect();
  const currentUser = await User.findOne({ email: session.user.email });
  
  return currentUser && currentUser.role === 'admin';
}

export async function GET(req: NextRequest) {
  try {
    // Verificar se o usuário está autenticado e é um administrador
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Buscar todos os usuários
    const users = await User.find({})
      .select('-password') // Excluir o campo de senha
      .sort({ createdAt: -1 }) // Ordenar por data de criação (mais recentes primeiro)
      .lean(); // Converter para objeto JavaScript simples
    
    // Preparar os dados para a resposta
    const formattedUsers = users.map(user => ({
      id: user._id instanceof Types.ObjectId ? user._id.toString() : String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));
    
    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Criar um novo usuário
export async function POST(req: NextRequest) {
  try {
    // Verificar permissões de administrador
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas administradores podem criar usuários.' },
        { status: 403 }
      );
    }
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Obter dados da requisição
    const data = await req.json();
    const { name, email, password, role = 'user' } = data;
    
    // Validar dados enviados
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nome, e-mail e senha são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Verificar se o e-mail já existe
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return NextResponse.json(
        { message: 'Este e-mail já está em uso' },
        { status: 400 }
      );
    }
    
    // Validar o papel (role) do usuário
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { message: 'Função inválida. Use "admin" ou "user"' },
        { status: 400 }
      );
    }
    
    // Criar hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Criar o novo usuário
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
    });
    
    // Salvar o usuário no banco de dados
    await newUser.save();
    
    // Retornar sucesso (sem incluir a senha)
    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: {
        id: newUser._id instanceof Types.ObjectId ? newUser._id.toString() : String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return NextResponse.json(
      { message: 'Erro ao criar usuário' },
      { status: 500 }
    );
  }
}