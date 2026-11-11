Você é um engenheiro de software sênior responsável por revisar, testar a segurança e preparar o **Repositório Digital de Arquivos da Antigravity** para produção.

# OBJETIVO

Garantir que a aplicação esteja completamente funcional, auditável, segura e pronta para deploy, validando a proteção dos dados, RBAC, governança de arquivos e as regras de segurança corporativa.

# VERIFICAÇÃO DO PROJETO

Revise todo o projeto e valide rigorosamente:

## 1. Estrutura Geral e Build
- Todos os arquivos e módulos essenciais existem (páginas, componentes, rotas e serverless functions).
- Não há imports quebrados, tipos inconsistentes em TypeScript ou warnings graves de linting.
- O build de produção (`npm run build` ou `pnpm build`) executa com sucesso sem falhas.

## 2. Integração com Banco de Dados e Storage (Neon)
- Conexão com o banco Neon estabelecida com segurança via pooling e SSL.
- Autenticação e RBAC (Neon Auth) funcionando corretamente para Administrador, Editor e Leitor.
- Row Level Security (RLS) devidamente ativo e testado:
  - Usuários sem permissão não conseguem ler arquivos privados.
  - Leitores não conseguem inserir, alterar ou deletar arquivos.
  - Logs de auditoria não podem ser alterados ou deletados por usuários comuns.
- Soft Delete funcional: exclusão apenas marca `is_deleted = true`, permitindo restauração antes do expurgo definitivo.
- Suporte a versionamento íntegro: novas versões não sobrescrevem as anteriores.

## 3. Segurança, Permissões e Variáveis de Ambiente
Verificar:
- As chaves de serviço e credenciais de APIs (como `GEMINI_API_KEY`, tokens de banco e segredos do Storage) **NÃO estão**:
  - Hardcoded no código-fonte
  - Expostas no bundle do frontend (verificar variáveis com prefixo indevido `VITE_`)
  - Comitadas no repositório Git
- Regras de Watermarking Dinâmico sendo aplicadas em documentos confidenciais.
- Registro obrigatório de logs de auditoria para ações de visualização e download de arquivos com captura de IP e usuário.

## 4. Arquivo `.env` e `.env.example`
Garantir que exista `.env.example` documentado e que o arquivo `.env` local contenha:
- `VITE_NEON_AUTH_URL=...`
- `DATABASE_URL=...`
- `GEMINI_API_KEY=...` (apenas em ambiente de backend/serverless)
- `STORAGE_BUCKET_URL=...`
- `STORAGE_ACCESS_KEY=...`
- `STORAGE_SECRET_KEY=...`

## 5. `.gitignore`
Verificar se contém:
```
.env
.env.local
.env.*.local
node_modules
dist
_prompts
```

# PROBLEMAS CRÍTICOS A IDENTIFICAR E CORRIGIR
- Vazamento de credenciais ou chaves de IA no código do cliente.
- Falha na validação de permissões granulares no download de arquivos.
- Upload de formatos não permitidos ou ausência de limite no tamanho de arquivos.
- Falta de sanitização nos nomes de arquivos enviados.
- Erros de parsing ou falha de timeout nas funções de indexação com IA.

# DEPLOY — PASSO A PASSO

Se todas as validações forem concluídas com sucesso:

## 1. Controle de Versão e Git
- Verificar o status do repositório (`git status`).
- Revisar alterações e garantir que arquivos temporários ou confidenciais não estejam rastreados.
- Realizar commit das alterações:
  ```bash
  git add .
  git commit -m "feat: implementacao completa do repositorio digital antigravity"
  git push origin main
  ```

## 2. Variáveis de Ambiente no Provedor de Deploy
- Configurar todas as variáveis de ambiente necessárias diretamente no painel do provedor de hospedagem (Vercel, Cloudflare Pages ou Netlify), incluindo segredos de banco e IA.

# CRITÉRIOS DE SUCESSO
- Aplicação no ar e 100% responsiva.
- Controle de acesso RBAC e auditoria de ações plenamente funcionais.
- Dados e arquivos seguros e persistidos no Neon com RLS ativo.
- Zero exposição de chaves ou dados sensíveis.
