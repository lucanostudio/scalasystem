# Prompt 5 — Indexação Avançada, Busca Multi-filtro e Visualização com Watermarking

Agora vamos desenvolver a tela de **Busca Inteligente**, o mecanismo de **Filtros Avançados**, a **Pré-visualização de Documentos** e o **Histórico de Versões** com **Watermarking Dinâmico**.

## Layout e Funcionalidades

### 1. Barra e Painel de Filtros Avançados
- **Barra de Busca Textual (Full-Text Search):** Campo de busca rápida no topo que pesquisa no título, descrição, tags, autor e conteúdo indexado de arquivos (PDF e Word).
- **Filtros Laterais / Drawer de Refinamento:**
  - Filtro por Tipo de Mídia: Todos, PDF, Documentos (.docx), Imagens, Vídeos.
  - Filtro por Ano de Publicação: Sliders ou seleção de intervalo (ex.: 2020 - 2026).
  - Filtro por Departamento: Dropdown com os departamentos cadastrados.
  - Filtro por Categoria / Pasta.
  - Filtro por Status: Aprovado, Rascunho, Arquivado.
  - Filtro por Tags: Seleção múltipla de tags com contagem de ocorrências.
- Botão "Limpar Filtros" e indicador do total de resultados encontrados.

---

### 2. Modal de Detalhes e Pré-visualização do Documento
Ao clicar em qualquer arquivo da listagem ou dos resultados de busca, abrir a visualização detalhada contendo:
- **Área de Prévia Central:**
  - PDFs e DOCX: Visualizador embutido no navegador.
  - Imagens: Zoom e visualização em alta resolução.
  - Vídeos: Player HTML5 com controles nativos de reprodução.
- **Watermarking Dinâmico (Marca d'água):**
  - Para arquivos com a flag `is_confidencial = true` ou por política padrão do sistema, aplicar automaticamente uma marca d'água semitransparente na prévia e no PDF exportado/baixado contendo: `Confidencial - [Nome do Usuário Logado] - [CPF/E-mail] - [Data e Hora do Acesso]`.
- **Painel Lateral de Metadados:**
  - Metadados completos: Título, autor, departamento, ano, categoria, status e tags.
  - Botão de Download: Habilitado apenas se o usuário possuir a permissão `pode_baixar = true`.
  - Botão de Histórico de Versões.

---

### 3. Histórico de Versões (Versioning) e Lixeira (Soft Delete)
- **Histórico de Versões:**
  - Exibir a lista cronológica decrescente das versões do arquivo (v1.0, v1.1, v2.0).
  - Cada versão detalha: autor da versão, data do envio, notas de alteração e tamanho.
  - Botão "Subir Nova Versão" (Admin/Editor).
  - Opção de "Restaurar Versão Anterior" (apenas Admin).
- **Soft Delete e Lixeira:**
  - Ação de exclusão move o arquivo para a lixeira (`is_deleted = true`, `deleted_at = now()`).
  - Painel de Lixeira acessível para Administradores, permitindo restaurar o documento ou purgar definitivamente do storage e do banco.

---

### 4. Auditoria Automática
- Toda vez que a pré-visualização for aberta, registrar automaticamente um evento em `logs_auditoria` com `acao = 'visualizacao'`.
- Ao clicar em "Download", registrar um evento com `acao = 'download'`.

## Regras importantes
- Todas as consultas e alterações devem refletir em tempo real no Neon.
- Se o usuário não tiver permissão para baixar, o botão de download deve ficar desabilitado ou oculto, mantendo apenas a leitura caso autorizada.
