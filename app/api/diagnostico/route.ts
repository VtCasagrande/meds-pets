import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    // Verificar se a variável de ambiente existe
    if (!mongoURI) {
      return NextResponse.json({
        status: 'error',
        message: 'MONGODB_URI não está definida',
        env: {
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
        }
      }, { status: 500 });
    }
    
    // Tentar conectar diretamente com o MongoDB Client
    const { MongoClient } = require('mongodb');
    
    // Mascarar URI para o log (segurança)
    const maskedURI = mongoURI.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://***:***@');
    
    // Configurações de conexão
    const opts = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    };
    
    // Tentar estabelecer conexão
    console.log(`Tentando conectar ao MongoDB: ${maskedURI}`);
    const client = new MongoClient(mongoURI, opts);
    
    // Tentar conexão
    await client.connect();
    const dbInfo = await client.db().admin().listDatabases();
    
    // Verificar conexão do Mongoose
    const mongooseState = mongoose.connection.readyState;
    const mongooseStateText = ['Desconectado', 'Conectado', 'Conectando', 'Desconectando'][mongooseState] || 'Desconhecido';
    
    // Fechar a conexão de teste
    await client.close();
    
    // Retornar resultado positivo
    return NextResponse.json({
      status: 'success',
      message: 'Conexão com MongoDB estabelecida com sucesso',
      mongodb: {
        connected: true,
        databases: dbInfo.databases.map((db: any) => db.name),
      },
      mongoose: {
        state: mongooseState,
        stateText: mongooseStateText,
        models: Object.keys(mongoose.models),
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        MONGODB_URI_FORMAT: maskedURI,
      }
    });
  } catch (error: any) {
    // Analisar o erro
    let errorDetails = {
      name: error.name,
      message: error.message,
    };
    
    // Informações extras para tipos específicos de erro
    if (error.name === 'MongoServerSelectionError') {
      errorDetails = {
        ...errorDetails,
        reason: error.reason?.toString() || 'Desconhecido',
      };
    }
    
    return NextResponse.json({
      status: 'error',
      message: 'Erro ao conectar com MongoDB',
      error: errorDetails,
      env: {
        NODE_ENV: process.env.NODE_ENV,
      }
    }, { status: 500 });
  }
} 