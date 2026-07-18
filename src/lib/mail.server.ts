type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

/** Só loga em disco no dev local — na Vercel /var/task é read-only. */
async function appendMailLog(payload: MailPayload) {
  try {
    // Serverless (Vercel): não há FS gravável em process.cwd()
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      console.info(
        "[ProofTaker mail]",
        payload.subject,
        "→",
        payload.to,
        "\n",
        payload.text,
      );
      return;
    }

    const { appendFileSync, existsSync, mkdirSync } = await import("node:fs");
    const { join } = await import("node:path");
    const dir = join(process.cwd(), ".data");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(
      join(dir, "mail.log"),
      `\n[${new Date().toISOString()}] to=${payload.to} subject=${payload.subject}\n${payload.text}\n`,
      "utf8",
    );
  } catch (err) {
    console.info(
      "[ProofTaker mail] (log skip)",
      payload.subject,
      "→",
      payload.to,
      err,
    );
  }
}

export async function sendEmail(payload: MailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ProofTaker <onboarding@resend.dev>";

  if (!apiKey) {
    console.info("[ProofTaker mail]", payload.subject, "→", payload.to);
    await appendMailLog(payload);
    return { ok: true as const, mode: "log" as const };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[ProofTaker mail] Resend error:", body);
      await appendMailLog(payload);
      return { ok: false as const, error: "Falha ao enviar e-mail." };
    }

    return { ok: true as const, mode: "resend" as const };
  } catch (error) {
    console.error("[ProofTaker mail]", error);
    await appendMailLog(payload);
    return { ok: false as const, error: "Falha ao enviar e-mail." };
  }
}

export async function notifyOwnerNewTestimonial(input: {
  ownerEmail: string;
  ownerName: string;
  projectName: string;
  authorName: string;
  rating: number;
  notify: boolean;
}) {
  if (!input.notify) return;

  const subject = `Novo depoimento em ${input.projectName}`;
  const text = `Olá ${input.ownerName},\n\n${input.authorName} enviou um depoimento (${input.rating}★) para ${input.projectName}.\nAcesse o painel ProofTaker para aprovar ou recusar.\n`;
  const html = `
    <p>Olá <b>${input.ownerName}</b>,</p>
    <p><b>${input.authorName}</b> enviou um depoimento (${input.rating}★) para <b>${input.projectName}</b>.</p>
    <p>Acesse o painel ProofTaker para aprovar ou recusar.</p>
  `;

  return sendEmail({
    to: input.ownerEmail,
    subject,
    text,
    html,
  });
}

export async function notifyAuthorThanks(input: {
  authorEmail?: string;
  authorName: string;
  projectName: string;
}) {
  if (!input.authorEmail) return;
  const subject = `Obrigado pelo depoimento · ${input.projectName}`;
  const text = `Olá ${input.authorName},\n\nRecebemos seu depoimento para ${input.projectName}. Obrigado!\n`;
  const html = `<p>Olá <b>${input.authorName}</b>,</p><p>Recebemos seu depoimento para <b>${input.projectName}</b>. Obrigado!</p>`;
  return sendEmail({
    to: input.authorEmail,
    subject,
    text,
    html,
  });
}
