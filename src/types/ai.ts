export interface AIMetadataResult {
  resumo: string;
  departamento_sugerido: string;
  tags_sugeridas: string[];
  ano_publicacao_estimado: number;
  status_sugerido: 'aprovado' | 'rascunho' | 'arquivado';
  confidencial_provavel: boolean;
}
