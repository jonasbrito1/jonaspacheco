const nodemailer = require('nodemailer');

function getTransporter() {
  if (!process.env.SMTP_USER) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, html }) {
  const transporter = getTransporter();
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({
      from: `"Suporte | Jonas Pacheco" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mailer]', err.message);
  }
}

function baseTemplate(content) {
  const portalUrl = process.env.PORTAL_URL || 'https://suporte.jonaspacheco.cloud';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px">
  <div style="background:#0f1117;padding:20px 24px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:12px">
    <div>
      <h2 style="color:#00d4ff;margin:0">&lt;hub /&gt;</h2>
      <p style="color:#64748b;margin:4px 0 0;font-size:13px">${portalUrl.replace('https://','')} — Suporte Técnico</p>
    </div>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">${content}</div>
  <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px">Jonas Pacheco · jonaspacheco.cloud</p>
</body></html>`;
}

// ─── Notificações internas (para Jonas) ───────────────────────────────────────

async function notifyNewTicket(ticket) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const html = baseTemplate(`
    <h3 style="margin-top:0;color:#0f1117">🎫 Novo Ticket #${ticket.id}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Título</td><td><strong>${ticket.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Cliente</td><td>${ticket.client_name || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Email</td><td>${ticket.client_email || '—'}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Categoria</td><td>${ticket.category || 'suporte'}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Urgência</td><td>${ticket.urgency || 'media'}</td></tr>
    </table>
    ${ticket.description ? `<div style="margin-top:16px;padding:14px;background:#f8fafc;border-left:3px solid #00d4ff;border-radius:4px;font-size:14px;white-space:pre-wrap">${ticket.description}</div>` : ''}
    <p style="margin-top:20px"><a href="https://hub.jonaspacheco.cloud/tickets" style="background:#00d4ff;color:#0f1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Ver no Hub</a></p>
  `);
  await sendMail({ to, subject: `[Hub] Novo ticket #${ticket.id}: ${ticket.title}`, html });
}

// Notifica Jonas quando o cliente (portal) responde no ticket
async function sendClientReplyToAdmin(ticket, message, attachmentName) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  const attachmentNote = attachmentName
    ? `<p style="font-size:13px;color:#64748b;margin-top:8px">📎 Anexo: <strong>${attachmentName}</strong></p>`
    : '';
  const html = baseTemplate(`
    <h3 style="margin-top:0;color:#0f1117">💬 Cliente respondeu — Ticket #${ticket.id}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Ticket</td><td><strong>${ticket.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Cliente</td><td>${ticket.client_name || '—'} (${ticket.client_email || '—'})</td></tr>
    </table>
    <div style="margin:16px 0;padding:14px;background:#f8fafc;border-left:3px solid #f59e0b;border-radius:4px;font-size:14px;white-space:pre-wrap">${message}</div>
    ${attachmentNote}
    <p style="margin-top:20px"><a href="https://hub.jonaspacheco.cloud/tickets" style="background:#00d4ff;color:#0f1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Responder no Hub</a></p>
  `);
  await sendMail({ to, subject: `[Hub] Cliente respondeu Ticket #${ticket.id}: ${ticket.title}`, html });
}

// ─── Notificações para o cliente ──────────────────────────────────────────────

// Confirmação ao abrir ticket pelo portal
async function notifyPortalConfirmation(ticket) {
  if (!ticket.client_email) return;
  const portalUrl = process.env.PORTAL_URL || 'https://suporte.jonaspacheco.cloud';
  const trackUrl = `${portalUrl}/acompanhar/${ticket.ticket_token}`;
  const html = baseTemplate(`
    <h3 style="margin-top:0;color:#0f1117">✅ Chamado #${ticket.id} aberto com sucesso</h3>
    <p style="color:#64748b;font-size:14px">Olá <strong>${ticket.client_name}</strong>! Recebemos sua solicitação e nossa equipe irá analisá-la em breve.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Chamado</td><td><strong>#${ticket.id} — ${ticket.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Categoria</td><td>${ticket.category || 'suporte'}</td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Status</td><td><span style="color:#00d4ff;font-weight:600">Aberto</span></td></tr>
    </table>
    <p style="font-size:14px">Acompanhe o andamento pelo link abaixo:</p>
    <p style="margin-top:16px">
      <a href="${trackUrl}" style="background:#00d4ff;color:#0f1117;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block">
        Acompanhar meu chamado
      </a>
    </p>
    <p style="font-size:12px;color:#94a3b8;margin-top:20px">Ou acesse: <a href="${trackUrl}" style="color:#00d4ff">${trackUrl}</a></p>
    <p style="font-size:13px;color:#64748b;margin-top:16px">Você também pode criar uma conta no portal para gerenciar todos seus chamados:<br>
      <a href="${portalUrl}/cadastro" style="color:#00d4ff">${portalUrl}/cadastro</a>
    </p>
  `);
  await sendMail({ to: ticket.client_email, subject: `Chamado #${ticket.id} aberto: ${ticket.title}`, html });
}

// Resposta da equipe ao cliente (Jonas respondeu)
async function notifyClientReply(ticket, message, attachmentName) {
  const notifyEmail = process.env.NOTIFY_EMAIL;
  const clientEmail = ticket.client_email;
  const portalUrl = process.env.PORTAL_URL || 'https://suporte.jonaspacheco.cloud';
  const trackUrl = `${portalUrl}/acompanhar/${ticket.ticket_token}`;

  const attachmentNote = attachmentName
    ? `<p style="font-size:13px;color:#64748b;margin-top:8px">📎 Anexo: <strong>${attachmentName}</strong></p>`
    : '';

  if (clientEmail) {
    const html = baseTemplate(`
      <h3 style="margin-top:0;color:#0f1117">💬 Resposta ao seu chamado #${ticket.id}</h3>
      <p style="color:#64748b;font-size:14px">Olá${ticket.client_name ? ', <strong>' + ticket.client_name + '</strong>' : ''}! Sua solicitação recebeu uma resposta:</p>
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border-left:3px solid #00d4ff;border-radius:4px;font-size:14px;white-space:pre-wrap">${message}</div>
      ${attachmentNote}
      <p style="margin-top:16px">
        <a href="${trackUrl}" style="background:#00d4ff;color:#0f1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Ver chamado completo</a>
      </p>
      <p style="font-size:12px;color:#94a3b8;margin-top:12px">Para responder, acesse o link acima ou crie uma conta em <a href="${portalUrl}" style="color:#00d4ff">${portalUrl}</a>.</p>
    `);
    await sendMail({ to: clientEmail, subject: `Re: Chamado #${ticket.id} — ${ticket.title}`, html });
  }

  if (notifyEmail) {
    const html = baseTemplate(`
      <h3 style="margin-top:0;color:#0f1117">💬 Resposta enviada — Ticket #${ticket.id}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b;width:120px">Ticket</td><td><strong>${ticket.title}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Cliente</td><td>${ticket.client_name || '—'} ${clientEmail ? `(${clientEmail})` : ''}</td></tr>
      </table>
      <div style="margin:16px 0;padding:14px;background:#f8fafc;border-left:3px solid #00d4ff;border-radius:4px;font-size:14px;white-space:pre-wrap">${message}</div>
      ${attachmentNote}
      <p style="margin-top:20px"><a href="https://hub.jonaspacheco.cloud/tickets" style="background:#00d4ff;color:#0f1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Ver no Hub</a></p>
    `);
    await sendMail({ to: notifyEmail, subject: `[Hub] Re: Ticket #${ticket.id} — ${ticket.title}`, html });
  }
}

async function notifyClientStatus(ticket, newStatus) {
  const labels = { resolvido: 'Resolvido ✅', fechado: 'Fechado 🔒' };
  const label = labels[newStatus];
  if (!label) return;
  const portalUrl = process.env.PORTAL_URL || 'https://suporte.jonaspacheco.cloud';
  const trackUrl = `${portalUrl}/acompanhar/${ticket.ticket_token}`;

  const content = `
    <h3 style="margin-top:0;color:#0f1117">Chamado #${ticket.id} — ${label}</h3>
    <p style="color:#64748b;font-size:14px">Olá${ticket.client_name ? ', <strong>' + ticket.client_name + '</strong>' : ''}! Seu chamado foi atualizado:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Chamado</td><td><strong>${ticket.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Novo status</td><td><strong style="color:${newStatus === 'resolvido' ? '#10b981' : '#475569'}">${label}</strong></td></tr>
    </table>
    <p style="margin-top:16px"><a href="${trackUrl}" style="background:#00d4ff;color:#0f1117;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">Ver chamado</a></p>
    <p style="font-size:13px;color:#64748b;margin-top:16px">Se precisar de mais ajuda, abra um novo chamado em <a href="${portalUrl}" style="color:#00d4ff">${portalUrl}</a>.</p>
  `;

  if (ticket.client_email) {
    await sendMail({ to: ticket.client_email, subject: `Chamado #${ticket.id} ${label}: ${ticket.title}`, html: baseTemplate(content) });
  }
  if (process.env.NOTIFY_EMAIL) {
    await sendMail({ to: process.env.NOTIFY_EMAIL, subject: `[Hub] Ticket #${ticket.id} ${label}: ${ticket.title}`, html: baseTemplate(content) });
  }
}

module.exports = {
  notifyNewTicket,
  notifyClientReply,
  notifyClientStatus,
  notifyPortalConfirmation,
  sendClientReplyToAdmin,
};
