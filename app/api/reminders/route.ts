import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import Reminder from '@/app/lib/models/Reminder';

// GET /api/reminders - Listar todos os lembretes
export async function GET() {
  console.log('GET /api/reminders - Iniciando busca de lembretes');
  
  try {
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Buscar lembretes ativos e não ativos
    console.log('Buscando lembretes ativos...');
    const activeReminders = await Reminder.find({ isActive: true }).sort({ createdAt: -1 });
    console.log(`Encontrados ${activeReminders.length} lembretes ativos`);
    
    console.log('Buscando lembretes finalizados...');
    const completedReminders = await Reminder.find({ isActive: false }).sort({ createdAt: -1 });
    console.log(`Encontrados ${completedReminders.length} lembretes finalizados`);
    
    return NextResponse.json({
      activeReminders,
      completedReminders
    });
  } catch (error) {
    console.error('Erro ao buscar lembretes:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao buscar lembretes' },
      { status: 500 }
    );
  }
}

// POST /api/reminders - Criar um novo lembrete
export async function POST(request: NextRequest) {
  console.log('POST /api/reminders - Iniciando criação de lembrete');
  
  try {
    const body = await request.json();
    console.log('Dados recebidos:', JSON.stringify(body, null, 2));
    
    // Validação básica
    if (!body.tutorName || !body.petName || !body.phoneNumber || !body.medicationProducts || body.medicationProducts.length === 0) {
      console.error('Dados incompletos recebidos');
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }
    
    // Conectar ao MongoDB
    console.log('Conectando ao banco de dados...');
    await dbConnect();
    console.log('Conexão estabelecida com sucesso');
    
    // Verificar formato da data nos medicamentos
    try {
      body.medicationProducts = body.medicationProducts.map(product => ({
        ...product,
        startDateTime: new Date(product.startDateTime)
      }));
      console.log('Datas dos medicamentos convertidas com sucesso');
    } catch (dateError) {
      console.error('Erro ao converter datas dos medicamentos:', dateError);
      return NextResponse.json(
        { error: 'Formato de data inválido nos medicamentos' },
        { status: 400 }
      );
    }
    
    // Criar novo lembrete
    console.log('Criando novo lembrete...');
    try {
      const reminder = new Reminder(body);
      await reminder.save();
      console.log('Lembrete criado com sucesso, ID:', reminder._id);
      
      // Agendar webhooks para cada medicamento
      for (const product of body.medicationProducts) {
        // Aqui você pode incluir a lógica para agendar os webhooks
        // Ou chamar um serviço externo para agendar as notificações
        console.log(`Agendando webhook para medicamento ${product.title} em ${product.startDateTime}`);
      }
      
      return NextResponse.json(reminder, { status: 201 });
    } catch (dbError: any) {
      console.error('Erro ao salvar no banco de dados:', dbError);
      console.error('Detalhes do erro:', {
        name: dbError.name,
        code: dbError.code,
        message: dbError.message,
        errors: dbError.errors
      });
      
      // Verificar erros de validação
      if (dbError.name === 'ValidationError') {
        const validationErrors = Object.keys(dbError.errors).reduce((acc: any, key) => {
          acc[key] = dbError.errors[key].message;
          return acc;
        }, {});
        
        return NextResponse.json(
          { error: 'Erro de validação', details: validationErrors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao salvar no banco de dados', message: dbError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Erro ao criar lembrete:', error);
    if (error instanceof Error) {
      console.error('Detalhes do erro:', error.message);
      console.error('Stack trace:', error.stack);
    }
    
    return NextResponse.json(
      { error: 'Erro ao criar lembrete' },
      { status: 500 }
    );
  }
} 