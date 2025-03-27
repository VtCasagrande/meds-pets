import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';

// GET /api/reminders/[id] - Obter detalhes de um lembrete
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    await dbConnect();
    
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(reminder);
  } catch (error) {
    console.error('Erro ao buscar detalhes do lembrete:', error);
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
  try {
    const { id } = params;
    const body = await request.json();
    
    await dbConnect();
    
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    // Atualizar dados
    const updatedReminder = await Reminder.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    
    return NextResponse.json(updatedReminder);
  } catch (error) {
    console.error('Erro ao atualizar lembrete:', error);
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
  try {
    const { id } = params;
    
    await dbConnect();
    
    const reminder = await Reminder.findById(id);
    
    if (!reminder) {
      return NextResponse.json(
        { error: 'Lembrete não encontrado' },
        { status: 404 }
      );
    }
    
    await Reminder.findByIdAndDelete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover lembrete:', error);
    return NextResponse.json(
      { error: 'Erro ao remover lembrete' },
      { status: 500 }
    );
  }
} 