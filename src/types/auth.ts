export type UserRole = 'admin' | 'editor' | 'leitor';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  created_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

