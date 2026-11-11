export interface Categoria {
  id: string;
  nome: string;
  descricao?: string;
}

export interface Arquivo {
  id: string;
  titulo: string;
  descricao?: string;
  nome_original: string;
  tipo_mime: string;
  extensao: string;
  tamanho_bytes: number;
  url_armazenamento: string;
  categoria_id?: string;
  categoria_nome?: string;
  ano_publicacao?: number;
  autor?: string;
  departamento?: string;
  status: 'rascunho' | 'aprovado' | 'arquivado';
  tags: string[];
  versao_atual: number;
  is_confidencial: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  criado_por: string;
  criador_nome?: string;
  created_at: string;
  updated_at: string;
  // Permissões do usuário atual para este arquivo
  pode_visualizar?: boolean;
  pode_baixar?: boolean;
  pode_editar?: boolean;
}

export interface PermissaoArquivo {
  id?: string;
  arquivo_id: string;
  usuario_id: string;
  usuario_nome?: string;
  usuario_email?: string;
  pode_visualizar: boolean;
  pode_baixar: boolean;
  pode_editar: boolean;
}

