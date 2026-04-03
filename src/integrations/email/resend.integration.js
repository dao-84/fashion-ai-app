const { Resend } = require('resend');

function createResendIntegration({ apiKey }) {
  const resend = apiKey ? new Resend(apiKey) : null;

  return {
    isConfigured: () => !!resend,

    async sendPasswordResetEmail({ to, resetUrl }) {
      if (!resend) throw new Error('Resend non configurato');
      await resend.emails.send({
        from: 'Shotless.ai <noreply@shotless.ai>',
        to,
        subject: 'Reimposta la tua password — Shotless.ai',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0c;color:#f4f0e6;border-radius:16px;">
            <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#d4af37;margin-bottom:24px;">Shotless.ai</div>
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">Reimposta la password</h1>
            <p style="color:rgba(255,255,255,.65);line-height:1.6;margin:0 0 28px;">
              Hai richiesto di reimpostare la password del tuo account. Clicca il pulsante qui sotto per scegliere una nuova password. Il link scade tra 1 ora.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f6dd8a);color:#141414;font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;padding:14px 32px;border-radius:999px;text-decoration:none;">
              Reimposta password
            </a>
            <p style="color:rgba(255,255,255,.35);font-size:12px;margin-top:28px;line-height:1.6;">
              Se non hai richiesto il reset della password, ignora questa email. Il tuo account è al sicuro.
            </p>
          </div>
        `,
      });
    },

    async sendVerificationEmail({ to, verificationUrl }) {
      if (!resend) throw new Error('Resend non configurato');
      await resend.emails.send({
        from: 'Shotless.ai <noreply@shotless.ai>',
        to,
        subject: 'Conferma il tuo account Shotless.ai',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0a0a0c;color:#f4f0e6;border-radius:16px;">
            <div style="font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:#d4af37;margin-bottom:24px;">Shotless.ai</div>
            <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">Conferma il tuo account</h1>
            <p style="color:rgba(255,255,255,.65);line-height:1.6;margin:0 0 28px;">
              Sei a un passo dall'iniziare. Clicca il pulsante qui sotto per confermare la tua email e attivare il tuo account.
            </p>
            <a href="${verificationUrl}" style="display:inline-block;background:linear-gradient(135deg,#d4af37,#f6dd8a);color:#141414;font-weight:700;font-size:14px;letter-spacing:.08em;text-transform:uppercase;padding:14px 32px;border-radius:999px;text-decoration:none;">
              Conferma account
            </a>
            <p style="color:rgba(255,255,255,.35);font-size:12px;margin-top:28px;line-height:1.6;">
              Il link scade tra 24 ore. Se non hai creato un account su Shotless.ai, ignora questa email.
            </p>
          </div>
        `,
      });
    },
  };
}

module.exports = { createResendIntegration };
