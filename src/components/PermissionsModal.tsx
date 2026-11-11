import React, { useState, useEffect } from 'react';
import { sql } from '@/lib/neon';
import type { User } from '@/types/auth';
import type { PermissaoArquivo, Arquivo } from '@/types/arquivo';
import { Shield, X, UserPlus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  arquivo: Arquivo | null;
  onSuccess: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
  arquivo,
  onSuccess,
}) => {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoArquivo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && arquivo) {
      loadData();
    }
  }, [isOpen, arquivo]);

  const loadData = async () => {
    if (!arquivo) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Carregar todos os usuários
      const usersRows = await sql`
        SELECT id, nome, email, role, ativo, created_at
        FROM usuarios
        WHERE ativo = true
        ORDER BY nome ASC;
      `;

      const usersList: User[] = usersRows.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        email: r.email,
        role: r.role,
        ativo: r.ativo,
        created_at: r.created_at,
      }));
      setAllUsers(usersList);

      // 2. Carregar permissões existentes deste arquivo
      const permRows = await sql`
        SELECT pa.id, pa.arquivo_id, pa.usuario_id, pa.pode_visualizar, pa.pode_baixar, pa.pode_editar,
               u.nome AS usuario_nome, u.email AS usuario_email
        FROM permissoes_arquivos pa
        JOIN usuarios u ON u.id = pa.usuario_id
        WHERE pa.arquivo_id = ${arquivo.id}::uuid;
      `;

      setPermissoes(
        permRows.map((p: any) => ({
          id: p.id,
          arquivo_id: p.arquivo_id,
          usuario_id: p.usuario_id,
          usuario_nome: p.usuario_nome,
          usuario_email: p.usuario_email,
          pode_visualizar: p.pode_visualizar,
          pode_baixar: p.pode_baixar,
          pode_editar: p.pode_editar,
        }))
      );
    } catch (err: any) {
      console.error('Erro ao carregar permissões:', err);
      setError('Falha ao carregar permissões do arquivo.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !arquivo) return null;

  const handleAddUser = () => {
    if (!selectedUserId) return;
    const targetUser = allUsers.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    if (!permissoes.some((p) => p.usuario_id === selectedUserId)) {
      setPermissoes([
        ...permissoes,
        {
          arquivo_id: arquivo.id,
          usuario_id: selectedUserId,
          usuario_nome: targetUser.nome,
          usuario_email: targetUser.email,
          pode_visualizar: true,
          pode_baixar: true,
          pode_editar: false,
        },
      ]);
    }
    setSelectedUserId('');
  };

  const handleToggle = (
    usuarioId: string,
    field: 'pode_visualizar' | 'pode_baixar' | 'pode_editar'
  ) => {
    setPermissoes((prev) =>
      prev.map((p) =>
        p.usuario_id === usuarioId ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleRemove = (usuarioId: string) => {
    setPermissoes(permissoes.filter((p) => p.usuario_id !== usuarioId));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // 1. Remover permissões atuais do arquivo
      await sql`
        DELETE FROM permissoes_arquivos
        WHERE arquivo_id = ${arquivo.id}::uuid;
      `;

      // 2. Inserir permissões atualizadas
      for (const p of permissoes) {
        await sql`
          INSERT INTO permissoes_arquivos (arquivo_id, usuario_id, pode_visualizar, pode_baixar, pode_editar)
          VALUES (
            ${arquivo.id}::uuid,
            ${p.usuario_id}::uuid,
            ${p.pode_visualizar},
            ${p.pode_baixar},
            ${p.pode_editar}
          );
        `;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar permissões:', err);
      setError('Erro ao persistir permissões no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-['Montserrat']">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-[#013375]/20 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-[#013375] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Shield className="w-5 h-5 text-[#57a0ff]" />
            </div>
            <div>
              <h2 className="text-base font-bold">Controle Granular de Permissões</h2>
              <p className="text-xs text-[#57a0ff] truncate max-w-md">
                {arquivo.titulo}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Adicionar Usuário */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Conceder Permissão a Usuário
            </label>
            <div className="flex gap-2">
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex-1 bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
              >
                <option value="">Selecione um usuário...</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.email}) - {u.role.toUpperCase()}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddUser}
                className="px-3.5 py-2 bg-[#013375] text-white text-xs font-bold rounded-xl hover:bg-[#57a0ff] hover:text-[#010101] transition flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" /> Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Permissões */}
          <div className="space-y-2 pt-2">
            <span className="text-xs font-bold text-slate-700 uppercase">
              Permissões Atribuídas ({permissoes.length})
            </span>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Carregando permissões do Neon...
              </div>
            ) : permissoes.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 bg-[#eef5fe]/40 rounded-2xl border border-dashed border-slate-300">
                Nenhum usuário com acesso restrito específico.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#eef5fe] text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Usuário</th>
                      <th className="p-3 text-center">Visualizar</th>
                      <th className="p-3 text-center">Baixar</th>
                      <th className="p-3 text-center">Editar</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {permissoes.map((p) => (
                      <tr key={p.usuario_id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">
                          <div>{p.usuario_nome}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {p.usuario_email}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={p.pode_visualizar}
                            onChange={() => handleToggle(p.usuario_id, 'pode_visualizar')}
                            className="rounded text-[#013375]"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={p.pode_baixar}
                            onChange={() => handleToggle(p.usuario_id, 'pode_baixar')}
                            className="rounded text-[#013375]"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={p.pode_editar}
                            onChange={() => handleToggle(p.usuario_id, 'pode_editar')}
                            className="rounded text-[#013375]"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemove(p.usuario_id)}
                            className="text-slate-400 hover:text-red-600 transition p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow flex items-center gap-1.5"
          >
            {saving ? (
              'Salvando...'
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Salvar Permissões
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

