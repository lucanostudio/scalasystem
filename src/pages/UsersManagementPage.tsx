import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { User, UserRole } from '@/types/auth';
import { Users, UserPlus, Shield, CheckCircle2, XCircle, Search, RefreshCw, Key, AlertCircle } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { user: currentUser, listUsers, createUser, updateUserRole, toggleUserStatus } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modal Novo Usuário
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('leitor');
  const [newPassword, setNewPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setModalLoading(true);

    const res = await createUser(newName, newEmail, newRole, newPassword);
    if (!res.success) {
      setModalError(res.error || 'Erro ao cadastrar usuário.');
      setModalLoading(false);
      return;
    }

    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('leitor');
    setIsModalOpen(false);
    setModalLoading(false);
    await fetchUsers();
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const ok = await updateUserRole(userId, newRole);
    if (ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    const ok = await toggleUserStatus(userId, !currentStatus);
    if (ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, ativo: !currentStatus } : u))
      );
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-500" /> Gestão de Usuários e Perfis (RBAC)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Controle de acessos, papéis (*Admin*, *Editor*, *Leitor*) e permissões de segurança.
          </p>
        </div>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar Usuário
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded-lg">
            {(['all', 'admin', 'editor', 'leitor'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition cursor-pointer ${
                  roleFilter === r
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'all' ? 'Todos' : r}
              </button>
            ))}
          </div>

          <button
            onClick={fetchUsers}
            title="Atualizar lista"
            className="p-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">E-mail</th>
                <th className="px-6 py-4">Papel (Role)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Criado em</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                      Carregando usuários do Neon...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-blue-400">
                        {u.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div>{u.nome}</div>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] text-blue-400 font-normal">
                            (Você)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">{u.email}</td>
                    <td className="px-6 py-4">
                      {currentUser?.role === 'admin' ? (
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u.id, e.target.value as UserRole)
                          }
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:ring-1 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="admin">Administrador</option>
                          <option value="editor">Editor</option>
                          <option value="leitor">Leitor</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'admin'
                              ? 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                              : u.role === 'editor'
                              ? 'bg-blue-950/60 text-blue-400 border border-blue-800/50'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          u.ativo
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        }`}
                      >
                        {u.ativo ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5" /> Inativo
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.role === 'admin' && u.id !== currentUser.id && (
                        <button
                          onClick={() => handleToggleStatus(u.id, u.ativo)}
                          className={`text-xs px-3 py-1 rounded-lg border transition cursor-pointer ${
                            u.ativo
                              ? 'border-rose-900/60 text-rose-400 hover:bg-rose-950/40'
                              : 'border-emerald-900/60 text-emerald-400 hover:bg-emerald-950/40'
                          }`}
                        >
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cadastro de Usuário */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" /> Cadastrar Novo Usuário
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Crie uma conta e atribua um perfil com controle de privilégio mínimo.
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/50 border border-red-800 text-red-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Ana Clara Martins"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  E-mail Institucional
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ana.martins@antigravity.io"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Papel no Sistema (RBAC)
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                >
                  <option value="leitor">Leitor (Apenas visualização e download autorizado)</option>
                  <option value="editor">Editor (Upload e gerenciamento de arquivos)</option>
                  <option value="admin">Administrador (Controle irrestrito e auditoria)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Senha Provisória
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 9 caracteres"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 pl-10 text-white placeholder-slate-500 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-500 text-white font-medium transition disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
                >
                  {modalLoading ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

