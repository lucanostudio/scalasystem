import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import { 
  FolderArchive, 
  Download, 
  Eye, 
  TrendingUp, 
  Clock, 
  HardDrive, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  Video, 
  ShieldCheck, 
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface DashboardStats {
  totalArquivos: number;
  totalBytes: number;
  downloadsSemana: number;
  visualizacoesSemana: number;
}

interface PopularFile {
  id: string;
  titulo: string;
  nome_original: string;
  extensao: string;
  tipo_mime: string;
  categoria_nome: string | null;
  downloads_count: number;
  visualizacoes_count: number;
  is_confidencial: boolean;
  versao_atual: number;
}

interface ActivityLog {
  id: string;
  usuario_nome: string;
  arquivo_titulo: string | null;
  acao: string;
  created_at: string;
}

interface DashboardViewProps {
  onNavigateToAcervo: () => void;
  onSelectFile?: (fileId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateToAcervo, onSelectFile }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalArquivos: 0,
    totalBytes: 0,
    downloadsSemana: 0,
    visualizacoesSemana: 0,
  });
  const [popularFiles, setPopularFiles] = useState<PopularFile[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal de Detalhes Rápido
  const [selectedFileDetail, setSelectedFileDetail] = useState<PopularFile | null>(null);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Total de Arquivos Acessíveis e Bytes (com base no RLS / Role do usuário)
      let arquivosRows: any[];
      if (user.role === 'admin') {
        arquivosRows = await sql`
          SELECT COUNT(*)::int AS count, COALESCE(SUM(tamanho_bytes), 0)::bigint AS total_bytes
          FROM arquivos
          WHERE is_deleted = false;
        `;
      } else {
        arquivosRows = await sql`
          SELECT COUNT(*)::int AS count, COALESCE(SUM(tamanho_bytes), 0)::bigint AS total_bytes
          FROM arquivos a
          WHERE a.is_deleted = false
            AND (
              a.criado_por = ${user.id}::uuid
              OR EXISTS (
                SELECT 1 FROM permissoes_arquivos pa
                WHERE pa.arquivo_id = a.id
                  AND pa.usuario_id = ${user.id}::uuid
                  AND pa.pode_visualizar = true
              )
            );
        `;
      }

      // 2. Downloads e Visualizações na Semana
      const statsWeek = await sql`
        SELECT 
          COUNT(CASE WHEN acao = 'download' THEN 1 END)::int AS downloads_semana,
          COUNT(CASE WHEN acao = 'visualizacao' THEN 1 END)::int AS visualizacoes_semana
        FROM logs_auditoria
        WHERE created_at >= NOW() - INTERVAL '7 days';
      `;

      // 3. Documentos Mais Populares (Ranking de downloads e visualizações)
      let rankingRows: any[];
      if (user.role === 'admin') {
        rankingRows = await sql`
          SELECT 
            a.id, a.titulo, a.nome_original, a.extensao, a.tipo_mime, 
            a.is_confidencial, a.versao_atual,
            c.nome AS categoria_nome,
            (SELECT COUNT(*)::int FROM logs_auditoria WHERE arquivo_id = a.id AND acao = 'download') AS downloads_count,
            (SELECT COUNT(*)::int FROM logs_auditoria WHERE arquivo_id = a.id AND acao = 'visualizacao') AS visualizacoes_count
          FROM arquivos a
          LEFT JOIN categorias c ON c.id = a.categoria_id
          WHERE a.is_deleted = false
          ORDER BY (downloads_count * 2 + visualizacoes_count) DESC
          LIMIT 5;
        `;
      } else {
        rankingRows = await sql`
          SELECT 
            a.id, a.titulo, a.nome_original, a.extensao, a.tipo_mime, 
            a.is_confidencial, a.versao_atual,
            c.nome AS categoria_nome,
            (SELECT COUNT(*)::int FROM logs_auditoria WHERE arquivo_id = a.id AND acao = 'download') AS downloads_count,
            (SELECT COUNT(*)::int FROM logs_auditoria WHERE arquivo_id = a.id AND acao = 'visualizacao') AS visualizacoes_count
          FROM arquivos a
          LEFT JOIN categorias c ON c.id = a.categoria_id
          WHERE a.is_deleted = false
            AND (
              a.criado_por = ${user.id}::uuid
              OR EXISTS (
                SELECT 1 FROM permissoes_arquivos pa
                WHERE pa.arquivo_id = a.id
                  AND pa.usuario_id = ${user.id}::uuid
                  AND pa.pode_visualizar = true
              )
            )
          ORDER BY (downloads_count * 2 + visualizacoes_count) DESC
          LIMIT 5;
        `;
      }

      // 4. Feed de Atividades Recentes
      let logsRows: any[] = [];
      if (user.role === 'admin' || user.role === 'editor') {
        logsRows = await sql`
          SELECT 
            l.id, l.acao, l.created_at,
            COALESCE(u.nome, 'Usuário Convidado') AS usuario_nome,
            a.titulo AS arquivo_titulo
          FROM logs_auditoria l
          LEFT JOIN usuarios u ON u.id = l.usuario_id
          LEFT JOIN arquivos a ON a.id = l.arquivo_id
          ORDER BY l.created_at DESC
          LIMIT 6;
        `;
      }

      setStats({
        totalArquivos: arquivosRows[0]?.count || 0,
        totalBytes: Number(arquivosRows[0]?.total_bytes || 0),
        downloadsSemana: statsWeek[0]?.downloads_semana || 0,
        visualizacoesSemana: statsWeek[0]?.visualizacoes_semana || 0,
      });

      setPopularFiles(rankingRows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        nome_original: r.nome_original,
        extensao: r.extensao,
        tipo_mime: r.tipo_mime,
        categoria_nome: r.categoria_nome,
        downloads_count: r.downloads_count,
        visualizacoes_count: r.visualizacoes_count,
        is_confidencial: r.is_confidencial,
        versao_atual: r.versao_atual,
      })));

      setActivities(logsRows.map((r: any) => ({
        id: r.id,
        usuario_nome: r.usuario_nome,
        arquivo_titulo: r.arquivo_titulo,
        acao: r.acao,
        created_at: r.created_at,
      })));

    } catch (err) {
      console.error('Erro ao carregar métricas do dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const getFileIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-[#910113]" />;
      case 'docx':
      case 'doc':
        return <FileSpreadsheet className="w-5 h-5 text-[#013375]" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return <FileImage className="w-5 h-5 text-[#03889c]" />;
      case 'mp4':
      case 'mov':
        return <Video className="w-5 h-5 text-[#ff8b00]" />;
      default:
        return <FolderArchive className="w-5 h-5 text-slate-500" />;
    }
  };

  const getActionBadge = (acao: string) => {
    switch (acao) {
      case 'upload':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#2f6746]/15 text-[#2f6746]">Upload</span>;
      case 'download':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#013375]/15 text-[#013375]">Download</span>;
      case 'visualizacao':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#03889c]/15 text-[#03889c]">Visualização</span>;
      case 'login':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#57a0ff]/20 text-[#013375]">Login</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">{acao}</span>;
    }
  };

  return (
    <div className="space-y-8 font-['Montserrat']">
      {/* Banner de Boas-vindas Scalasystem */}
      <div className="bg-gradient-to-r from-[#013375] via-[#002557] to-[#010101] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[#57a0ff] text-xs font-bold uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#f49c0e]" /> Portal de Conhecimento RNSMM
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, {user?.nome}!
            </h1>
            <p className="text-sm text-slate-200 max-w-2xl font-normal leading-relaxed">
              Bem-vindo ao <strong>Scalasystem</strong>. Gerenciamento seguro, governança de arquivos e indexação inteligente para a Rede Scalabriniana de Missões com Migrantes.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadDashboardData}
              title="Atualizar Indicadores"
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition cursor-pointer border border-white/10"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onNavigateToAcervo}
              className="inline-flex items-center gap-2 bg-[#57a0ff] hover:bg-white text-[#013375] font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg transition duration-200 cursor-pointer"
            >
              <span>Acessar Acervo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Métricas Principais (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total de Arquivos */}
        <div className="bg-white rounded-2xl p-5 border border-[#013375]/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acervo Acessível</span>
            <div className="p-2.5 bg-[#013375]/10 text-[#013375] rounded-xl">
              <FolderArchive className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#013375]">
            {loading ? '...' : stats.totalArquivos}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-[#03889c]" />
            {user?.role === 'admin'
              ? `Volume total: ${formatBytes(stats.totalBytes)}`
              : 'Arquivos autorizados para você'}
          </p>
        </div>

        {/* Card 2: Downloads na Semana */}
        <div className="bg-white rounded-2xl p-5 border border-[#013375]/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Downloads (Semana)</span>
            <div className="p-2.5 bg-[#2f6746]/10 text-[#2f6746] rounded-xl">
              <Download className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#2f6746]">
            {loading ? '...' : stats.downloadsSemana}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#2f6746]" />
            Downloads nos últimos 7 dias
          </p>
        </div>

        {/* Card 3: Visualizações na Semana */}
        <div className="bg-white rounded-2xl p-5 border border-[#013375]/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Acessos & Prévias</span>
            <div className="p-2.5 bg-[#03889c]/10 text-[#03889c] rounded-xl">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#03889c]">
            {loading ? '...' : stats.visualizacoesSemana}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#03889c]" />
            Visualizações nos últimos 7 dias
          </p>
        </div>

        {/* Card 4: Segurança & Perfil RBAC */}
        <div className="bg-white rounded-2xl p-5 border border-[#013375]/10 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Privilégio Atual</span>
            <div className="p-2.5 bg-[#910113]/10 text-[#910113] rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold uppercase text-[#910113]">
            {user?.role}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-[#f49c0e]" />
            {user?.role === 'admin' ? 'Acesso irrestrito a logs e dados' : 'Acesso controlado por RLS'}
          </p>
        </div>
      </div>

      {/* Grid Principal: Arquivos Mais Populares & Feed de Atividades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ranking de Documentos Mais Acessados (2 Colunas) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-[#013375]/10 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#013375]/10">
            <div>
              <h2 className="text-base font-extrabold text-[#013375] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#57a0ff]" /> Documentos Mais Acessados
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ranking de documentos com maior número de consultas e downloads.
              </p>
            </div>

            <button
              onClick={onNavigateToAcervo}
              className="text-xs font-bold text-[#013375] hover:text-[#57a0ff] flex items-center gap-1 transition cursor-pointer"
            >
              <span>Ver todos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#013375]" /> Carregando acervo do Neon...
              </div>
            ) : popularFiles.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Nenhum arquivo acessado recentemente.
              </div>
            ) : (
              popularFiles.map((doc, idx) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedFileDetail(doc)}
                  className="p-4 rounded-2xl bg-[#eef5fe]/60 hover:bg-[#eef5fe] border border-[#013375]/10 hover:border-[#57a0ff] transition cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white font-extrabold text-xs text-[#013375] flex items-center justify-center shadow-xs shrink-0">
                      #{idx + 1}
                    </div>

                    <div className="p-2.5 bg-white rounded-xl shadow-xs shrink-0">
                      {getFileIcon(doc.extensao)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-[#010101] group-hover:text-[#013375] transition truncate">
                          {doc.titulo}
                        </h3>
                        {doc.is_confidencial && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#910113]/10 text-[#910113] shrink-0">
                            Confidencial
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-semibold shrink-0">
                          v{doc.versao_atual}.0
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {doc.categoria_nome || 'Geral'} • {doc.nome_original}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5" title="Downloads">
                      <Download className="w-3.5 h-3.5 text-[#2f6746]" />
                      <span className="font-bold">{doc.downloads_count}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Visualizações">
                      <Eye className="w-3.5 h-3.5 text-[#03889c]" />
                      <span className="font-bold">{doc.visualizacoes_count}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-[#013375] transition" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feed de Atividades Recentes (1 Coluna) */}
        <div className="bg-white rounded-3xl p-6 border border-[#013375]/10 shadow-sm space-y-4">
          <div className="pb-3 border-b border-[#013375]/10">
            <h2 className="text-base font-extrabold text-[#013375] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#f49c0e]" /> Atividades Recentes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoria em tempo real de downloads e acessos.
            </p>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="py-10 text-center text-slate-400 text-xs">
                Carregando registros...
              </div>
            ) : activities.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-xs font-medium">
                Nenhuma atividade recente registrada no momento.
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="p-3 bg-[#eef5fe]/50 rounded-xl border border-[#013375]/5 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#013375]">{act.usuario_nome}</span>
                    {getActionBadge(act.acao)}
                  </div>
                  {act.arquivo_titulo && (
                    <p className="text-[11px] text-slate-700 font-medium truncate">
                      {act.arquivo_titulo}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400">
                    {new Date(act.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Documento */}
      {selectedFileDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-[#013375]/20 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#eef5fe] rounded-2xl">
                  {getFileIcon(selectedFileDetail.extensao)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#010101] leading-tight">
                    {selectedFileDetail.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedFileDetail.nome_original} • v{selectedFileDetail.versao_atual}.0
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedFileDetail(null)}
                className="text-slate-400 hover:text-[#010101] p-1 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#eef5fe] p-4 rounded-2xl space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Categoria / Pasta:</span>
                <span className="font-bold text-[#013375]">{selectedFileDetail.categoria_nome || 'Geral'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total de Downloads:</span>
                <span className="font-bold text-[#2f6746]">{selectedFileDetail.downloads_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Total de Visualizações:</span>
                <span className="font-bold text-[#03889c]">{selectedFileDetail.visualizacoes_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Classificação:</span>
                <span className={`font-bold ${selectedFileDetail.is_confidencial ? 'text-[#910113]' : 'text-slate-700'}`}>
                  {selectedFileDetail.is_confidencial ? 'Confidencial (Requer Marca d\'Água)' : 'Público Interno'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedFileDetail(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  setSelectedFileDetail(null);
                  onNavigateToAcervo();
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white transition shadow cursor-pointer"
              >
                Ver no Acervo Completo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

