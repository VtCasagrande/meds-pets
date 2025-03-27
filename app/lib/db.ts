import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lembrete-meds';

if (!MONGODB_URI) {
  throw new Error(
    'Please define the MONGODB_URI environment variable'
  );
}

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
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose.connection;
    });
  }
  
  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect; 