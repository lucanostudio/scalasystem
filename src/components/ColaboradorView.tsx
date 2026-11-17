import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import {
  Clock,
  Receipt,
  Utensils,
  Sun,
  Dumbbell,
  Stethoscope,
  MessageSquare,
  ExternalLink,
  Edit,
  X,
  Save,
  Megaphone,
  AlertCircle,
  CheckCircle2,
  Briefcase
} from 'lucide-react';

export interface CollaboratorLink {
  id: string;
  slug: string;
  label: string;
  icon_name: string;
  target_url: string;
  sort_order: number;
  updated_at: string;
}

interface ColaboradorViewProps {
  onNavigateToComunicados?: () => void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Clock,
  Receipt,
  Utensils,
  Sun,
  Dumbbell,
  Stethoscope,
  MessageSquare,
};

export const ColaboradorView: React.FC<ColaboradorViewProps> = ({ onNavigateToComunicados }) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<CollaboratorLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLinks, setEditingLinks] = useState<CollaboratorLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  const loadLinks = async () => {
    setLoading(true);
    try {
      const rows = await sql`
        SELECT id, slug, label, icon_name, target_url, sort_order, updated_at
        FROM collaborator_links
        ORDER BY sort_order ASC;
      `;
      setLinks(rows as CollaboratorLink[]);
    } catch (err) {
      console.error('Erro ao carregar links do colaborador:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const openEditModal = () => {
    setEditingLinks(links.map((l) => ({ ...l })));
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsEditModalOpen(true);
  };

  const isValidHttpUrl = (value: string) => {
    try {
      const parsed = new URL(value.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSaveLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    for (const item of editingLinks) {
      if (!item.label.trim()) {
        setErrorMsg('Todos os botões precisam ter um rótulo.');
        return;
      }
      if (!isValidHttpUrl(item.target_url)) {
        setErrorMsg(`URL inválida para "${item.label}". Use http:// ou https://.`);
        return;
      }
    }

    setSaving(true);
    try {
      for (const item of editingLinks) {
        await sql`
          UPDATE collaborator_links
          SET label = ${item.label.trim()},
              target_url = ${item.target_url.trim()},
              updated_by = ${user?.id || null}::uuid,
              updated_at = NOW()
          WHERE id = ${item.id}::uuid;
        `;
      }
      await loadLinks();
      setSuccessMsg('Links atualizados com sucesso!');
      setTimeout(() => {
        setIsEditModalOpen(false);
        setSuccessMsg(null);
      }, 800);
    } catch (err) {
      console.error('Erro ao salvar links:', err);
      setErrorMsg('Erro ao salvar alterações no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Área do Colaborador */}
      <div className="bg-white border border-[#013375]/10 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#013375] text-white flex items-center justify-center shadow-md shrink-0">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#013375] tracking-tight">
              Área do Colaborador
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Hub de serviços, benefícios e canais de atendimento rápido.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onNavigateToComunicados && (
            <button
              onClick={onNavigateToComunicados}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#eef5fe] text-[#013375] hover:bg-[#57a0ff]/20 text-xs font-bold uppercase tracking-wider transition cursor-pointer"
            >
              <Megaphone className="w-4 h-4 text-[#03889c]" />
              Ver Comunicados
            </button>
          )}

          {canEdit && (
            <button
              onClick={openEditModal}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#013375] text-white hover:bg-[#002557] text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              Gerenciar Links
            </button>
          )}
        </div>
      </div>

      {/* Grid Responsivo dos 7 Botões Obrigatórios */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="h-40 bg-white/70 border border-[#013375]/10 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {links.map((item) => {
            const IconComponent = ICON_MAP[item.icon_name] || ExternalLink;
            return (
              <a
                key={item.id}
                href={item.target_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-[#013375]/10 hover:border-[#57a0ff] rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-3 shadow-xs hover:shadow-lg transition-all duration-200 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#eef5fe] group-hover:bg-[#013375] text-[#013375] group-hover:text-white flex items-center justify-center transition-colors">
                  <IconComponent className="w-7 h-7" />
                </div>
                <span className="text-xs font-extrabold text-[#013375] tracking-wide uppercase leading-snug">
                  {item.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#03889c] opacity-80 group-hover:opacity-100">
                  Acessar <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            );
          })}
        </div>
      )}

      {/* Modal de Edição de Links (Exclusivo Editor e Admin) */}
      {isEditModalOpen && canEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#013375] text-white">
              <div className="flex items-center gap-2.5">
                <Edit className="w-5 h-5 text-[#57a0ff]" />
                <h3 className="text-base font-extrabold">Gerenciar Links da Área do Colaborador</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLinks} className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {successMsg}
                </div>
              )}

              {editingLinks.map((link, idx) => (
                <div
                  key={link.id}
                  className="p-4 rounded-2xl bg-[#eef5fe]/60 border border-[#013375]/10 space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                        Rótulo do Botão
                      </label>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => {
                          const updated = [...editingLinks];
                          updated[idx] = { ...updated[idx], label: e.target.value };
                          setEditingLinks(updated);
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#013375]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                        URL de Destino (http:// ou https://)
                      </label>
                      <input
                        type="url"
                        value={link.target_url}
                        onChange={(e) => {
                          const updated = [...editingLinks];
                          updated[idx] = { ...updated[idx], target_url: e.target.value };
                          setEditingLinks(updated);
                        }}
                        placeholder="https://..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#013375]"
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#013375] text-white hover:bg-[#002557] text-xs font-bold uppercase tracking-wider shadow-sm transition disabled:opacity-60 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

