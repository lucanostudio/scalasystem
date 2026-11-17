import { neon } from '@neondatabase/serverless';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { announcementId, title, contentHtml, authorId } = await req.json();

    if (!announcementId || !title) {
      return new Response(JSON.stringify({ error: 'Dados obrigatórios ausentes.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const databaseUrl = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
    if (!databaseUrl) {
      return new Response(JSON.stringify({ error: 'DATABASE_URL não configurada.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sql = neon(databaseUrl);

    // Consultar todos os usuários ativos do perfil COLABORADOR
    const colaboradores = await sql`
      SELECT id, nome, email
      FROM usuarios
      WHERE role = 'colaborador' AND ativo = true AND email IS NOT NULL;
    `;

    const emails = colaboradores.map((c: any) => c.email).filter(Boolean);
    const subject = `[Novo Comunicado] ${title}`;
    const plainSummary = (contentHtml || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 280);

    let dispatchStatus = 'simulado_sem_provedor';

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || 'comunicados@scalasystem.com.br';
    const appUrl = process.env.APP_URL || 'https://scalasystem.vercel.app/comunicados';

    if (resendKey && emails.length > 0) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: emails,
          subject,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;">
              <h2 style="color: #013375;">${title}</h2>
              <p>${plainSummary}${plainSummary.length >= 280 ? '...' : ''}</p>
              <p style="margin-top: 24px;">
                <a href="${appUrl}" style="background: #013375; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                  Acessar Comunicado Completo
                </a>
              </p>
            </div>
          `,
        }),
      });

      dispatchStatus = res.ok ? 'enviado' : `erro_provedor_${res.status}`;
    }

    // Registrar em logs_auditoria para rastreabilidade do Administrador
    if (authorId) {
      await sql`
        INSERT INTO logs_auditoria (usuario_id, acao, user_agent)
        VALUES (
          ${authorId}::uuid,
          ${`comunicado_email:${dispatchStatus}:${emails.length}_destinatarios`},
          'api/notificar-comunicado'
        );
      `;
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipientsCount: emails.length,
        status: dispatchStatus,
        subject,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Erro em /api/notificar-comunicado:', err);
    return new Response(JSON.stringify({ error: err?.message || 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

