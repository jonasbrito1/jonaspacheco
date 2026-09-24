const nodemailer = require('nodemailer');

// SMTP configurado no .env da VPS. Sem SMTP_USER, nada e enviado e o erro sobe
// para quem chamou decidir o que mostrar.
function transporter() {
  if (!process.env.SMTP_USER) return null;
  const port = Number(process.env.SMTP_PORT || 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail({ to, subject, html }) {
  const t = transporter();
  if (!t) throw new Error('SMTP não configurado');
  await t.sendMail({ from: `"Hub · Jonas Pacheco" <${process.env.SMTP_USER}>`, to, subject, html });
}

function resetEmail(link) {
  return `<!DOCTYPE html><html><body style="margin:0;background:#020c1b;font-family:Segoe UI,Arial,sans-serif;color:#EEF2FF">
  <div style="max-width:480px;margin:0 auto;padding:32px 24px">
    <p style="font-weight:700;font-size:18px;margin:0 0 16px">&lt;hub /&gt; Jonas Pacheco</p>
    <p style="color:#8BAFC8;line-height:1.6">Recebemos um pedido para redefinir a senha do hub. O link vale por 60 minutos e pode ser usado uma vez.</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#1E6FD9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Redefinir senha</a></p>
    <p style="color:#4A6B87;font-size:13px;line-height:1.6">Se não foi você, ignore este e-mail. A senha atual continua valendo.</p>
  </div></body></html>`;
}

module.exports = { sendMail, resetEmail };
