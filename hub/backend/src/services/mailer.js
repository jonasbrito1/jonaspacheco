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
      from: `"Hub | Jonas Pacheco" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mailer]', err.message);
  }
}

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;background:#f4f4f4;padding:20px">
  <div style="background:#0f1117;padding:20px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#00d4ff;margin:0">&lt;hub /&gt;</h2>
    <p style="color:#64748b;margin:4px 0 0;font-size:13px">jonaspacheco.cloud — Sistema de Tickets</p>
  </div>
  <div style="background:#fff;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e2e8f0">${content}</div>
</body></html>`;
}

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

async function notifyClientReply(ticket, message) {
  if (!ticket.client_email) return;
  const html = baseTemplate(`
    <h3 style="margin-top:0;color:#0f1117">💬 Resposta ao seu chamado #${ticket.id}</h3>
    <p style="color:#64748b;font-size:14px">Olá${ticket.client_name ? ', ' + ticket.client_name : ''}! Sua solicitação recebeu uma resposta:</p>
    <div style="margin:16px 0;padding:14px;background:#f8fafc;border-left:3px solid #00d4ff;border-radius:4px;font-size:14px;white-space:pre-wrap">${message}</div>
    <p style="font-size:13px;color:#64748b">Para mais informações, responda este email ou entre em contato via <a href="https://jonaspacheco.cloud">jonaspacheco.cloud</a>.</p>
  `);
  await sendMail({ to: ticket.client_email, subject: `Re: ${ticket.title} [Ticket #${ticket.id}]`, html });
}

async function notifyClientStatus(ticket, newStatus) {
  if (!ticket.client_email) return;
  const labels = { resolvido: 'Resolvido ✅', fechado: 'Fechado 🔒' };
  const label = labels[newStatus];
  if (!label) return;
  const html = baseTemplate(`
    <h3 style="margin-top:0;color:#0f1117">Chamado #${ticket.id} — ${label}</h3>
    <p style="color:#64748b;font-size:14px">Olá${ticket.client_name ? ', ' + ticket.client_name : ''}! Seu chamado foi atualizado:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <tr><td style="padding:6px 0;color:#64748b;width:120px">Chamado</td><td><strong>${ticket.title}</strong></td></tr>
      <tr><td style="padding:6px 0;color:#64748b">Novo status</td><td><strong style="color:${newStatus === 'resolvido' ? '#10b981' : '#475569'}">${label}</strong></td></tr>
    </table>
    <p style="font-size:13px;color:#64748b;margin-top:16px">Se precisar de mais ajuda, não hesite em entrar em contato.</p>
  `);
  await sendMail({ to: ticket.client_email, subject: `Chamado #${ticket.id} ${label}: ${ticket.title}`, html });
}

module.exports = { notifyNewTicket, notifyClientReply, notifyClientStatus };
