import mongoose from 'mongoose';

// Definir a URI do MongoDB baseada nas variáveis de ambiente
const MONGODB_URI = process.env.MONGODB_URI;

// Verificar se a URI do MongoDB está definida
if (!MONGODB_URI) {
  throw new Error(
    'Por favor, defina a variável de ambiente MONGODB_URI'
  );
}

// Como já verificamos que MONGODB_URI não é undefined acima, podemos definir uma constante para TypeScript
const MONGODB_URI_VERIFIED: string = MONGODB_URI;

// Definir a interface para o cache
interface MongooseCache {
  conn: mongoose.Connection | null;
  promise: Promise<mongoose.Connection> | null;
}

// Adicionar tipagem para o objeto global
declare global {
  var mongoose: MongooseCache | undefined;
}

// Garantir que cached não seja undefined
let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function dbConnect() {
  // Se já temos uma conexão, retorná-la
  if (cached.conn) {
    return cached.conn;
  }

  // Se ainda não temos uma promessa de conexão, criá-la
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Adicionar retry e timeout
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    console.log('Conectando ao MongoDB...');
    
    // Usar a versão verificada para evitar erro de tipo
    console.log('URI do MongoDB:', MONGODB_URI_VERIFIED.replace(/mongo:\/\/.*?@/, 'mongo://*****@'));

    cached.promise = mongoose.connect(MONGODB_URI_VERIFIED, opts)
      .then((mongoose) => {
        console.log('Conectado ao MongoDB com sucesso!');
        return mongoose.connection;
      })
      .catch((error) => {
        console.error('Erro ao conectar ao MongoDB:', error);
        cached.promise = null;
        throw error;
      });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

export default dbConnect; 