import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import dbConnect from '@/app/lib/db';
import User from '@/app/lib/models/User';

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

    // Criar o primeiro usuário como admin, os demais como usuários comuns
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'admin' : 'user';

    // Criar o novo usuário
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    // Retornar resposta sem expor a senha
    const user = {
      id: newUser._id.toString(),
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