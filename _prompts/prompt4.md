# Prompt 4 — Gestão de Acervo, Upload Multi-formato e Controle de Permissões

Agora vamos criar a tela de **Gestão do Acervo Digital** e o modal/fluxo de **Upload Multi-formato** com atribuição granular de permissões.

## 1. Tela de Listagem do Acervo

- Exibir arquivos disponíveis para o usuário com visualização em Grade (Grid) ou Lista (Tabela).
- Cada item exibe:
  - Ícone representativo do tipo de mídia (PDF, Word, Imagem, Vídeo)
  - Título, autor, departamento, ano de publicação e versão atual (ex.: `v1.2`)
  - Badges de tags e indicador se é confidencial
  - Ações rápidas: Pré-visualizar, Download (se permitido), Configurar Permissões (Admin/Editor), Nova Versão e Enviar para Lixeira (Soft Delete).
- Botão em destaque: **"Novo Upload"** (habilitado para Administradores e Editores).

## 2. Formulário / Modal de Upload Multi-formato

Organizado em 3 etapas ou abas: **Arquivo & Metadados**, **Classificação & Status** e **Permissões Granulares**.

### Aba 1 — Arquivo & Metadados
- Área de *Drag and Drop* para upload de arquivos:
  - Suporte a PDF, Word (.docx), texto simples (.txt), imagens (PNG, JPG, SVG) e vídeos (MP4, MOV).
  - Exibição de pré-visualização imediata ou thumbnail do arquivo.
  - Título do documento (obrigatório, auto-preenchido com o nome original do arquivo se vazio).
  - Descrição resumida do conteúdo.

### Aba 2 — Classificação & Status
- Categoria / Pasta (seletor vinculado à tabela `categorias`)
- Autor e Departamento responsável
- Ano de Publicação (seletor de ano)
- Status do documento: Rascunho, Aprovado ou Arquivado
- Tags / Palavras-chave (campo para inserção e remoção dinâmica de tags)
- Toggle "Documento Confidencial" (marca d'água dinâmica e restrição de compartilhamento)

### Aba 3 — Permissões de Acesso (RBAC & Granular)
- Seletor de acesso geral: Público interno ou Restrito.
- Lista de seleção de usuários com permissões específicas:
  - Usuário (dropdown com busca)
  - Pode Visualizar (sim/não)
  - Pode Baixar (sim/não)
  - Pode Editar / Subir Versões (sim/não)

## 3. Regras importantes
- O envio do binário do arquivo deve ser feito para o Storage/Bucket seguro e a URL gerada persistida no Neon (`arquivos` e primeira versão em `versoes_arquivos`).
- Ao concluir o upload com sucesso, registrar o log de auditoria (`acao = 'upload'`) com o IP e identificação do usuário.
- Respeitar estritamente a matriz de permissões: Leitor Comum não pode fazer upload nem alterar permissões.
- Notificar sucesso através de um Toast amigável.

## Design
- Componentes modernos via Shadcn/UI (Dialog, Tabs, Badge, Dropzone, Switch, Select).
- Indicadores visuais claros para formatos de arquivo e arquivos com tag confidencial.
