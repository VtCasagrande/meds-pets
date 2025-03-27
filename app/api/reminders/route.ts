import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';

// GET /api/reminders - Listar todos os lembretes
export async function GET() {
  try {
    await dbConnect();
    
    // Buscar lembretes ativos e não ativos
    const activeReminders = await Reminder.find({ isActive: true }).sort({ createdAt: -1 });
    const completedReminders = await Reminder.find({ isActive: false }).sort({ createdAt: -1 });
    
    return NextResponse.json({
      activeReminders,
      completedReminders
    });
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar lembretes' },
      { status: 500 }
    );
  }
}

// POST /api/reminders - Criar um novo lembrete
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validação básica
    if (!body.tutorName || !body.petName || !body.phoneNumber || !body.medicationProducts || body.medicationProducts.length === 0) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Criar novo lembrete
    const reminder = new Reminder(body);
    await reminder.save();
    
    // Agendar webhooks para cada medicamento
    for (const product of body.medicationProducts) {
      // Aqui você pode incluir a lógica para agendar os webhooks
      // Ou chamar um serviço externo para agendar as notificações
      console.log(`Agendando webhook para medicamento ${product.title} em ${product.startDateTime}`);
    }
    
    return NextResponse.json(reminder, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    );
  }
} 