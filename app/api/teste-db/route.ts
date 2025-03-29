import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/app/lib/db';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    // Tentar conectar ao banco de dados
    console.log('Tentando conectar ao MongoDB...');
    const conn = await dbConnect();
    
    console.log('Conexão estabelecida, testando operações básicas...');
    
    // Criar um modelo de teste temporário
    const TestSchema = new mongoose.Schema({
      nome: String,
      dataTeste: { type: Date, default: Date.now }
    });
    
    // Registrar o modelo temporário (ou usar o existente)
    const TestModel = mongoose.models.TesteConexao || 
                     mongoose.model('TesteConexao', TestSchema);
    
    // Tentar criar um documento
    const novoTeste = new TestModel({
      nome: `Teste ${Date.now()}`
    });
    
    // Salvar no banco de dados
    await novoTeste.save();
    console.log('Documento de teste criado:', novoTeste._id);
    
    // Recuperar documentos
    const testes = await TestModel.find().sort({ dataTeste: -1 }).limit(5);
    
    return NextResponse.json({
      status: 'success',
      message: 'Teste de banco de dados bem-sucedido',
      connection: {
        readyState: conn.readyState,
        host: conn.host,
        name: conn.name
      },
      teste: {
        id: novoTeste._id,
        nome: novoTeste.nome,
        data: novoTeste.dataTeste
      },
      ultimosTestes: testes.map(t => ({
        id: t._id,
        nome: t.nome,
        data: t.dataTeste
      }))
    });
  } catch (error: any) {
    console.error('Erro ao testar banco de dados:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Erro ao testar banco de dados',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
} 