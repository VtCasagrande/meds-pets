import mongoose from 'mongoose';

// Definir a URI do MongoDB baseada nas variáveis de ambiente
const MONGODB_URI = process.env.MONGODB_URI;

// Verificações e logs detalhados para depuração
console.log('Iniciando serviço de conexão MongoDB...');
console.log('Variáveis de ambiente carregadas:', {
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
  MONGODB_URI_EXISTS: !!MONGODB_URI,
});

// Verificar se a URI do MongoDB está definida
if (!MONGODB_URI) {
  console.error('ERRO CRÍTICO: Variável de ambiente MONGODB_URI não encontrada!');
  throw new Error(
    'Por favor, defina a variável de ambiente MONGODB_URI'
  );
}

// Verificar se a URI parece ser válida
if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.error('ERRO CRÍTICO: Formato da URI do MongoDB inválido:', 
    MONGODB_URI.replace(/mongo.*?:\/\/.*?@/, 'mongo***://***@'));
  throw new Error(
    'Formato da URI do MongoDB inválido. Deve começar com mongodb:// ou mongodb+srv://'
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
  console.log('Cache global do mongoose inicializado');
}

async function dbConnect() {
  console.log('dbConnect chamado - verificando conexão existente...');
  
  // Se já temos uma conexão, retorná-la
  if (cached.conn) {
    console.log('Usando conexão existente com MongoDB');
    return cached.conn;
  }

  // Se ainda não temos uma promessa de conexão, criá-la
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Adicionar retry e timeout
      serverSelectionTimeoutMS: 20000, // Aumentado para 20s
      socketTimeoutMS: 60000, // Aumentado para 60s
      connectTimeoutMS: 20000, // Aumentado para 20s
      // Aumentar retries
      maxPoolSize: 10,
      minPoolSize: 5,
      retryWrites: true,
      retryReads: true
    };

    console.log('Iniciando nova conexão ao MongoDB...');
    
    // Usar a versão verificada para evitar erro de tipo
    // Mascarar as credenciais nos logs
    const maskedUri = MONGODB_URI_VERIFIED.replace(/mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/, 'mongodb$1://***:***@');
    console.log('URI do MongoDB (mascarada):', maskedUri);
    console.log('Tentando conectar com as seguintes opções:', JSON.stringify(opts, null, 2));

    cached.promise = mongoose.connect(MONGODB_URI_VERIFIED, opts)
      .then((mongoose) => {
        console.log('Conectado ao MongoDB com sucesso!');
        console.log('Nome da Database:', mongoose.connection.name);
        console.log('Host do MongoDB:', mongoose.connection.host);
        console.log('Detalhes da conexão:', {
          readyState: mongoose.connection.readyState,
          modelNames: mongoose.modelNames(),
          collections: Object.keys(mongoose.connection.collections)
        });
        return mongoose.connection;
      })
      .catch((error) => {
        console.error('Erro ao conectar ao MongoDB:', error);
        if (error.name === 'MongoServerSelectionError') {
          console.error('Detalhes do erro de conexão:', {
            message: error.message,
            reason: error.reason?.toString(),
            hosts: JSON.stringify(error.topology?.s?.description?.servers || {}),
          });
        }
        if (error.name === 'MongoNetworkError') {
          console.error('Erro de rede MongoDB:', {
            message: error.message,
            dnsHostname: error.dnsHostname,
            errorLabels: error.errorLabels
          });
        }
        cached.promise = null;
        throw error;
      });
  }
  
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    console.error('Erro ao resolver a promessa de conexão:', e);
    cached.promise = null;
    throw e;
  }
}

export default dbConnect; 