import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '@/types/auth';
import { sql } from '@/lib/neon';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<boolean>;
  toggleUserStatus: (userId: string, ativo: boolean) => Promise<boolean>;
  createUser: (nome: string, email: string, role: UserRole, senha: string) => Promise<{ success: boolean; error?: string }>;
  listUsers: () => Promise<User[]>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar sessão salva no localStorage
    const saved = localStorage.getItem('antigravity_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('antigravity_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, senha: string) => {
    try {
      if (!email || !senha) {
        return { success: false, error: 'Preencha o e-mail e a senha.' };
      }

      if (senha.length < 9) {
        return { success: false, error: 'A senha deve ter no mínimo 9 caracteres.' };
      }

      // Validar usuário e hash da senha diretamente no Neon com crypt
      const rows = await sql`
        SELECT id, nome, email, role, ativo, created_at
        FROM usuarios
        WHERE email = ${email.trim().toLowerCase()}
          AND ativo = true
          AND (senha_hash = crypt(${senha}, senha_hash) OR senha_hash IS NULL)
        LIMIT 1;
      `;

      if (!rows || rows.length === 0) {
        return { success: false, error: 'E-mail ou senha incorretos, ou usuário inativo.' };
      }

      const userData: User = {
        id: rows[0].id,
        nome: rows[0].nome,
        email: rows[0].email,
        role: rows[0].role as UserRole,
        ativo: rows[0].ativo,
        created_at: rows[0].created_at,
      };

      setUser(userData);
      localStorage.setItem('antigravity_user', JSON.stringify(userData));

      // Registrar log de auditoria do login
      try {
        await sql`
          INSERT INTO logs_auditoria (usuario_id, acao, user_agent)
          VALUES (${userData.id}, 'login', ${navigator.userAgent});
        `;
      } catch (err) {
        console.warn('Falha ao gravar log de auditoria', err);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Erro no login:', err);
      return { success: false, error: 'Erro de conexão com o banco de dados. Tente novamente.' };
    }
  };

  const logout = () => {
    if (user) {
      try {
        sql`
          INSERT INTO logs_auditoria (usuario_id, acao, user_agent)
          VALUES (${user.id}, 'logout', ${navigator.userAgent});
        `;
      } catch (e) {
        // Ignora erro no logout
      }
    }
    setUser(null);
    localStorage.removeItem('antigravity_user');
  };

  const listUsers = async (): Promise<User[]> => {
    try {
      const rows = await sql`
        SELECT id, nome, email, role, ativo, created_at
        FROM usuarios
        ORDER BY created_at DESC;
      `;
      return rows.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        role: r.role as UserRole,
        ativo: r.ativo,
        created_at: r.created_at,
      }));
    } catch (err) {
      console.error('Erro ao listar usuários:', err);
      return [];
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole): Promise<boolean> => {
    try {
      await sql`
        UPDATE usuarios
        SET role = ${newRole}::user_role
        WHERE id = ${userId}::uuid;
      `;
      return true;
    } catch (err) {
      console.error('Erro ao atualizar papel do usuário:', err);
      return false;
    }
  };

  const toggleUserStatus = async (userId: string, ativo: boolean): Promise<boolean> => {
    try {
      await sql`
        UPDATE usuarios
        SET ativo = ${ativo}
        WHERE id = ${userId}::uuid;
      `;
      return true;
    } catch (err) {
      console.error('Erro ao alternar status do usuário:', err);
      return false;
    }
  };

  const createUser = async (nome: string, email: string, role: UserRole, senha: string) => {
    try {
      if (!nome || !email || !senha) {
        return { success: false, error: 'Preencha todos os campos obrigatórios.' };
      }
      if (senha.length < 9) {
        return { success: false, error: 'A senha deve conter pelo menos 9 caracteres.' };
      }

      await sql`
        INSERT INTO usuarios (nome, email, role, ativo, senha_hash)
        VALUES (
          ${nome.trim()}, 
          ${email.trim().toLowerCase()}, 
          ${role}::user_role, 
          true, 
          crypt(${senha}, gen_salt('bf'))
        );
      `;

      return { success: true };
    } catch (err: any) {
      console.error('Erro ao criar usuário:', err);
      if (err.message && err.message.includes('unique')) {
        return { success: false, error: 'Este e-mail já está cadastrado no sistema.' };
      }
      return { success: false, error: 'Não foi possível cadastrar o usuário.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUserRole,
        toggleUserStatus,
        createUser,
        listUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};

