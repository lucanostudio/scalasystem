import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sql } from '@/lib/neon';
import { indexarDocumentoComIA } from '@/lib/gemini';
import type { Categoria, PermissaoArquivo } from '@/types/arquivo';
import type { User } from '@/types/auth';
import {
  Upload,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  X,
  Plus,
  Shield,
  Tag,
  FolderTree,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Lock,
  Globe,
  FolderPlus,
  Sparkles,
  Bot
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  categorias: Categoria[];
  onCategoriaCriada?: (novaCat: Categoria) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categorias: initialCategorias,
  onCategoriaCriada,
}) => {
  const { user, listUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'arquivo' | 'classificacao' | 'permissoes'>('arquivo');

  // Categorias locais para atualizar dinamicamente quando uma nova for criada
  const [localCategorias, setLocalCategorias] = useState<Categoria[]>(initialCategorias);
  const [showNovaCategoria, setShowNovaCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [criandoCategoria, setCriandoCategoria] = useState(false);

  // Aba 1: Arquivo & Metadados
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');

  // Aba 2: Classificação & Status
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [autor, setAutor] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [anoPublicacao, setAnoPublicacao] = useState<number>(new Date().getFullYear());
  const [statusDoc, setStatusDoc] = useState<'rascunho' | 'aprovado' | 'arquivado'>('aprovado');
  const [tags, setTags] = useState<string[]>([]);
  const [currentTag, setCurrentTag] = useState('');
  const [isConfidencial, setIsConfidencial] = useState(false);

  // IA State
  const [isAnalyzingIA, setIsAnalyzingIA] = useState(false);
  const [iaMessage, setIaMessage] = useState<string | null>(null);

  // Aba 3: Permissões Granulares
  const [acessoGeral, setAcessoGeral] = useState<'publico' | 'restrito'>('publico');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [permissoes, setPermissoes] = useState<PermissaoArquivo[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalCategorias(initialCategorias);
  }, [initialCategorias]);

  useEffect(() => {
    if (isOpen) {
      if (localCategorias.length > 0 && !categoriaId) {
        setCategoriaId(localCategorias[0].id);
      }
      listUsers().then((res) => {
        setAllUsers(res.filter((u) => u.id !== user?.id));
      });
      // Reset formulário
      setSelectedFile(null);
      setFilePreview(null);
      setTitulo('');
      setDescricao('');
      setAutor(user?.nome || '');
      setDepartamento('Geral');
      setAnoPublicacao(new Date().getFullYear());
      setStatusDoc('aprovado');
      setTags(['scalabrinianos', 'rnsmm']);
      setIsConfidencial(false);
      setAcessoGeral('publico');
      setPermissoes([]);
      setActiveTab('arquivo');
      setShowNovaCategoria(false);
      setNovaCategoriaNome('');
      setIsAnalyzingIA(false);
      setIaMessage(null);
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!titulo) {
        const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        setTitulo(nameWithoutExt.replace(/[-_]/g, ' '));
      }

      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => setFilePreview(event.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        setFilePreview(null);
      }
    }
  };

  // Acionamento da IA Gemini
  const handleAutoPreencherComIA = async () => {
    if (!selectedFile && !titulo) {
      setError('Selecione um arquivo ou digite um título antes de acionar a IA.');
      return;
    }

    setIsAnalyzingIA(true);
    setIaMessage('Analisando conteúdo...');
    setError(null);

    // Mensagens dinâmicas de feedback visual
    const timer1 = setTimeout(() => {
      setIaMessage('IA extraindo metadados...');
    }, 900);
    const timer2 = setTimeout(() => {
      setIaMessage('Categorizando documento...');
    }, 1800);

    try {
      const result = await indexarDocumentoComIA(
        selectedFile ? selectedFile.name : titulo,
        descricao
      );

      clearTimeout(timer1);
      clearTimeout(timer2);

      setDescricao(result.resumo);
      setDepartamento(result.departamento_sugerido);
      setAnoPublicacao(result.ano_publicacao_estimado);
      setStatusDoc(result.status_sugerido);
      setIsConfidencial(result.confidencial_provavel);

      // Combinar tags existentes com sugeridas sem duplicação
      const combinedTags = Array.from(new Set([...tags, ...result.tags_sugeridas]));
      setTags(combinedTags);

      setIaMessage('✨ Metadados preenchidos com sucesso pela IA! Você pode revisar e editar cada campo.');
      setTimeout(() => setIaMessage(null), 5000);
      setActiveTab('classificacao');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      console.error('Erro na indexação com IA:', err);
      setError('Não foi possível indexar o documento com IA no momento. Deseja tentar novamente ou preencher manualmente?');
    } finally {
      setIsAnalyzingIA(false);
    }
  };

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim().toLowerCase())) {
      setTags([...tags, currentTag.trim().toLowerCase()]);
      setCurrentTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Cadastrar Nova Categoria / Pasta no Neon
  const handleCadastrarNovaCategoria = async () => {
    if (!novaCategoriaNome.trim()) return;
    setCriandoCategoria(true);
    setError(null);

    try {
      const rows = await sql`
        INSERT INTO categorias (nome, descricao)
        VALUES (${novaCategoriaNome.trim()}, 'Criada via modal de upload')
        RETURNING id, nome, descricao;
      `;

      if (rows && rows.length > 0) {
        const novaCat: Categoria = {
          id: rows[0].id,
          nome: rows[0].nome,
          descricao: rows[0].descricao,
        };
        setLocalCategorias((prev) => [...prev, novaCat]);
        setCategoriaId(novaCat.id);
        setNovaCategoriaNome('');
        setShowNovaCategoria(false);
        if (onCategoriaCriada) {
          onCategoriaCriada(novaCat);
        }
      }
    } catch (err: any) {
      console.error('Erro ao criar categoria:', err);
      setError('Erro ao cadastrar nova categoria/pasta no banco de dados.');
    } finally {
      setCriandoCategoria(false);
    }
  };

  const handleAddPermissaoUser = () => {
    if (!selectedUserId) return;
    const targetUser = allUsers.find((u) => u.id === selectedUserId);
    if (!targetUser) return;

    if (!permissoes.some((p) => p.usuario_id === selectedUserId)) {
      setPermissoes([
        ...permissoes,
        {
          arquivo_id: '',
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

  const handleTogglePermissao = (
    usuarioId: string,
    field: 'pode_visualizar' | 'pode_baixar' | 'pode_editar'
  ) => {
    setPermissoes((prev) =>
      prev.map((p) =>
        p.usuario_id === usuarioId ? { ...p, [field]: !p[field] } : p
      )
    );
  };

  const handleRemovePermissao = (usuarioId: string) => {
    setPermissoes(permissoes.filter((p) => p.usuario_id !== usuarioId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo para upload.');
      setActiveTab('arquivo');
      return;
    }
    if (!titulo.trim()) {
      setError('O título do documento é obrigatório.');
      setActiveTab('arquivo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const extensao = selectedFile.name.split('.').pop()?.toLowerCase() || 'bin';
      const fakeStorageUrl = `https://storage.antigravity.io/rnsmm/${Date.now()}_${encodeURIComponent(selectedFile.name)}`;

      // 1. Inserir arquivo na tabela arquivos
      const insertedRows = await sql`
        INSERT INTO arquivos (
          titulo, descricao, nome_original, tipo_mime, extensao, tamanho_bytes,
          url_armazenamento, categoria_id, ano_publicacao, autor, departamento,
          status, tags, versao_atual, is_confidencial, criado_por
        ) VALUES (
          ${titulo.trim()},
          ${descricao.trim() || null},
          ${selectedFile.name},
          ${selectedFile.type || 'application/octet-stream'},
          ${extensao},
          ${selectedFile.size},
          ${fakeStorageUrl},
          ${categoriaId ? categoriaId : null}::uuid,
          ${anoPublicacao},
          ${autor.trim() || null},
          ${departamento.trim() || null},
          ${statusDoc},
          ${tags},
          1,
          ${isConfidencial},
          ${user?.id}::uuid
        ) RETURNING id;
      `;

      const newArquivoId = insertedRows[0].id;

      // 2. Inserir primeira versão
      await sql`
        INSERT INTO versoes_arquivos (
          arquivo_id, versao, url_armazenamento, tamanho_bytes, notas_alteracao, criado_por
        ) VALUES (
          ${newArquivoId}::uuid,
          1,
          ${fakeStorageUrl},
          ${selectedFile.size},
          'Versão inicial criada via Upload Multi-formato',
          ${user?.id}::uuid
        );
      `;

      // 3. Inserir permissões granulares
      if (acessoGeral === 'publico') {
        for (const u of allUsers) {
          await sql`
            INSERT INTO permissoes_arquivos (arquivo_id, usuario_id, pode_visualizar, pode_baixar, pode_editar)
            VALUES (${newArquivoId}::uuid, ${u.id}::uuid, true, true, false)
            ON CONFLICT (arquivo_id, usuario_id) DO NOTHING;
          `;
        }
      } else {
        for (const p of permissoes) {
          await sql`
            INSERT INTO permissoes_arquivos (arquivo_id, usuario_id, pode_visualizar, pode_baixar, pode_editar)
            VALUES (${newArquivoId}::uuid, ${p.usuario_id}::uuid, ${p.pode_visualizar}, ${p.pode_baixar}, ${p.pode_editar})
            ON CONFLICT (arquivo_id, usuario_id) DO NOTHING;
          `;
        }
      }

      // 4. Gravar log de auditoria
      await sql`
        INSERT INTO logs_auditoria (usuario_id, arquivo_id, acao, ip_address, user_agent)
        VALUES (
          ${user?.id}::uuid,
          ${newArquivoId}::uuid,
          'upload',
          '192.168.1.10',
          ${navigator.userAgent}
        );
      `;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Erro ao fazer upload:', err);
      setError(err.message || 'Erro ao persistir o arquivo no banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  const getMediaIcon = (mime: string, ext: string) => {
    if (ext === 'pdf') return <FileText className="w-8 h-8 text-[#910113]" />;
    if (['doc', 'docx'].includes(ext)) return <FileSpreadsheet className="w-8 h-8 text-[#013375]" />;
    if (['png', 'jpg', 'jpeg', 'svg'].includes(ext)) return <FileImage className="w-8 h-8 text-[#03889c]" />;
    if (['mp4', 'mov'].includes(ext)) return <Video className="w-8 h-8 text-[#ff8b00]" />;
    return <Upload className="w-8 h-8 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-['Montserrat']">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-[#013375]/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header do Modal */}
        <div className="p-6 bg-[#013375] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl">
              <Upload className="w-6 h-6 text-[#57a0ff]" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Novo Upload de Arquivo</h2>
              <p className="text-xs text-[#57a0ff]">
                Adicione mídias, metadados e defina o controle de acesso RBAC
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão de Auto-preenchimento com IA Gemini */}
            <button
              type="button"
              disabled={isAnalyzingIA}
              onClick={handleAutoPreencherComIA}
              className="px-3 py-1.5 bg-[#f49c0e] hover:bg-[#ff8b00] text-[#010101] text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              title="Extrair metadados, resumo e tags automaticamente com IA"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAnalyzingIA ? 'Indexando...' : '✨ Auto-preencher com IA'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-[#eef5fe]/60 px-6 pt-3 shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('arquivo')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeTab === 'arquivo'
                ? 'border-[#013375] text-[#013375]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Arquivo & Metadados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('classificacao')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeTab === 'classificacao'
                ? 'border-[#013375] text-[#013375]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Classificação & Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('permissoes')}
            className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition cursor-pointer border-b-2 ${
              activeTab === 'permissoes'
                ? 'border-[#013375] text-[#013375]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Permissões de Acesso
          </button>
        </div>

        {/* Mensagens de Feedback da IA */}
        {iaMessage && (
          <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{iaMessage}</span>
          </div>
        )}

        {/* Conteúdo das Abas (Scrollável) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* ABA 1: ARQUIVO & METADADOS */}
          {activeTab === 'arquivo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Arquivo do Acervo (Multi-formato: PDF, Word, Vídeos, Imagens, TXT)
                </label>
                <div className="relative border-2 border-dashed border-[#013375]/30 hover:border-[#013375] bg-[#eef5fe]/40 rounded-2xl p-6 text-center transition cursor-pointer group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.svg,.mp4,.mov"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      {filePreview ? (
                        <img
                          src={filePreview}
                          alt="Pré-visualização"
                          className="h-24 w-auto max-w-full rounded-xl object-contain shadow-md mb-2"
                        />
                      ) : (
                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                          {getMediaIcon(
                            selectedFile.type,
                            selectedFile.name.split('.').pop()?.toLowerCase() || ''
                          )}
                        </div>
                      )}
                      <p className="text-sm font-bold text-[#013375]">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type || 'Documento'}
                      </p>
                      <span className="text-[10px] text-[#03889c] font-semibold underline mt-1">
                        Clique ou arraste outro arquivo para trocar
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <div className="p-3 bg-white rounded-2xl text-[#013375] shadow-xs group-hover:scale-105 transition">
                        <Upload className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Arraste e solte o arquivo aqui, ou <span className="text-[#013375] underline">navegue</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Suporte a PDF, DOCX, Imagens (PNG/JPG), Vídeos (MP4/MOV) até 100MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Título do Documento *
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Ata da Reunião de Diretoria RNSMM 2026"
                  required
                  className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Descrição / Resumo Executivo
                </label>
                <textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={3}
                  placeholder="Resumo do conteúdo, objetivos e contexto do documento..."
                  className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                />
              </div>
            </div>
          )}

          {/* ABA 2: CLASSIFICAÇÃO & STATUS */}
          {activeTab === 'classificacao' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Categoria / Pasta
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNovaCategoria(!showNovaCategoria)}
                    className="text-[11px] font-bold text-[#013375] hover:text-[#57a0ff] flex items-center gap-1 transition cursor-pointer"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{showNovaCategoria ? 'Cancelar Nova' : '+ Cadastrar Nova Pasta'}</span>
                  </button>
                </div>

                {showNovaCategoria ? (
                  <div className="p-3 bg-[#eef5fe] border border-[#013375]/30 rounded-2xl space-y-2 animate-fade-in">
                    <span className="text-[10px] font-bold text-[#013375] uppercase block">
                      Criar Nova Categoria / Pasta
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={novaCategoriaNome}
                        onChange={(e) => setNovaCategoriaNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCadastrarNovaCategoria();
                          }
                        }}
                        placeholder="Nome da nova categoria ou pasta..."
                        className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                      />
                      <button
                        type="button"
                        disabled={criandoCategoria || !novaCategoriaNome.trim()}
                        onClick={handleCadastrarNovaCategoria}
                        className="px-4 py-1.5 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {criandoCategoria ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Salvar Pasta
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                  >
                    <option value="">Selecione uma categoria...</option>
                    {localCategorias.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Ano de Publicação
                  </label>
                  <input
                    type="number"
                    value={anoPublicacao}
                    onChange={(e) => setAnoPublicacao(Number(e.target.value))}
                    min={1950}
                    max={2030}
                    className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Autor / Relator
                  </label>
                  <input
                    type="text"
                    value={autor}
                    onChange={(e) => setAutor(e.target.value)}
                    placeholder="Ex: Pe. Paolo, Coordenação RNSMM"
                    className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    value={departamento}
                    onChange={(e) => setDepartamento(e.target.value)}
                    placeholder="Ex: Missões, Jurídico, Pastoral"
                    className="w-full bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Status do Documento
                  </label>
                  <div className="flex gap-4 pt-1">
                    {(['aprovado', 'rascunho', 'arquivado'] as const).map((st) => (
                      <label key={st} className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold capitalize text-slate-700">
                        <input
                          type="radio"
                          name="statusDoc"
                          checked={statusDoc === st}
                          onChange={() => setStatusDoc(st)}
                          className="text-[#013375] focus:ring-[#013375]"
                        />
                        {st}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Tags & Palavras-chave
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Digite uma tag e pressione Adicionar"
                    className="flex-1 bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-1.5 bg-[#013375] text-white text-xs font-bold rounded-xl hover:bg-[#57a0ff] hover:text-[#010101] transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#013375]/10 text-[#013375]"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggle Confidencial */}
              <div className="p-4 bg-[#910113]/5 border border-[#910113]/20 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#910113] flex items-center gap-1.5">
                    <Lock className="w-4 h-4" /> Documento Confidencial
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aplica marca d'água dinâmica ao baixar e restringe o acesso aos usuários com privilégios.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isConfidencial}
                    onChange={(e) => setIsConfidencial(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#910113]"></div>
                </label>
              </div>
            </div>
          )}

          {/* ABA 3: PERMISSÕES GRANULARES */}
          {activeTab === 'permissoes' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Nível de Acesso Inicial
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAcessoGeral('publico')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      acessoGeral === 'publico'
                        ? 'border-[#013375] bg-[#013375]/10 text-[#013375]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Globe className="w-4 h-4 text-[#03889c]" /> Público Interno
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Todos os colaboradores com acesso ao acervo podem visualizar.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAcessoGeral('restrito')}
                    className={`p-3 rounded-2xl border text-left transition cursor-pointer ${
                      acessoGeral === 'restrito'
                        ? 'border-[#910113] bg-[#910113]/10 text-[#910113]'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Lock className="w-4 h-4 text-[#910113]" /> Acesso Restrito
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Apenas usuários especificados na lista abaixo terão acesso.
                    </p>
                  </button>
                </div>
              </div>

              {/* Seletor de Usuários para Permissões */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Adicionar Permissão Específica por Usuário
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 bg-[#eef5fe]/50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#013375]"
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
                    onClick={handleAddPermissaoUser}
                    className="px-4 py-2 bg-[#013375] text-white text-xs font-bold rounded-xl hover:bg-[#57a0ff] hover:text-[#010101] transition cursor-pointer"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Tabela de Permissões */}
                {permissoes.length > 0 && (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden mt-3">
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
                                onChange={() => handleTogglePermissao(p.usuario_id, 'pode_visualizar')}
                                className="rounded text-[#013375]"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={p.pode_baixar}
                                onChange={() => handleTogglePermissao(p.usuario_id, 'pode_baixar')}
                                className="rounded text-[#013375]"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={p.pode_editar}
                                onChange={() => handleTogglePermissao(p.usuario_id, 'pode_editar')}
                                className="rounded text-[#013375]"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemovePermissao(p.usuario_id)}
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
          )}

          {/* Footer com Botões de Ação */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
            >
              Cancelar
            </button>

            <div className="flex gap-2">
              {activeTab !== 'arquivo' && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(activeTab === 'permissoes' ? 'classificacao' : 'arquivo')
                  }
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Voltar
                </button>
              )}

              {activeTab !== 'permissoes' ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(activeTab === 'arquivo' ? 'classificacao' : 'permissoes')
                  }
                  className="px-5 py-2 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow"
                >
                  Avançar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-[#013375] hover:bg-[#57a0ff] hover:text-[#010101] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando no Acervo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#57a0ff]" />
                      <span>Concluir Upload</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
