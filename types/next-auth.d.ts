import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  /**
   * Estende o objeto User padrão
   */
  interface User {
    id?: string;
    role?: 'admin' | 'user';
  }
  
  /**
   * Estende o objeto session.user
   */
  interface Session {
    user?: {
      id?: string;
      role?: 'admin' | 'user';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  /**
   * Estende o objeto JWT
   */
  interface JWT {
    id?: string;
    role?: 'admin' | 'user';
  }
} 