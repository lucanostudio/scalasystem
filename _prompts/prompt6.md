Você é um desenvolvedor full-stack sênior especializado em React, Neon, PostgreSQL e integração de LLMs. Sua tarefa é implementar o módulo de **Indexação Inteligente, Extração Automática de Metadados e Busca Semântica via IA** para o **Repositório Digital de Arquivos da Antigravity**.

# STACK
- React (Vite) + TypeScript
- Neon (PostgreSQL com suporte a pgvector ou full-text search)
- Google Gen AI SDK (`@google/generative-ai`) -> Modelo: `gemini-3.8-flash` ou superior
- Storage de Arquivos Seguro / S3-compatible

# OBJETIVO
Permitir que, ao fazer upload de um documento (ou ao acionar a ação sob demanda), uma função serverless com IA (Gemini) analise o arquivo (PDF, Word, Texto ou Imagem), gere um resumo executivo em linguagem natural, sugira automaticamente tags relevantes, identifique o departamento, sugira status e gere embeddings/palavras-chave para a busca semântica e inteligente do acervo.

# SERVERLESS FUNCTION: `/api/indexar-documento`
Crie a função server-side com máxima segurança, tipagem e tratamento de erros.

### Responsabilidades Técnicas:
1. **Segurança:** A `GEMINI_API_KEY` deve ser consumida estritamente via variável de ambiente no backend. Nunca vaze chaves para o cliente.
2. **Uso do SDK:** Utilize a versão recente do SDK oficial da Google (`@google/generative-ai`).
3. **Structured Outputs (Crucial):** Garanta 100% de precisão configurando `responseMimeType: "application/json"` e esquema estrito (`responseSchema`).
4. **Prompt Interno da IA:** O prompt enviado ao Gemini deve ser o seguinte:

```
Você é um curador e arquivista especialista em governança e classificação de dados corporativos da Antigravity.
Analise o conteúdo do documento abaixo e extraia seus metadados essenciais, resumo estruturado e palavras-chave.

Conteúdo/Texto extraído do documento:
{conteudo_documento}

Regras Críticas de Execução:
- Responda APENAS e estritamente o objeto JSON solicitado, sem blocos markdown adicionais.
- O resumo deve ser conciso (máximo 3 a 4 frases) destacando o objetivo principal do arquivo.
- Gere de 3 a 8 tags pertinentes em português.
- Infira o departamento provável (ex.: Engenharia, Jurídico, Financeiro, Recursos Humanos, Operações, P&D).
- Sugira o status apropriado (Rascunho, Aprovado, Arquivado).

O formato do JSON retornado deve seguir exatamente esta estrutura:
{
  "resumo": "Texto resumido sobre o conteúdo do documento...",
  "departamento_sugerido": "Engenharia",
  "tags_sugeridas": ["relatório", "planejamento", "segurança", "arquitetura"],
  "ano_publicacao_estimado": 2026,
  "status_sugerido": "Aprovado",
  "confidencial_provavel": false
}
```

# FLUXO DO FRONTEND & COMPORTAMENTO DA INTERFACE
1. **Gatilho de Indexação com IA:**
   - No modal de Upload ou na visualização de um arquivo sem metadados preenchidos, exibir o botão **"✨ Auto-preencher com IA"** / **"✨ Indexar Documento com IA"**.
2. **Feedback Visual:**
   - Exibir estado de carregamento animado com mensagens dinâmicas: *"Analisando conteúdo...", "IA extraindo metadados...", "Categorizando documento..."*.
3. **Preenchimento Automático dos Campos:**
   - Ao receber a resposta JSON, preencher automaticamente os campos de Descrição/Resumo, Departamento, Ano e Tags no formulário.
4. **Validação Humana:**
   - O usuário pode revisar, adicionar ou remover qualquer tag ou sugestão antes de salvar as alterações no banco de dados Neon.
5. **Persistência:**
   - Ao salvar, os dados são persistidos na tabela `arquivos` e registrados no histórico de auditoria.

# TRATAMENTO DE ERROS E RESILIÊNCIA
- Se a chamada para a API do Gemini expirar ou falhar, exibir um Toast amigável: *"Não foi possível indexar o documento com IA no momento. Deseja tentar novamente ou preencher manualmente?"*.
- Use bloco `try/catch` ao parsear o retorno da IA para impedir quebras de execução.
- Permita sempre a continuidade do upload e edição manual caso o serviço de IA esteja indisponível.

# NÃO FAZER
- Não execute chamadas diretas com a API Key no frontend.
- Não substitua metadados já confirmados pelo usuário sem o seu consentimento.
- Não permita que falhas de IA impeçam o salvamento básico do arquivo.

# ENTREGÁVEIS DESEJADOS
1. Código completo da Serverless Function (`/api/indexar-documento`) configurada com o Google Gen AI SDK.
2. Componente React integrado ao formulário de upload/detalhes com estados de loading, feedback de erro e preview das sugestões geradas.
