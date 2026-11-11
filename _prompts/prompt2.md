# Prompt 2 — Autenticação e Gestão de Usuários (RBAC)

Vamos criar a autenticação e o controle de acesso do **Scalasystem - Acervo Digital da RNSMM**. O sistema deve permitir autenticação corporativa segura e suporte a RBAC (Administrador, Editor e Leitor) utilizando Neon Auth.

## Tela de Login
- Campo de e-mail institucional
- Campo de senha
- Opção para autenticação em dois fatores (2FA / OTP se habilitado)
- Botão "Entrar"
- Link "Esqueci minha senha"

## Tela de Gestão de Usuários e Perfis (Restrita ao Administrador)
- Listagem de usuários com status (ativo/inativo), e-mail, nome e perfil (*Admin*, *Editor*, *Leitor*)
- Modal/Formulário para cadastrar novo usuário ou convidar membro
- Alteração de papéis (Role) e bloqueio/desbloqueio de acesso

## Regras importantes
- Após o cadastro/primeiro acesso, sincronizar o usuário com a tabela `usuarios` no Neon
- Armazenar o papel (`role`) na sessão do usuário para controle de permissões na interface e rotas
- Após o login bem-sucedido, redirecionar para o dashboard principal
- Se o login falhar, exibir mensagem de erro clara e amigável
- A senha deve ter no mínimo 6 caracteres, combinando números, letras e símbolos
- Manter a sessão ativa de forma segura com tokens renováveis
- Se já estiver autenticado e tentar acessar `/login`, redirecionar direto para o dashboard
- Proteger rotas por perfil: apenas administradores acessam configurações e relatórios de auditoria

## Stack
- React + Vite
- TypeScript
- Tailwind CSS
- Shadcn/UI
- Neon Auth (com suporte a RLS)

## Design
- Visual corporativo, moderno, limpo e seguro
- Tema elegante alinhado à identidade dos Scalabrinianos (cor principal #013375, branco #eef5fe; preto #010101; cores secundárias #910113; #681726; #F49C0E; #03889C; #2F6746; #FF8B00; #57A0FF)
- Fonte padrão: Montserrat
- Logo: D:\Lucas\Scalasystem\imgs\logo-horizontal-secundario.png, abaixo escrito Scalasystem - Acervo Digital da RNSMM