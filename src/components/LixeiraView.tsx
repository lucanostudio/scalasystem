import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import type { Arquivo } from '@/types/arquivo';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  FolderArchive,
  Calendar,
  Lock
} from 'lucide-react';

export const LixeiraView: React.FC = () => {
  const { user } = useAuth();
  const [arquivosDeletados, setArquivosDeletados] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadLixeira = async () => {
    setLoading(true);
    try {
      const rows = await sql`
        SELECT a.*, c.nome AS categoria_nome, u.nome AS criador_nome
        FROM arquivos a
        LEFT JOIN categorias c ON c.id = a.categoria_id
        LEFT JOIN usuarios u ON u.id = a.criado_por
        WHERE a.is_deleted = true
        ORDER BY a.deleted_at DESC;
      `;

      setArquivosDeletados(
        rows.map((r: any) => ({
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
          deleted_at: r.deleted_at,
          criado_por: r.criado_por,
          criador_nome: r.criador_nome,
          created_at: r.created_at,
          updated_at: r.updated_at,
        }))
      );
    } catch (err) {
      console.error('Erro ao carregar lixeira:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLixeira();
  }, []);

  const handleRestaurar = async (arquivo: Arquivo) => {
    if (!confirm(`Deseja restaurar o arquivo "${arquivo.titulo}" para o acervo ativo?`)) return;

    try {
      await sql`
        UPDATE arquivos
        SET is_deleted = false, deleted_at = NULL
        WHERE id = ${arquivo.id}::uuid;
      `;

      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (${user?.id}::uuid, ${arquivo.id}::uuid, 'restauracao', '192.168.1.10', ${navigator.userAgent});
      `;

      showToast(`Arquivo "${arquivo.titulo}" restaurado com sucesso!`);
      await loadLixeira();
    } catch (err) {
      console.error('Erro ao restaurar:', err);
      alert('Não foi possível restaurar o arquivo.');
    }
  };

  const handlePurgarDefinitivo = async (arquivo: Arquivo) => {
    if (user?.role !== 'admin') {
      alert('Apenas administradores podem purgar arquivos definitivamente.');
      return;
    }

    if (
      !confirm(
        `ATENÇÃO: A purgação de "${arquivo.titulo}" é IRREVERSÍVEL. O arquivo e todo o seu histórico de versões e permissões serão eliminados permanentemente. Deseja continuar?`
      )
    ) {
      return;
    }

    try {
      await sql`
        DELETE FROM arquivos
        WHERE id = ${arquivo.id}::uuid;
      `;

      await sql`
        INSERT INTO logs_auditoria (usuario_id, acao, ip_address, user_agent)
        VALUES (${user?.id}::uuid, 'expurgo_definitivo', '192.168.1.10', ${navigator.userAgent});
      `;

      showToast(`Arquivo "${arquivo.titulo}" expurgado definitivamente.`);
      await loadLixeira();
    } catch (err) {
      console.error('Erro ao purgar arquivo:', err);
      alert('Não foi possível purgar o arquivo.');
    }
  };

  const getMediaIcon = (ext: string) => {
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

  const filtered = arquivosDeletados.filter(
    (a) =>
      a.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.nome_original.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-['Montserrat']">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#013375] text-white px-5 py-3 rounded-2xl shadow-2xl border border-[#57a0ff]/40 flex items-center gap-3 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-[#57a0ff]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#910113] flex items-center gap-2">
            <Trash2 className="w-7 h-7 text-[#910113]" /> Lixeira e Soft Delete
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Arquivos removidos temporariamente do acervo. Restaure-os ou efetue a purgação definitiva.
          </p>
        </div>

        <button
          onClick={loadLixeira}
          title="Atualizar Lixeira"
          className="p-2.5 bg-white border border-slate-200 hover:bg-[#eef5fe] rounded-2xl text-slate-600 transition cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-2xl p-4 border border-[#013375]/10 shadow-xs max-w-md">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar na lixeira..."
            className="w-full bg-[#eef5fe]/60 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#910113]"
          />
        </div>
      </div>

      {/* Tabela de Itens na Lixeira */}
      <div className="bg-white rounded-3xl border border-[#013375]/10 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#eef5fe] text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-4">Arquivo Excluído</th>
                <th className="p-4">Categoria</th>
                <th className="p-4">Excluído em</th>
                <th className="p-4">Versão</th>
                <th className="p-4 text-right">Ações de Recuperação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#910113]" />
                    Carregando lixeira...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    A lixeira está vazia. Nenhum documento excluído.
                  </td>
                </tr>
              ) : (
                filtered.map((arq) => (
                  <tr key={arq.id} className="hover:bg-slate-50 transition">
                    <td className="p-4 flex items-center gap-3">
                      <div className="p-2 bg-[#eef5fe] rounded-xl shrink-0">
                        {getMediaIcon(arq.extensao)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-800 truncate max-w-sm flex items-center gap-1.5">
                          {arq.titulo}
                          {arq.is_confidencial && (
                            <Lock className="w-3 h-3 text-[#910113] shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {arq.nome_original}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-600">
                      {arq.categoria_nome || 'Geral'}
                    </td>
                    <td className="p-4 text-slate-500">
                      {arq.deleted_at
                        ? new Date(arq.deleted_at).toLocaleString('pt-BR')
                        : 'Recente'}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#013375]/10 text-[#013375]">
                        v{arq.versao_atual}.0
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestaurar(arq)}
                          className="px-3 py-1.5 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white font-bold rounded-xl text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restaurar</span>
                        </button>

                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handlePurgarDefinitivo(arq)}
                            title="Purgar Permanentemente"
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-[#910113] rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

