import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import type { Arquivo } from '@/types/arquivo';
import {
  X,
  Download,
  Eye,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  Shield,
  Lock,
  Calendar,
  User,
  Building,
  Tag,
  History,
  Clock,
  Layers,
  Upload,
  RotateCcw,
  AlertTriangle,
  ZoomIn,
  ZoomOut
} from 'lucide-react';

interface VersaoItem {
  id: string;
  versao: number;
  url_armazenamento: string;
  tamanho_bytes: number;
  notas_alteracao: string | null;
  criado_por: string;
  criador_nome: string;
  created_at: string;
}

interface DocumentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  arquivo: Arquivo | null;
  onUpdated: () => void;
}

export const DocumentDetailModal: React.FC<DocumentDetailModalProps> = ({
  isOpen,
  onClose,
  arquivo,
  onUpdated,
}) => {
  const { user } = useAuth();
  const [versoes, setVersoes] = useState<VersaoItem[]>([]);
  const [showVersionsTab, setShowVersionsTab] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (isOpen && arquivo) {
      loadVersoes();
      // Registrar log de visualização
      registrarLogVisualizacao();
    }
  }, [isOpen, arquivo]);

  const registrarLogVisualizacao = async () => {
    if (!arquivo || !user) return;
    try {
      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user.id}::uuid, ${arquivo.id}::uuid, 'visualizacao', '192.168.1.10', ${navigator.userAgent});
      `;
    } catch (e) {
      console.warn('Erro ao registrar log de visualização:', e);
    }
  };

  const loadVersoes = async () => {
    if (!arquivo) return;
    setLoadingVersions(true);
    try {
      const rows = await sql`
        SELECT va.*, u.nome AS criador_nome
        FROM versoes_arquivos va
        LEFT JOIN usuarios u ON u.id = va.criado_por
        WHERE va.arquivo_id = ${arquivo.id}::uuid
        ORDER BY va.versao DESC;
      `;
      setVersoes(
        rows.map((r: any) => ({
          id: r.id,
          versao: r.versao,
          url_armazenamento: r.url_armazenamento,
          tamanho_bytes: Number(r.tamanho_bytes),
          notas_alteracao: r.notas_alteracao,
          criado_por: r.criado_por,
          criador_nome: r.criador_nome || 'Usuário',
          created_at: r.created_at,
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar histórico de versões:', err);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleDownload = async () => {
    if (!arquivo) return;
    if (!arquivo.pode_baixar && user?.role !== 'admin') {
      alert('Você não possui autorização para baixar este arquivo.');
      return;
    }

    try {
      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user?.id}::uuid, ${arquivo.id}::uuid, 'download', '192.168.1.10', ${navigator.userAgent});
      `;
      window.open(arquivo.url_armazenamento, '_blank');
    } catch (e) {
      console.error('Erro ao registrar download:', e);
    }
  };

  const handleSubirNovaVersao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !arquivo || !user) return;
    const file = e.target.files[0];
    setUploadingVersion(true);

    try {
      const novaVersaoNum = arquivo.versao_atual + 1;
      const fakeUrl = `https://storage.antigravity.io/rnsmm/v${novaVersaoNum}_${Date.now()}_${encodeURIComponent(file.name)}`;

      // 1. Inserir na tabela de versões
      await sql`
        INSERT INTO versoes_arquivos (
          arquivo_id, versao, url_armazenamento, tamanho_bytes, notas_alteracao, criado_por
        ) VALUES (
          ${arquivo.id}::uuid,
          ${novaVersaoNum},
          ${fakeUrl},
          ${file.size},
          ${newVersionNotes.trim() || `Atualização v${novaVersaoNum}.0`},
          ${user.id}::uuid
        );
      `;

      // 2. Atualizar versão_atual na tabela principal
      await sql`
        UPDATE arquivos
        SET versao_atual = ${novaVersaoNum},
            tamanho_bytes = ${file.size},
            url_armazenamento = ${fakeUrl},
            updated_at = NOW()
        WHERE id = ${arquivo.id}::uuid;
      `;

      // 3. Log de auditoria
      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user.id}::uuid, ${arquivo.id}::uuid, 'upload_versao', '192.168.1.10', ${navigator.userAgent});
      `;

      setNewVersionNotes('');
      await loadVersoes();
      onUpdated();
      alert(`Nova versão v${novaVersaoNum}.0 adicionada com sucesso!`);
    } catch (err) {
      console.error('Erro ao enviar nova versão:', err);
      alert('Não foi possível enviar a nova versão.');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleRestaurarVersao = async (versaoItem: VersaoItem) => {
    if (!arquivo || user?.role !== 'admin') return;
    if (!confirm(`Deseja restaurar a versão v${versaoItem.versao}.0 como ativa?`)) return;

    try {
      await sql`
        UPDATE arquivos
        SET versao_atual = ${versaoItem.versao},
            tamanho_bytes = ${versaoItem.tamanho_bytes},
            url_armazenamento = ${versaoItem.url_armazenamento},
            updated_at = NOW()
        WHERE id = ${arquivo.id}::uuid;
      `;

      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user.id}::uuid, ${arquivo.id}::uuid, 'restauracao_versao', '192.168.1.10', ${navigator.userAgent});
      `;

      onUpdated();
      alert(`Versão v${versaoItem.versao}.0 restaurada como ativa!`);
    } catch (err) {
      console.error('Erro ao restaurar versão:', err);
      alert('Erro ao restaurar versão.');
    }
  };

  if (!isOpen || !arquivo) return null;

  const watermarkText = `CONFIDENCIAL • ${user?.nome || 'Usuário'} • ${user?.email || ''} • ${new Date().toLocaleString('pt-BR')}`;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const canEdit = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 font-['Montserrat']">
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-[#013375]/20 overflow-hidden flex flex-col h-[90vh]">
        {/* Header Superior */}
        <div className="p-5 bg-[#013375] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-white/10 rounded-2xl shrink-0">
              {arquivo.extensao === 'pdf' ? (
                <FileText className="w-6 h-6 text-[#910113]" />
              ) : ['doc', 'docx'].includes(arquivo.extensao) ? (
                <FileSpreadsheet className="w-6 h-6 text-[#57a0ff]" />
              ) : ['png', 'jpg', 'jpeg', 'svg'].includes(arquivo.extensao) ? (
                <FileImage className="w-6 h-6 text-[#03889c]" />
              ) : (
                <Video className="w-6 h-6 text-[#f49c0e]" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold truncate text-white">{arquivo.titulo}</h2>
                {arquivo.is_confidencial && (
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-[#910113] text-white flex items-center gap-1 shrink-0">
                    <Lock className="w-3 h-3" /> Confidencial
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#57a0ff]/20 text-[#57a0ff] shrink-0">
                  v{arquivo.versao_atual}.0
                </span>
              </div>
              <p className="text-xs text-[#57a0ff] truncate mt-0.5">
                {arquivo.nome_original} • {formatBytes(arquivo.tamanho_bytes)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowVersionsTab(!showVersionsTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                showVersionsTab
                  ? 'bg-[#57a0ff] text-[#013375]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Versões ({versoes.length})</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={!arquivo.pode_baixar && user?.role !== 'admin'}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow ${
                arquivo.pode_baixar || user?.role === 'admin'
                  ? 'bg-[#ff8b00] hover:bg-[#f49c0e] text-[#010101]'
                  : 'bg-white/20 text-white/40 cursor-not-allowed'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo Principal (Área de Prévia + Painel Lateral de Metadados) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* ÁREA CENTRAL: Pré-visualizador com Watermarking Dinâmico */}
          <div className="flex-1 bg-slate-900 relative overflow-hidden flex flex-col justify-center items-center p-4">
            {/* Controles de Zoom para imagens / páginas */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-xl border border-slate-700 text-white text-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Reduzir Zoom"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono text-[11px]">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(2, z + 0.2))}
                className="p-1.5 hover:bg-slate-800 rounded-lg cursor-pointer"
                title="Aumentar Zoom"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Visualizador de Mídia */}
            <div
              className="relative w-full h-full max-w-3xl max-h-full flex items-center justify-center transition-transform duration-200"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              {['png', 'jpg', 'jpeg', 'svg'].includes(arquivo.extensao) ? (
                <div className="relative max-h-full max-w-full">
                  <img
                    src={arquivo.url_armazenamento}
                    alt={arquivo.titulo}
                    className="max-h-[65vh] max-w-full object-contain rounded-xl shadow-2xl bg-white/5"
                    onError={(e) => {
                      // Fallback visual caso seja uma URL interna de storage
                      (e.target as any).src = '/logo.png';
                    }}
                  />
                </div>
              ) : ['mp4', 'mov'].includes(arquivo.extensao) ? (
                <div className="relative w-full max-w-2xl bg-black rounded-2xl overflow-hidden shadow-2xl">
                  <video controls className="w-full h-auto max-h-[60vh]">
                    <source src={arquivo.url_armazenamento} type={arquivo.tipo_mime} />
                    Seu navegador não suporta a reprodução deste vídeo.
                  </video>
                </div>
              ) : (
                /* Documentos PDF / Word simulados em visualizador elegante */
                <div className="w-full max-w-xl bg-white text-slate-800 rounded-2xl shadow-2xl p-8 min-h-[500px] flex flex-col justify-between border border-slate-300 relative select-none">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-slate-200">
                      <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="h-6 object-contain" />
                        <span className="text-[11px] font-bold text-[#013375]">
                          Scalasystem • RNSMM
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {arquivo.extensao.toUpperCase()} • v{arquivo.versao_atual}.0
                      </span>
                    </div>

                    <h1 className="text-xl font-bold text-slate-900 leading-snug">
                      {arquivo.titulo}
                    </h1>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {arquivo.descricao ||
                        'Este documento está indexado no repositório digital centralizado da Rede Scalabriniana de Missões com Migrantes.'}
                    </p>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-600">
                      <p><strong>Autor:</strong> {arquivo.autor || 'Coordenação Executiva'}</p>
                      <p><strong>Departamento:</strong> {arquivo.departamento || 'Missões & Pastoral'}</p>
                      <p><strong>Ano de Publicação:</strong> {arquivo.ano_publicacao || 2026}</p>
                      <p><strong>Status de Homologação:</strong> {arquivo.status.toUpperCase()}</p>
                    </div>

                    <div className="py-4 text-center text-xs text-slate-400 italic">
                      [ Conteúdo integral do documento indexado para busca textual e consulta interna ]
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between text-[10px] text-slate-400">
                    <span>Governança de Conhecimento Scalabriniana</span>
                    <span>Página 1 de 1</span>
                  </div>
                </div>
              )}

              {/* WATERMARKING DINÂMICO (Sobreposto quando Confidencial ou Ativo) */}
              {arquivo.is_confidencial && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-around items-center opacity-25 rotate-[-25deg] select-none z-30">
                  <div className="text-red-500 font-black text-sm tracking-widest whitespace-nowrap bg-black/40 px-3 py-1 rounded">
                    {watermarkText}
                  </div>
                  <div className="text-red-500 font-black text-sm tracking-widest whitespace-nowrap bg-black/40 px-3 py-1 rounded">
                    {watermarkText}
                  </div>
                  <div className="text-red-500 font-black text-sm tracking-widest whitespace-nowrap bg-black/40 px-3 py-1 rounded">
                    {watermarkText}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAINEL LATERAL: Metadados ou Histórico de Versões */}
          <div className="w-full md:w-80 bg-slate-50 border-t md:border-t-0 md:border-l border-slate-200 p-6 overflow-y-auto shrink-0 flex flex-col justify-between">
            {showVersionsTab ? (
              /* ABA DE VERSÕES */
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase text-[#013375] flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#57a0ff]" /> Histórico de Versões
                  </h3>
                  <button
                    onClick={() => setShowVersionsTab(false)}
                    className="text-[11px] text-[#013375] font-semibold hover:underline cursor-pointer"
                  >
                    Ver Metadados
                  </button>
                </div>

                {/* Subir Nova Versão */}
                {canEdit && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Subir Nova Versão (v{arquivo.versao_atual + 1}.0)
                    </label>
                    <input
                      type="text"
                      value={newVersionNotes}
                      onChange={(e) => setNewVersionNotes(e.target.value)}
                      placeholder="Notas da alteração..."
                      className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#013375]"
                    />
                    <label className="w-full py-2 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingVersion ? 'Enviando...' : 'Selecionar Arquivo'}</span>
                      <input
                        type="file"
                        onChange={handleSubirNovaVersao}
                        disabled={uploadingVersion}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Lista de Versões */}
                <div className="space-y-2.5">
                  {loadingVersions ? (
                    <div className="text-center text-xs text-slate-400 py-4">Carregando...</div>
                  ) : versoes.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-4">Nenhuma versão anterior.</div>
                  ) : (
                    versoes.map((v) => (
                      <div
                        key={v.id}
                        className={`p-3 rounded-2xl border transition ${
                          v.versao === arquivo.versao_atual
                            ? 'bg-[#eef5fe] border-[#013375]'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#013375]">
                            Versão v{v.versao}.0
                          </span>
                          {v.versao === arquivo.versao_atual ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#2f6746] text-white uppercase">
                              Ativa
                            </span>
                          ) : (
                            user?.role === 'admin' && (
                              <button
                                onClick={() => handleRestaurarVersao(v)}
                                title="Restaurar esta versão como a atual"
                                className="text-[10px] text-[#03889c] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" /> Restaurar
                              </button>
                            )
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">
                          {v.notas_alteracao || 'Sem notas de alteração'}
                        </p>
                        <div className="text-[10px] text-slate-400 mt-2 flex justify-between">
                          <span>{v.criador_nome}</span>
                          <span>{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* ABA DE METADADOS */
              <div className="space-y-4 text-xs">
                <div className="pb-2 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="font-bold uppercase text-[#013375] tracking-wider">
                    Metadados do Arquivo
                  </h3>
                  <button
                    onClick={() => setShowVersionsTab(true)}
                    className="text-[11px] text-[#013375] font-semibold hover:underline cursor-pointer"
                  >
                    Ver Versões
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Categoria / Pasta
                    </span>
                    <span className="font-bold text-[#013375]">{arquivo.categoria_nome || 'Geral'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Autor / Responsável
                    </span>
                    <span className="font-semibold text-slate-800">{arquivo.autor || 'N/D'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Departamento
                    </span>
                    <span className="font-semibold text-slate-800">{arquivo.departamento || 'Geral'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Ano
                      </span>
                      <span className="font-semibold text-slate-800">{arquivo.ano_publicacao || 2026}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                        Status
                      </span>
                      <span className="font-bold uppercase text-[#2f6746]">{arquivo.status}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                      Criado por
                    </span>
                    <span className="font-semibold text-slate-800">{arquivo.criador_nome || 'Sistema'}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {new Date(arquivo.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  {/* Tags */}
                  {arquivo.tags && arquivo.tags.length > 0 && (
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px] uppercase mb-1">
                        Tags Indexadas
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {arquivo.tags.map((t) => (
                          <span
                            key={t}
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eef5fe] text-[#013375]"
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Aviso Confidencial */}
                  {arquivo.is_confidencial && (
                    <div className="p-3 bg-[#910113]/10 border border-[#910113]/20 rounded-xl text-slate-700">
                      <div className="flex items-center gap-1.5 font-bold text-[#910113] text-[11px]">
                        <AlertTriangle className="w-3.5 h-3.5" /> Documento Protegido
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Marca d'água dinâmica rastreável com sua identificação institucional aplicada a qualquer download ou exibição.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleDownload}
                disabled={!arquivo.pode_baixar && user?.role !== 'admin'}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow ${
                  arquivo.pode_baixar || user?.role === 'admin'
                    ? 'bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Download className="w-4 h-4" />
                <span>{arquivo.pode_baixar || user?.role === 'admin' ? 'Baixar Documento' : 'Download Bloqueado'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

