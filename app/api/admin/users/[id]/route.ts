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

// GET /api/admin/users/[id] - Obter detalhes de um usuário específico
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões de administrador
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    const user = await User.findById(params.id).select('-password') as IUser & Document;
    
    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { message: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/[id] - Atualizar um usuário
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões de administrador
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    // Buscar o usuário existente
    const userExists = await User.findById(params.id) as IUser & Document;
    
    if (!userExists) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Obter dados da requisição
    const data = await req.json();
    const { name, email, password, role } = data;
    
    // Validar e-mail se estiver sendo atualizado
    if (email && email !== userExists.email) {
      const existingEmail = await User.findOne({ email });
      
      if (existingEmail) {
        return NextResponse.json(
          { message: 'Este e-mail já está em uso' },
          { status: 400 }
        );
      }
    }
    
    // Preparar dados para atualização
    const updateData: any = {};
    
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role && ['admin', 'user'].includes(role)) updateData.role = role;
    
    // Se a senha foi fornecida, criar hash
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }
    
    // Atualizar o usuário
    const updatedUser = await User.findByIdAndUpdate(
      params.id,
      { $set: updateData },
      { new: true }
    ).select('-password') as IUser & Document;
    
    return NextResponse.json({
      message: 'Usuário atualizado com sucesso',
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json(
      { message: 'Erro ao atualizar usuário' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Excluir um usuário
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões de administrador
    if (!(await isAdmin())) {
      return NextResponse.json(
        { message: 'Acesso negado. Apenas administradores podem acessar esta API.' },
        { status: 403 }
      );
    }
    
    await dbConnect();
    
    // Buscar o usuário existente
    const user = await User.findById(params.id) as IUser & Document;
    
    if (!user) {
      return NextResponse.json(
        { message: 'Usuário não encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar se não está tentando excluir o último administrador
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      
      if (adminCount <= 1) {
        return NextResponse.json(
          { message: 'Não é possível excluir o último administrador do sistema' },
          { status: 400 }
        );
      }
    }
    
    // Excluir o usuário
    await User.findByIdAndDelete(params.id);
    
    return NextResponse.json({
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return NextResponse.json(
      { message: 'Erro ao excluir usuário' },
      { status: 500 }
    );
  }
} 