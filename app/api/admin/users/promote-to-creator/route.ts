import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import User from '@/app/lib/models/User';
import { requireCreator } from '@/app/lib/auth';
import { Types } from 'mongoose';

// POST /api/admin/users/promote-to-creator - Promover um usuário para o papel de criador
export async function POST(request: NextRequest) {
  try {
    // Verificar permissão - apenas o criador pode promover outros usuários a criador
    const authError = await requireCreator(request);
    if (authError) return authError;
    
    // Obter dados da requisição
    const data = await request.json();
    const { email } = data;
    
    if (!email) {
      return NextResponse.json(
        { message: 'Email é obrigatório' },
        { status: 400 }
      );
    }
    
    // Conectar ao banco de dados
    await dbConnect();
    
    // Verificar se o usuário existe
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se o usuário já é um criador
    if (user.role === 'creator') {
      return NextResponse.json(
        { message: 'Usuário já possui o papel de criador' },
        { status: 400 }
      );
    }
    
    // Atualizar o papel do usuário para criador
    user.role = 'creator';
    await user.save();
    
    return NextResponse.json({
      message: 'Usuário promovido a criador com sucesso',
      user: {
        id: user._id instanceof Types.ObjectId ? user._id.toString() : String(user._id),
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro ao promover usuário a criador:', error);
    return NextResponse.json(
      { message: 'Erro ao promover usuário a criador' },
      { status: 500 }
    );
  }
} 