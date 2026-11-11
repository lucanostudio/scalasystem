# Prompt 1 — Base do projeto + Neon completo (Scalasystem - Acervo Digital da RNSMM)

Você vai criar o banco de dados para o **Scalasystem - Acervo Digital da RNSMM**. Você tem acesso ao Neon via MCP e o banco de dados já está configurado. Crie toda a estrutura diretamente via MCP, sem necessidade de copiar SQL manualmente.

Crie os tipos e as seguintes tabelas com todos os campos e relacionamentos descritos abaixo:

## Enum / Roles
- Crie o tipo de papel: `user_role` (`admin`, `editor`, `leitor`).

## 1. Tabela `usuarios`
- id (uuid, primary key, vinculado ao Neon Auth / gerado automaticamente)
- nome (text, not null)
- email (text, not null, unique)
- role (user_role, not null, default 'leitor')
- ativo (boolean, default true)
- created_at (timestamp with time zone, default now())

## 2. Tabela `categorias` (ou pastas)
- id (uuid, primary key, default gen_random_uuid())
- nome (text, not null)
- descricao (text)
- created_at (timestamp with time zone, default now())

## 3. Tabela `arquivos`
- id (uuid, primary key, default gen_random_uuid())
- titulo (text, not null)
- descricao (text)
- nome_original (text, not null)
- tipo_mime (text, not null) -- ex: application/pdf, image/png, video/mp4, application/vnd.openxmlformats-officedocument.wordprocessingml.document
- extensao (text, not null) -- pdf, docx, png, jpg, mp4, etc.
- tamanho_bytes (bigint, not null)
- url_armazenamento (text, not null) -- storage path / bucket key
- categoria_id (uuid, foreign key → categorias.id, opcional)
- ano_publicacao (integer)
- autor (text)
- departamento (text)
- status (text, default 'rascunho') -- rascunho, aprovado, arquivado
- tags (text array, default '{}')
- versao_atual (integer, default 1)
- is_confidencial (boolean, default false)
- is_deleted (boolean, default false) -- soft delete
- deleted_at (timestamp with time zone)
- criado_por (uuid, foreign key → usuarios.id, not null)
- created_at (timestamp with time zone, default now())
- updated_at (timestamp with time zone, default now())

## 4. Tabela `versoes_arquivos` (Versioning)
- id (uuid, primary key, default gen_random_uuid())
- arquivo_id (uuid, foreign key → arquivos.id on delete cascade, not null)
- versao (integer, not null)
- url_armazenamento (text, not null)
- tamanho_bytes (bigint, not null)
- notas_alteracao (text)
- criado_por (uuid, foreign key → usuarios.id, not null)
- created_at (timestamp with time zone, default now())

## 5. Tabela `permissoes_arquivos` (Controle Granular por Arquivo)
- id (uuid, primary key, default gen_random_uuid())
- arquivo_id (uuid, foreign key → arquivos.id on delete cascade, not null)
- usuario_id (uuid, foreign key → usuarios.id on delete cascade, not null)
- pode_visualizar (boolean, default true)
- pode_baixar (boolean, default true)
- pode_editar (boolean, default false)
- created_at (timestamp with time zone, default now())
- unique (arquivo_id, usuario_id)

## 6. Tabela `logs_auditoria` (Rastreabilidade e Auditoria)
- id (uuid, primary key, default gen_random_uuid())
- usuario_id (uuid, foreign key → usuarios.id on delete set null)
- arquivo_id (uuid, foreign key → arquivos.id on delete set null)
- acao (text, not null) -- 'visualizacao', 'download', 'upload', 'edicao', 'exclusao', 'restauracao'
- ip_address (text)
- user_agent (text)
- created_at (timestamp with time zone, default now())

---

## Row Level Security (RLS) e Políticas de Acesso
Ative o RLS em todas as tabelas:
- **Administrador:** Acesso total (CRUD) em todas as tabelas, permissões e visualização de logs.
- **Editor:** Pode inserir novos arquivos e versões; gerenciar seus próprios uploads; visualizar arquivos permitidos.
- **Leitor:** Pode apenas ler arquivos e fazer download de documentos cujo acesso lhe foi explicitamente atribuído em `permissoes_arquivos` ou que possuam permissão pública/global por categoria, respeitando `is_deleted = false`.
- **Logs:** Apenas inserção pelo backend no momento da ação e leitura restrita aos administradores.

Por fim, confirme a execução validando todas as tabelas, índices (inclusive para busca full-text e tags) e policies criadas.
