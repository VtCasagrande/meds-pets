import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import dbConnect from '@/app/lib/db';
import User, { IUser } from '@/app/lib/models/User';
import { Document, Types } from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Conectar ao banco de dados
    await dbConnect();

    // Verificar se o e-mail já está em uso
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { message: 'Este e-mail já está sendo usado' },
        { status: 409 }
      );
    }

    // Hash da senha
    const hashedPassword = await hash(password, 12);

    // Verificar se é o primeiro usuário (admin) ou o email específico do criador
    const userCount = await User.countDocuments();
    let role = 'user';
    
    if (userCount === 0) {
      role = 'admin';
    } else if (email.toLowerCase() === 'casagrandevitor@gmail.com') {
      role = 'creator';
    }

    // Criar o novo usuário
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    }) as IUser & Document;

    // Retornar resposta sem expor a senha
    const user = {
      id: newUser._id instanceof Types.ObjectId ? newUser._id.toString() : String(newUser._id),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt
    };

    return NextResponse.json({ message: 'Usuário criado com sucesso', user }, { status: 201 });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    return NextResponse.json(
      { message: 'Erro ao registrar usuário' },
      { status: 500 }
    );
  }
} 