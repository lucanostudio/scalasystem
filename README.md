# Scalasystem — Acervo Digital da RNSMM

Repositório digital para governança, centralização, proteção e indexação inteligente do acervo de conhecimento da **Rede Scalabriniana de Missões com Migrantes (RNSMM)**.

---

## 🚀 Tecnologias

- **Frontend:** React 19, TypeScript, Vite 8
- **Estilização:** Tailwind CSS v4, Lucide Icons, Shadcn/UI Patterns
- **Tipografia:** Montserrat
- **Banco de Dados:** PostgreSQL Serverless via **Neon**
- **Segurança:** Row Level Security (RLS) e RBAC (*Admin*, *Editor*, *Leitor*)
- **Inteligência Artificial:** Google Gen AI SDK (`@google/generative-ai`) com modelo Gemini para extração de metadados

---

## 🔒 Proteção e Variáveis de Ambiente

O arquivo `.env` está protegido pelo `.gitignore` e **nunca** deve ser versionado no GitHub. 
Para deploys na **Vercel** ou em outros provedores, configure as seguintes variáveis diretamente no painel:

| Variável | Descrição |
|---|---|
| `VITE_DATABASE_URL` | String de conexão segura com o Neon PostgreSQL (com pooling e SSL) |
| `VITE_GEMINI_API_KEY` | Chave de API do Google Gemini para indexação inteligente |

Consulte o arquivo [`.env.example`](file:///d:/Lucas/Scalasystem/.env.example) para referência.

---

## 📦 Como Rodar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Executar em modo desenvolvimento
npm run dev

# 3. Gerar build de produção
npm run build
```

---

## 🌐 Deploy na Vercel

1. Crie um novo projeto na [Vercel](https://vercel.com).
2. Conecte este repositório do GitHub.
3. Em **Environment Variables**, adicione as variáveis documentadas acima.
4. Clique em **Deploy**.
