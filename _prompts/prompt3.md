# Prompt 3 — Dashboard principal e Visão Geral do Acervo

Agora vamos criar o dashboard principal do **Scalasystem - Acervo Digital da RNSMM**. Essa é a tela inicial apresentada após o login, adaptada conforme o perfil do usuário logado.

## Layout
- Menu lateral fixo (Sidebar) com as opções:
  - Dashboard
  - Acervo Digital
  - Categorias / Pastas
  - Lixeira (Soft Delete)
  - Auditoria & Relatórios (visível apenas para Administradores)
  - Usuários (visível apenas para Administradores)
- Cabeçalho superior com barra de busca rápida, informações do usuário logado, badge com o seu perfil (*Admin*, *Editor*, *Leitor*) e botão de logout.
- Área principal com métricas e resumos dinâmicos.

## Cards e Métricas Principais (Dashboard)

### Card 1 — Total de Arquivos no Acervo
- Exibe o número total de arquivos disponíveis acessíveis pelo usuário logado (e volume total em GB/MB para Admin).

### Card 2 — Downloads e Acessos Recentes
- Exibe o volume de downloads/visualizações registrados na semana atual.

### Card 3 — Arquivos Mais Acessados / Populares
- Ranking dos documentos com maior número de downloads e visualizações no acervo.
- Cada documento da lista deve ser clicável, abrindo a pré-visualização ou detalhes do arquivo.

### Card 4 — Atividades e Logs Recentes (Para Admins / Editores)
- Feed de atividades recentes: "Usuário X visualizou o documento Y", "Usuário Z fez upload da versão 2.0 do documento W" com timestamp.

## Regras importantes
- Todos os dados devem ser carregados do Neon em tempo real.
- Aplicar filtros de permissões rigorosos: leitores só visualizam métricas e itens aos quais possuem acesso explícito.
- Se não houver atividades recentes, exibir mensagem informativa: "Nenhuma atividade recente registrada".

## Design
- Tema elegante alinhado à identidade dos Scalabrinianos (cor principal #013375, branco #eef5fe; preto #010101; cores secundárias #910113; #681726; #F49C0E; #03889C; #2F6746; #FF8B00; #57A0FF)
- Fonte padrão: Montserrat
- Logo: D:\Lucas\Scalasystem\imgs\logo-horizontal-secundario.png, abaixo escrito Scalasystem - Acervo Digital da RNSMM
- Seguir o padrão visual moderno e corporativo da Antigravity.
- Cards informativos com gráficos leves (ex: Lucide Icons, Shadcn/UI cards).
- Menu lateral fixo com a marca "Scalasystem - Acervo Digital da RNSMM" e navegação responsiva.
