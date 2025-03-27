import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';

// GET /api/reminders/[id] - Obter detalhes de um lembrete
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`GET /api/reminders/${id} - Buscando detalhes do lembrete`);
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Buscando lembrete com ID: ${id}`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Lembrete encontrado: ${reminder._id}`);
    return NextResponse.json(reminder);
  } catch (error) {
    console.error(`Erro ao buscar detalhes do lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes do lembrete' },
      { status: 500 }
    );
  }
}

// PUT /api/reminders/[id] - Atualizar um lembrete
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`PUT /api/reminders/${id} - Atualizando lembrete`);
  
  try {
    const body = await request.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));
    
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Verificando se o lembrete ${id} existe`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    // Atualizar dados
    console.log(`Atualizando lembrete ${id}...`);
    const updatedReminder = await Reminder.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    console.log(`Lembrete ${id} atualizado com sucesso`);
    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error(`Erro ao atualizar lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao atualizar lembrete' },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[id] - Remover um lembrete
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  console.log(`DELETE /api/reminders/${id} - Removendo lembrete`);
  
  try {
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    console.log(`Verificando se o lembrete ${id} existe`);
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      console.log(`Lembrete com ID ${id} não encontrado`);
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Excluindo lembrete ${id}...`);
    await Reminder.findByIdAndDelete(id);
    
    console.log(`Lembrete ${id} excluído com sucesso`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Erro ao remover lembrete ${id}:`, error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao remover lembrete' },
      { status: 500 }
    );
  }
} 