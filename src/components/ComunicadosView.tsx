import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import {
  Megaphone,
  Plus,
  ChevronDown,
  Calendar,
  Edit2,
  Trash2,
  X,
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Heading2,
  ImagePlus,
  Mail,
  Save,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export interface Announcement {
  id: string;
  title: string;
  category: string | null;
  content_html: string;
  image_urls: string[];
  notify_by_email: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
}

const CATEGORIES = ['Geral', 'RH', 'Benefícios', 'Urgente'];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2MB

export const ComunicadosView: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Geral');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const canManage = user?.role === 'admin' || user?.role === 'editor';

  const loadAnnouncements = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rows = await sql`
        SELECT 
          a.id,
          a.title,
          a.category,
          a.content_html,
          a.image_urls,
          a.notify_by_email,
          a.created_by,
          a.created_at,
          a.updated_at,
          EXISTS (
            SELECT 1 FROM announcement_reads ar
            WHERE ar.announcement_id = a.id AND ar.usuario_id = ${user.id}::uuid
          ) AS is_read
        FROM announcements a
        ORDER BY a.created_at DESC;
      `;
      setAnnouncements(
        rows.map((r: any) => ({
          ...r,
          image_urls: Array.isArray(r.image_urls) ? r.image_urls : [],
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar comunicados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, [user?.id]);

  const handleToggleExpand = async (item: Announcement) => {
    const nextId = expandedId === item.id ? null : item.id;
    setExpandedId(nextId);

    if (nextId && user && !item.is_read) {
      try {
        await sql`
          INSERT INTO announcement_reads (announcement_id, usuario_id)
          VALUES (${item.id}::uuid, ${user.id}::uuid)
          ON CONFLICT (announcement_id, usuario_id) DO NOTHING;
        `;
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_read: true } : a))
        );
      } catch (err) {
        console.warn('Falha ao marcar comunicado como lido:', err);
      }
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setCategory('Geral');
    setImageUrls([]);
    setNotifyByEmail(true);
    setErrorMsg(null);
    setIsModalOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = '';
    }, 0);
  };

  const openEditModal = (item: Announcement) => {
    setEditingId(item.id);
    setTitle(item.title);
    setCategory(item.category || 'Geral');
    setImageUrls(item.image_urls || []);
    setNotifyByEmail(item.notify_by_email);
    setErrorMsg(null);
    setIsModalOpen(true);
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = item.content_html || '';
    }, 0);
  };

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInsertLink = () => {
    const url = window.prompt('Insira a URL do link (https://...):');
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      execFormat('createLink', url);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setErrorMsg(null);

    Array.from(files).forEach((file) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrorMsg('Formato inválido. Use apenas .jpg, .png ou .webp.');
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setErrorMsg(`A imagem "${file.name}" excede o limite de 2MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrls((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);

    const htmlContent = editorRef.current?.innerHTML?.trim() || '';
    if (!title.trim()) {
      setErrorMsg('O título do comunicado é obrigatório.');
      return;
    }
    if (!htmlContent || htmlContent === '<br>') {
      setErrorMsg('O conteúdo do comunicado não pode estar vazio.');
      return;
    }

    setSaving(true);
    try {
      let savedId = editingId;
      if (editingId) {
        await sql`
          UPDATE announcements
          SET title = ${title.trim()},
              category = ${category},
              content_html = ${htmlContent},
              image_urls = ${JSON.stringify(imageUrls)}::jsonb,
              notify_by_email = ${notifyByEmail},
              updated_at = NOW()
          WHERE id = ${editingId}::uuid;
        `;
      } else {
        const inserted = await sql`
          INSERT INTO announcements (title, category, content_html, image_urls, notify_by_email, created_by)
          VALUES (
            ${title.trim()},
            ${category},
            ${htmlContent},
            ${JSON.stringify(imageUrls)}::jsonb,
            ${notifyByEmail},
            ${user.id}::uuid
          )
          RETURNING id;
        `;
        savedId = inserted[0]?.id;
      }

      // Disparar notificação automática por e-mail se marcado
      if (notifyByEmail && savedId) {
        try {
          const res = await fetch('/api/notificar-comunicado', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              announcementId: savedId,
              title: title.trim(),
              contentHtml: htmlContent,
              authorId: user.id,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setStatusBanner(
              `Comunicado publicado! Notificação processada para ${data.recipientsCount} colaborador(es).`
            );
          } else {
            setStatusBanner('Comunicado publicado com sucesso!');
          }
        } catch {
          // Fallback em ambiente local sem Edge Functions: registra log de auditoria
          await sql`
            INSERT INTO logs_auditoria (usuario_id, acao, user_agent)
            VALUES (${user.id}::uuid, 'comunicado_email:pendente_envio', 'frontend-fallback');
          `;
          setStatusBanner('Comunicado publicado com sucesso!');
        }
      } else {
        setStatusBanner('Comunicado salvo com sucesso!');
      }

      setIsModalOpen(false);
      await loadAnnouncements();
      setTimeout(() => setStatusBanner(null), 5000);
    } catch (err) {
      console.error('Erro ao salvar comunicado:', err);
      setErrorMsg('Erro ao salvar comunicado no banco de dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este comunicado?')) return;
    try {
      await sql`DELETE FROM announcements WHERE id = ${id}::uuid;`;
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Erro ao excluir comunicado:', err);
    }
  };

  const getCategoryBadgeClass = (cat: string | null) => {
    switch (cat) {
      case 'Urgente':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'RH':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Benefícios':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-[#eef5fe] text-[#013375] border-[#013375]/15';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-[#013375]/10 rounded-3xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#03889c] text-white flex items-center justify-center shadow-md shrink-0">
            <Megaphone className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#013375] tracking-tight">
              Comunicados Internos
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Avisos oficiais, atualizações de RH e informações importantes para colaboradores.
            </p>
          </div>
        </div>

        {canManage && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#013375] text-white hover:bg-[#002557] text-xs font-bold uppercase tracking-wider shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Comunicado
          </button>
        )}
      </div>

      {statusBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {statusBanner}
        </div>
      )}

      {/* Lista em Acordeão */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/70 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-[#013375]/10 rounded-3xl p-12 text-center shadow-xs">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-[#013375]">Nenhum comunicado publicado ainda.</p>
          <p className="text-xs text-slate-500 mt-1">
            Quando novos comunicados forem publicados, eles aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div
                key={item.id}
                className="bg-white border border-[#013375]/10 rounded-2xl shadow-xs overflow-hidden transition-all"
              >
                {/* Cabeçalho do Item Fechado */}
                <div
                  onClick={() => handleToggleExpand(item)}
                  className="p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-[#eef5fe]/40 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {!item.is_read && (
                      <span
                        title="Não lido"
                        className="w-2.5 h-2.5 rounded-full bg-[#f49c0e] shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(
                            item.category
                          )}`}
                        >
                          {item.category || 'Geral'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3 className="text-sm md:text-base font-extrabold text-[#013375] truncate">
                        {item.title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {canManage && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => openEditModal(item)}
                          title="Editar Comunicado"
                          className="p-2 rounded-lg text-slate-400 hover:text-[#013375] hover:bg-[#eef5fe] transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          title="Excluir Comunicado"
                          className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <ChevronDown
                      className={`w-5 h-5 text-[#013375] transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-4">
                    <div
                      className="prose prose-sm max-w-none text-slate-700 leading-relaxed [&_a]:text-[#03889c] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                      dangerouslySetInnerHTML={{ __html: item.content_html }}
                    />

                    {item.image_urls && item.image_urls.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        {item.image_urls.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`Anexo ${idx + 1} - ${item.title}`}
                            className="rounded-2xl border border-slate-200 max-h-80 w-full object-cover shadow-xs"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Criação/Edição de Comunicado */}
      {isModalOpen && canManage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-[#013375] text-white">
              <div className="flex items-center gap-2.5">
                <Megaphone className="w-5 h-5 text-[#57a0ff]" />
                <h3 className="text-base font-extrabold">
                  {editingId ? 'Editar Comunicado' : 'Novo Comunicado'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                    Título do Comunicado *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex.: Atualização do Benefício TotalPass"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#013375]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                    Categoria / Tag
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-[#013375] bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Editor Rich Text (WYSIWYG) */}
              <div>
                <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                  Conteúdo do Comunicado *
                </label>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap items-center gap-1">
                    <button type="button" onClick={() => execFormat('bold')} title="Negrito" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><Bold className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('italic')} title="Itálico" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><Italic className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('underline')} title="Sublinhado" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><Underline className="w-4 h-4" /></button>
                    <span className="w-px h-5 bg-slate-300 mx-1" />
                    <button type="button" onClick={() => execFormat('formatBlock', 'H3')} title="Título" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><Heading2 className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('insertUnorderedList')} title="Lista" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><List className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('insertOrderedList')} title="Lista Numerada" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><ListOrdered className="w-4 h-4" /></button>
                    <span className="w-px h-5 bg-slate-300 mx-1" />
                    <button type="button" onClick={() => execFormat('justifyLeft')} title="Alinhar à esquerda" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><AlignLeft className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('justifyCenter')} title="Centralizar" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><AlignCenter className="w-4 h-4" /></button>
                    <button type="button" onClick={() => execFormat('justifyRight')} title="Alinhar à direita" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><AlignRight className="w-4 h-4" /></button>
                    <span className="w-px h-5 bg-slate-300 mx-1" />
                    <button type="button" onClick={handleInsertLink} title="Inserir Link" className="p-1.5 rounded hover:bg-slate-200 cursor-pointer"><LinkIcon className="w-4 h-4" /></button>
                    <input
                      type="color"
                      title="Cor do texto"
                      onChange={(e) => execFormat('foreColor', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    className="min-h-[180px] p-4 text-xs md:text-sm text-slate-800 focus:outline-none [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  />
                </div>
              </div>

              {/* Upload de Imagens */}
              <div>
                <label className="block text-[11px] font-bold text-[#013375] uppercase mb-1">
                  Imagens Anexadas (.jpg, .png, .webp — máx. 2MB)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#eef5fe] text-[#013375] hover:bg-[#57a0ff]/20 text-xs font-bold cursor-pointer transition">
                    <ImagePlus className="w-4 h-4" />
                    Adicionar Imagem
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {imageUrls.map((src, idx) => (
                      <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200">
                        <img src={src} alt={`Preview ${idx + 1}`} className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white opacity-90 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Checkbox de Notificação por E-mail */}
              <label className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-[#eef5fe]/70 border border-[#013375]/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyByEmail}
                  onChange={(e) => setNotifyByEmail(e.target.checked)}
                  className="w-4 h-4 accent-[#013375] rounded"
                />
                <Mail className="w-4 h-4 text-[#013375]" />
                <span className="text-xs font-bold text-[#013375]">
                  Notificar colaboradores por e-mail ao publicar
                </span>
              </label>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  {saving ? 'Publicando...' : editingId ? 'Salvar Alterações' : 'Publicar Comunicado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

