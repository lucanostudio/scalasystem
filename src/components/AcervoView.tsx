import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import type { Arquivo, Categoria } from '@/types/arquivo';
import { UploadModal } from './UploadModal';
import { PermissionsModal } from './PermissionsModal';
import { DocumentDetailModal } from './DocumentDetailModal';
import {
  FolderArchive,
  Upload,
  LayoutGrid,
  List,
  Search,
  Filter,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  Download,
  Eye,
  Shield,
  Trash2,
  Lock,
  Tag,
  RefreshCw,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  X,
  RotateCcw
} from 'lucide-react';

export const AcervoView: React.FC = () => {
  const { user } = useAuth();
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filtros Avançados & Drawer
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('all');
  const [selectedTipo, setSelectedTipo] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartamento, setSelectedDepartamento] = useState<string>('all');
  const [anoInicio, setAnoInicio] = useState<number>(2020);
  const [anoFim, setAnoFim] = useState<number>(new Date().getFullYear());
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allAvailableTags, setAllAvailableTags] = useState<{ tag: string; count: number }[]>([]);
  const [allDepartamentos, setAllDepartamentos] = useState<string[]>([]);

  // Modais
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [selectedFileForPermissions, setSelectedFileForPermissions] = useState<Arquivo | null>(null);
  const [selectedFileForDetail, setSelectedFileForDetail] = useState<Arquivo | null>(null);

  // Toast Notificação
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAcervo = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Carregar categorias
      const catRows = await sql`
        SELECT id, nome, descricao FROM categorias ORDER BY nome ASC;
      `;
      setCategorias(catRows.map((r: any) => ({ id: r.id, nome: r.nome, descricao: r.descricao })));

      // 2. Carregar arquivos respeitando privilégios RLS do usuário logado
      let filesRows: any[];
      if (user.role === 'admin') {
        filesRows = await sql`
          SELECT a.*, c.nome AS categoria_nome, u.nome AS criador_nome,
                 true AS pode_visualizar, true AS pode_baixar, true AS pode_editar
          FROM arquivos a
          LEFT JOIN categorias c ON c.id = a.categoria_id
          LEFT JOIN usuarios u ON u.id = a.criado_por
          WHERE a.is_deleted = false
          ORDER BY a.created_at DESC;
        `;
      } else {
        filesRows = await sql`
          SELECT a.*, c.nome AS categoria_nome, u.nome AS criador_nome,
                 COALESCE(pa.pode_visualizar, (a.criado_por = ${user.id}::uuid)) AS pode_visualizar,
                 COALESCE(pa.pode_baixar, (a.criado_por = ${user.id}::uuid)) AS pode_baixar,
                 COALESCE(pa.pode_editar, (a.criado_por = ${user.id}::uuid)) AS pode_editar
          FROM arquivos a
          LEFT JOIN categorias c ON c.id = a.categoria_id
          LEFT JOIN usuarios u ON u.id = a.criado_por
          LEFT JOIN permissoes_arquivos pa ON pa.arquivo_id = a.id AND pa.usuario_id = ${user.id}::uuid
          WHERE a.is_deleted = false
            AND (
              a.criado_por = ${user.id}::uuid
              OR (pa.pode_visualizar = true)
            )
          ORDER BY a.created_at DESC;
        `;
      }

      const listaArquivos: Arquivo[] = filesRows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        descricao: r.descricao,
        nome_original: r.nome_original,
        tipo_mime: r.tipo_mime,
        extensao: r.extensao,
        tamanho_bytes: Number(r.tamanho_bytes),
        url_armazenamento: r.url_armazenamento,
        categoria_id: r.categoria_id,
        categoria_nome: r.categoria_nome,
        ano_publicacao: r.ano_publicacao,
        autor: r.autor,
        departamento: r.departamento,
        status: r.status,
        tags: r.tags || [],
        versao_atual: r.versao_atual,
        is_confidencial: r.is_confidencial,
        is_deleted: r.is_deleted,
        criado_por: r.criado_por,
        criador_nome: r.criador_nome,
        created_at: r.created_at,
        updated_at: r.updated_at,
        pode_visualizar: r.pode_visualizar ?? true,
        pode_baixar: r.pode_baixar ?? true,
        pode_editar: r.pode_editar ?? (user.role === 'admin'),
      }));

      setArquivos(listaArquivos);

      // Extrair tags únicas com contagem
      const tagCountMap: Record<string, number> = {};
      const deptoSet = new Set<string>();

      listaArquivos.forEach((a) => {
        if (a.departamento) deptoSet.add(a.departamento);
        a.tags.forEach((t) => {
          tagCountMap[t] = (tagCountMap[t] || 0) + 1;
        });
      });

      setAllAvailableTags(
        Object.entries(tagCountMap)
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count)
      );

      setAllDepartamentos(Array.from(deptoSet));
    } catch (err) {
      console.error('Erro ao carregar acervo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAcervo();
  }, [user]);

  // Ação de Download Seguro com Registro de Log
  const handleDownload = async (arquivo: Arquivo, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!arquivo.pode_baixar && user?.role !== 'admin') {
      alert('Você não possui autorização para baixar este documento.');
      return;
    }

    try {
      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user?.id}::uuid, ${arquivo.id}::uuid, 'download', '192.168.1.10', ${navigator.userAgent});
      `;
      showToast(`Download de "${arquivo.titulo}" registrado.`);
      window.open(arquivo.url_armazenamento, '_blank');
    } catch (e) {
      console.error('Erro ao registrar log de download:', e);
    }
  };

  // Soft Delete (Enviar para lixeira)
  const handleSoftDelete = async (arquivoId: string, titulo: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Deseja mover o arquivo "${titulo}" para a lixeira?`)) return;

    try {
      await sql`
        UPDATE arquivos
        SET is_deleted = true, deleted_at = NOW()
        WHERE id = ${arquivoId}::uuid;
      `;

      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user?.id}::uuid, ${arquivoId}::uuid, 'exclusao', '192.168.1.10', ${navigator.userAgent});
      `;

      showToast(`Arquivo "${titulo}" movido para a lixeira.`);
      await loadAcervo();
    } catch (err) {
      console.error('Erro ao excluir arquivo:', err);
      alert('Não foi possível excluir o arquivo.');
    }
  };

  const getMediaIcon = (ext: string) => {
    switch (ext.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-6 h-6 text-[#910113]" />;
      case 'docx':
      case 'doc':
        return <FileSpreadsheet className="w-6 h-6 text-[#013375]" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
        return <FileImage className="w-6 h-6 text-[#03889c]" />;
      case 'mp4':
      case 'mov':
        return <Video className="w-6 h-6 text-[#ff8b00]" />;
      default:
        return <FolderArchive className="w-6 h-6 text-slate-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const toggleTagFilter = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleLimparFiltros = () => {
    setSearchTerm('');
    setSelectedCategoria('all');
    setSelectedTipo('all');
    setSelectedStatus('all');
    setSelectedDepartamento('all');
    setAnoInicio(2020);
    setAnoFim(new Date().getFullYear());
    setSelectedTags([]);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedCategoria !== 'all' ||
    selectedTipo !== 'all' ||
    selectedStatus !== 'all' ||
    selectedDepartamento !== 'all' ||
    anoInicio !== 2020 ||
    anoFim !== new Date().getFullYear() ||
    selectedTags.length > 0;

  // Filtragem Multi-critério com Full-Text
  const filteredArquivos = arquivos.filter((arq) => {
    const matchesSearch =
      searchTerm === '' ||
      arq.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      arq.nome_original.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (arq.descricao && arq.descricao.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (arq.autor && arq.autor.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (arq.departamento && arq.departamento.toLowerCase().includes(searchTerm.toLowerCase())) ||
      arq.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategoria === 'all' || arq.categoria_id === selectedCategoria;
    const matchesDepto = selectedDepartamento === 'all' || arq.departamento === selectedDepartamento;
    const matchesTipo =
      selectedTipo === 'all' ||
      (selectedTipo === 'pdf' && arq.extensao === 'pdf') ||
      (selectedTipo === 'doc' && ['docx', 'doc'].includes(arq.extensao)) ||
      (selectedTipo === 'imagem' && ['png', 'jpg', 'jpeg', 'svg'].includes(arq.extensao)) ||
      (selectedTipo === 'video' && ['mp4', 'mov'].includes(arq.extensao));

    const matchesStatus = selectedStatus === 'all' || arq.status === selectedStatus;
    const ano = arq.ano_publicacao || 2026;
    const matchesAno = ano >= anoInicio && ano <= anoFim;

    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((st) => arq.tags.includes(st));

    return matchesSearch && matchesCat && matchesDepto && matchesTipo && matchesStatus && matchesAno && matchesTags;
  });

  const canUpload = user?.role === 'admin' || user?.role === 'editor';

  return (
    <div className="space-y-6 font-['Montserrat']">
      {/* Toast Notificação */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#013375] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#57a0ff]/40 flex items-center gap-3 animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#57a0ff]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Ação de Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#013375] flex items-center gap-2">
            <FolderArchive className="w-7 h-7 text-[#57a0ff]" /> Acervo Digital da RNSMM
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Indexação inteligente, busca multi-filtro e visualizador protegido com marca d'água dinâmica.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canUpload && (
            <button
              onClick={() => setIsUploadOpen(true)}
              className="inline-flex items-center gap-2 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-[#013375]/20 transition duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Novo Upload
            </button>
          )}

          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade"
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#013375] text-white'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Visualização em Lista"
              className={`p-2 rounded-lg transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-[#013375] text-white'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Busca Textual (Full-Text Search) & Botão Drawer de Filtros */}
      <div className="bg-white rounded-2xl p-4 border border-[#013375]/10 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisa rápida (título, autor, departamento, conteúdo)..."
            className="w-full bg-[#eef5fe]/60 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013375]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={() => setIsFilterDrawerOpen(true)}
            className={`px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
              hasActiveFilters
                ? 'bg-[#013375] text-white border-[#013375] shadow-xs'
                : 'bg-[#eef5fe]/60 text-slate-700 border-slate-200 hover:bg-[#eef5fe]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#57a0ff]" />
            <span>Filtros Avançados</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-[#ff8b00]" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={handleLimparFiltros}
              className="text-xs text-slate-500 hover:text-[#910113] font-semibold flex items-center gap-1 cursor-pointer px-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}

          <div className="text-xs font-bold text-slate-500 pl-2 border-l border-slate-200">
            {filteredArquivos.length} {filteredArquivos.length === 1 ? 'resultado' : 'resultados'}
          </div>
        </div>
      </div>

      {/* Tags Selecionadas Ativas */}
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Tags Ativas:</span>
          {selectedTags.map((tag) => (
            <span
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#013375] text-white cursor-pointer hover:bg-[#910113] transition"
            >
              #{tag} <X className="w-3 h-3" />
            </span>
          ))}
        </div>
      )}

      {/* Conteúdo: Grade ou Tabela */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-[#013375]" />
          <span>Consultando acervo...</span>
        </div>
      ) : filteredArquivos.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-[#013375]/10 shadow-xs">
          <FolderArchive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">Nenhum documento encontrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Nenhum resultado corresponde à combinação de filtros aplicada. Tente redefinir os filtros.
          </p>
          <button
            onClick={handleLimparFiltros}
            className="mt-4 px-4 py-2 bg-[#013375] text-white text-xs font-bold rounded-xl hover:bg-[#57a0ff] hover:text-[#010101] transition cursor-pointer"
          >
            Limpar Todos os Filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* VISUALIZAÇÃO EM GRADE */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArquivos.map((arq) => (
            <div
              key={arq.id}
              onClick={() => setSelectedFileForDetail(arq)}
              className="bg-white rounded-3xl p-5 border border-[#013375]/10 hover:border-[#57a0ff] shadow-xs hover:shadow-md transition flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="p-3 bg-[#eef5fe] rounded-2xl group-hover:scale-105 transition">
                    {getMediaIcon(arq.extensao)}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 justify-end">
                    {arq.is_confidencial && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#910113]/10 text-[#910113] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Confidencial
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#013375]/10 text-[#013375]">
                      v{arq.versao_atual}.0
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        arq.status === 'aprovado'
                          ? 'bg-[#2f6746]/10 text-[#2f6746]'
                          : arq.status === 'rascunho'
                          ? 'bg-[#f49c0e]/10 text-[#f49c0e]'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {arq.status}
                    </span>
                  </div>
                </div>

                {/* Título e Metadados */}
                <h3 className="text-sm font-bold text-[#010101] group-hover:text-[#013375] transition line-clamp-2">
                  {arq.titulo}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {arq.descricao || arq.nome_original}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-[11px] text-slate-600 font-medium">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categoria:</span>
                    <span className="font-semibold text-slate-700">{arq.categoria_nome || 'Geral'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Autor / Depto:</span>
                    <span className="truncate max-w-[150px]">{arq.autor || 'N/D'} {arq.departamento ? `• ${arq.departamento}` : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tamanho / Ano:</span>
                    <span>{formatBytes(arq.tamanho_bytes)} • {arq.ano_publicacao || '2026'}</span>
                  </div>
                </div>

                {/* Tags */}
                {arq.tags && arq.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {arq.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[10px] bg-[#eef5fe] text-[#013375] px-2 py-0.5 rounded-full font-semibold">
                        #{t}
                      </span>
                    ))}
                    {arq.tags.length > 3 && (
                      <span className="text-[10px] text-slate-400 self-center">
                        +{arq.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Ações Rápidas no Rodapé */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFileForDetail(arq);
                    }}
                    title="Abrir Visualizador Detalhado"
                    className="p-2 text-slate-500 hover:text-[#013375] hover:bg-[#eef5fe] rounded-xl transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => handleDownload(arq, e)}
                    title={arq.pode_baixar ? 'Baixar Arquivo' : 'Download não autorizado'}
                    disabled={!arq.pode_baixar && user?.role !== 'admin'}
                    className={`p-2 rounded-xl transition cursor-pointer ${
                      arq.pode_baixar || user?.role === 'admin'
                        ? 'text-slate-500 hover:text-[#2f6746] hover:bg-emerald-50'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {user?.role === 'admin' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFileForPermissions(arq);
                        setIsPermissionsOpen(true);
                      }}
                      title="Configurar Permissões Granulares"
                      className="p-2 text-slate-500 hover:text-[#03889c] hover:bg-teal-50 rounded-xl transition cursor-pointer"
                    >
                      <Shield className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {(user?.role === 'admin' || (user?.role === 'editor' && arq.pode_editar)) && (
                  <button
                    onClick={(e) => handleSoftDelete(arq.id, arq.titulo, e)}
                    title="Mover para a Lixeira (Soft Delete)"
                    className="p-2 text-slate-400 hover:text-[#910113] hover:bg-red-50 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM TABELA */
        <div className="bg-white rounded-3xl border border-[#013375]/10 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#eef5fe] text-slate-600 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="p-4">Documento</th>
                  <th className="p-4">Categoria</th>
                  <th className="p-4">Autor / Depto</th>
                  <th className="p-4">Ano</th>
                  <th className="p-4">Versão</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredArquivos.map((arq) => (
                  <tr
                    key={arq.id}
                    onClick={() => setSelectedFileForDetail(arq)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-[#eef5fe] rounded-xl shrink-0">
                        {getMediaIcon(arq.extensao)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate max-w-xs flex items-center gap-1.5">
                          {arq.titulo}
                          {arq.is_confidencial && (
                            <Lock className="w-3 h-3 text-[#910113] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {arq.nome_original} • {formatBytes(arq.tamanho_bytes)}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {arq.categoria_nome || 'Geral'}
                    </td>
                    <td className="p-4 text-slate-600">
                      <div>{arq.autor || 'N/D'}</div>
                      <div className="text-[10px] text-slate-400">{arq.departamento}</div>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">
                      {arq.ano_publicacao || '2026'}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#013375]/10 text-[#013375]">
                        v{arq.versao_atual}.0
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          arq.status === 'aprovado'
                            ? 'bg-[#2f6746]/10 text-[#2f6746]'
                            : arq.status === 'rascunho'
                            ? 'bg-[#f49c0e]/10 text-[#f49c0e]'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {arq.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFileForDetail(arq);
                          }}
                          title="Visualizar"
                          className="p-1.5 text-slate-500 hover:text-[#013375] rounded-lg transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDownload(arq, e)}
                          disabled={!arq.pode_baixar && user?.role !== 'admin'}
                          title="Baixar"
                          className={`p-1.5 rounded-lg transition ${
                            arq.pode_baixar || user?.role === 'admin'
                              ? 'text-slate-500 hover:text-[#2f6746]'
                              : 'text-slate-300'
                          }`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFileForPermissions(arq);
                              setIsPermissionsOpen(true);
                            }}
                            title="Permissões"
                            className="p-1.5 text-slate-500 hover:text-[#03889c] rounded-lg transition"
                          >
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        {(user?.role === 'admin' || (user?.role === 'editor' && arq.pode_editar)) && (
                          <button
                            onClick={(e) => handleSoftDelete(arq.id, arq.titulo, e)}
                            title="Lixeira"
                            className="p-1.5 text-slate-400 hover:text-[#910113] rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DRAWER LATERAL DE FILTROS AVANÇADOS */}
      {isFilterDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-slide-left">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#013375]" />
                  <h2 className="text-base font-bold text-[#013375]">Refinamento e Filtros</h2>
                </div>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filtro por Categoria */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Categoria / Pasta
                </label>
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#013375]"
                >
                  <option value="all">Todas as Pastas</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Departamento */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Departamento
                </label>
                <select
                  value={selectedDepartamento}
                  onChange={(e) => setSelectedDepartamento(e.target.value)}
                  className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#013375]"
                >
                  <option value="all">Todos os Departamentos</option>
                  {allDepartamentos.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Tipo de Mídia */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Tipo de Mídia
                </label>
                <select
                  value={selectedTipo}
                  onChange={(e) => setSelectedTipo(e.target.value)}
                  className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:ring-2 focus:ring-[#013375]"
                >
                  <option value="all">Todos os Formatos</option>
                  <option value="pdf">Documentos PDF (.pdf)</option>
                  <option value="doc">Documentos Word (.docx, .doc)</option>
                  <option value="imagem">Imagens (PNG, JPG, SVG)</option>
                  <option value="video">Vídeos (MP4, MOV)</option>
                </select>
              </div>

              {/* Intervalo de Anos */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Intervalo de Ano ({anoInicio} - {anoFim})
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">De:</span>
                    <input
                      type="number"
                      value={anoInicio}
                      onChange={(e) => setAnoInicio(Number(e.target.value))}
                      min={1950}
                      max={anoFim}
                      className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">Até:</span>
                    <input
                      type="number"
                      value={anoFim}
                      onChange={(e) => setAnoFim(Number(e.target.value))}
                      min={anoInicio}
                      max={2030}
                      className="w-full bg-[#eef5fe]/60 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Status de Homologação
                </label>
                <div className="flex gap-4">
                  {(['all', 'aprovado', 'rascunho', 'arquivado'] as const).map((st) => (
                    <label key={st} className="flex items-center gap-1.5 text-xs capitalize text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name="drawerStatus"
                        checked={selectedStatus === st}
                        onChange={() => setSelectedStatus(st)}
                        className="text-[#013375]"
                      />
                      {st === 'all' ? 'Todos' : st}
                    </label>
                  ))}
                </div>
              </div>

              {/* Tags com Contagem */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Tags & Palavras-chave
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1">
                  {allAvailableTags.map(({ tag, count }) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTagFilter(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-[#013375] text-white shadow-xs'
                            : 'bg-[#eef5fe] text-[#013375] hover:bg-[#013375]/10'
                        }`}
                      >
                        #{tag}
                        <span className="text-[10px] opacity-75">({count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-200 flex gap-2">
              <button
                type="button"
                onClick={handleLimparFiltros}
                className="w-1/2 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Limpar Filtros
              </button>
              <button
                type="button"
                onClick={() => setIsFilterDrawerOpen(false)}
                className="w-1/2 py-2.5 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow"
              >
                Aplicar ({filteredArquivos.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modais */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        categorias={categorias}
        onCategoriaCriada={(nova) => setCategorias([...categorias, nova])}
        onSuccess={() => {
          showToast('Arquivo enviado com sucesso para o Acervo!');
          loadAcervo();
        }}
      />

      <PermissionsModal
        isOpen={isPermissionsOpen}
        onClose={() => setIsPermissionsOpen(false)}
        arquivo={selectedFileForPermissions}
        onSuccess={() => {
          showToast('Permissões do arquivo atualizadas com sucesso!');
          loadAcervo();
        }}
      />

      <DocumentDetailModal
        isOpen={!!selectedFileForDetail}
        onClose={() => setSelectedFileForDetail(null)}
        arquivo={selectedFileForDetail}
        onUpdated={() => {
          loadAcervo();
        }}
      />
    </div>
  );
};
