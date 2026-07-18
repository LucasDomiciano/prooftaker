import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FALLBACK_TEMPLATES = {
  whatsapp: (projectName: string, link: string, tone: string) => {
    if (tone === "formal") {
      return `Olá! Gostaríamos muito de ouvir sua opinião sobre ${projectName}. Leva menos de 2 minutos e nos ajuda a melhorar continuamente: ${link}`;
    }
    if (tone === "curto") {
      return `Oi! Pode deixar um depoimento rápido sobre ${projectName}? ${link} 🙏`;
    }
    return `Oi! Adoraria seu depoimento sobre nosso trabalho em ${projectName}. Leva 2 min e faz toda a diferença: ${link}`;
  },
  email: (projectName: string, link: string, tone: string) => {
    const subject =
      tone === "formal"
        ? `Sua opinião sobre ${projectName}`
        : `Pode nos contar como foi trabalhar conosco?`;
    const body =
      tone === "formal"
        ? `Olá,\n\nEsperamos que esteja bem. Gostaríamos de convidá-lo(a) a compartilhar um breve depoimento sobre sua experiência com ${projectName}.\n\nÉ rápido (cerca de 2 minutos) e sua avaliação é muito importante para nós:\n${link}\n\nAgradecemos desde já.\n`
        : `Oi!\n\nPoderia deixar um depoimento rapidinho sobre ${projectName}? Sua opinião ajuda outras pessoas a confiar no nosso trabalho.\n\nLink (2 min): ${link}\n\nObrigado! 💛\n`;
    return { subject, body };
  },
};

export const generateReviewRequest = createServerFn({ method: "POST" })
  .validator(
    z.object({
      projectName: z.string().min(1),
      collectUrl: z.string().url().or(z.string().min(5)),
      channel: z.enum(["whatsapp", "email"]),
      tone: z.enum(["amigavel", "formal", "curto"]).default("amigavel"),
      customerName: z.string().optional(),
      context: z.string().max(400).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const link = data.collectUrl;
    const nameHint = data.customerName
      ? `O cliente se chama ${data.customerName}.`
      : "";
    const contextHint = data.context
      ? `Contexto adicional: ${data.context}`
      : "";

    if (!apiKey) {
      if (data.channel === "whatsapp") {
        let text = FALLBACK_TEMPLATES.whatsapp(
          data.projectName,
          link,
          data.tone,
        );
        if (data.customerName) {
          text = text.replace(/^Oi!/, `Oi, ${data.customerName}!`).replace(
            /^Olá!/,
            `Olá, ${data.customerName}!`,
          );
        }
        return {
          ok: true as const,
          channel: "whatsapp" as const,
          message: text,
          mode: "template" as const,
        };
      }
      const email = FALLBACK_TEMPLATES.email(
        data.projectName,
        link,
        data.tone,
      );
      return {
        ok: true as const,
        channel: "email" as const,
        subject: email.subject,
        message: email.body,
        mode: "template" as const,
      };
    }

    const system = `Você escreve pedidos de depoimento/avaliação em português do Brasil para o produto ProofTaker.
Seja natural, sem exageros, sem emojis em excesso (no máximo 1). Inclua o link exatamente como fornecido.
Responda só com JSON válido.`;

    const userPrompt =
      data.channel === "whatsapp"
        ? `Gere uma mensagem de WhatsApp (tom: ${data.tone}) pedindo depoimento sobre "${data.projectName}".
Link: ${link}
${nameHint}
${contextHint}
JSON: {"message":"..."}`
        : `Gere um e-mail (tom: ${data.tone}) pedindo depoimento sobre "${data.projectName}".
Link: ${link}
${nameHint}
${contextHint}
JSON: {"subject":"...","message":"..."}`;

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("[ProofTaker AI]", err);
        return { ok: false as const, error: "Falha ao gerar com IA. Tente de novo." };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(content) as {
        message?: string;
        subject?: string;
      };

      if (data.channel === "whatsapp") {
        return {
          ok: true as const,
          channel: "whatsapp" as const,
          message: parsed.message || FALLBACK_TEMPLATES.whatsapp(
            data.projectName,
            link,
            data.tone,
          ),
          mode: "ai" as const,
        };
      }

      const fallback = FALLBACK_TEMPLATES.email(
        data.projectName,
        link,
        data.tone,
      );
      return {
        ok: true as const,
        channel: "email" as const,
        subject: parsed.subject || fallback.subject,
        message: parsed.message || fallback.body,
        mode: "ai" as const,
      };
    } catch (e) {
      console.error("[ProofTaker AI]", e);
      return { ok: false as const, error: "Falha ao gerar com IA." };
    }
  });

/** Melhora gramática/clareza sem mudar o sentido. */
export async function improveTestimonialCopy(original: string): Promise<{
  improved: string;
  mode: "ai" | "local";
}> {
  const cleaned = original.trim().replace(/\s+/g, " ");
  const localPolish = (() => {
    let t = cleaned;
    if (t.length) t = t.charAt(0).toUpperCase() + t.slice(1);
    if (t.length && !/[.!?…]$/.test(t)) t = `${t}.`;
    return t;
  })();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { improved: localPolish, mode: "local" };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Você edita depoimentos de clientes em português do Brasil.
Regras obrigatórias:
- Corrija gramática, ortografia e pontuação
- Melhore clareza e fluidez
- Remova repetições
- Torne o texto um pouco mais persuasivo SEM inventar fatos, números, nomes ou resultados
- NUNCA altere o sentido nem adicione benefícios que não estejam no original
- Mantenha a voz em 1ª pessoa do cliente
- Responda só JSON: {"improved":"..."}`,
          },
          {
            role: "user",
            content: `Depoimento original:\n"""${cleaned}"""`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error("[ProofTaker AI improve]", await res.text());
      return { improved: localPolish, mode: "local" };
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as { improved?: string };
    const improved = (parsed.improved || "").trim();
    if (!improved || improved.length < 8) {
      return { improved: localPolish, mode: "local" };
    }
    return { improved, mode: "ai" };
  } catch (e) {
    console.error("[ProofTaker AI improve]", e);
    return { improved: localPolish, mode: "local" };
  }
}

export async function runImproveTestimonialById(id: string) {
  const { getUserFromSession } = await import("./auth.server");
  const user = await getUserFromSession();
  if (!user) return { ok: false as const, error: "Não autenticado." };

  const { isSupabaseEnabled, getSupabaseServerClient } = await import(
    "./supabase.server"
  );

  if (isSupabaseEnabled()) {
    const supabase = getSupabaseServerClient();
    const { data: row } = await supabase
      .from("testimonials")
      .select("id, project_id, text, text_original")
      .eq("id", id)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "Depoimento não encontrado." };

    const { data: project } = await supabase
      .from("projects")
      .select("owner_id")
      .eq("id", row.project_id)
      .maybeSingle();
    if (!project || project.owner_id !== user.id) {
      return { ok: false as const, error: "Sem permissão." };
    }

    const original = row.text_original || row.text;
    const { improved, mode } = await improveTestimonialCopy(original);
    const { error } = await supabase
      .from("testimonials")
      .update({ text_improved: improved })
      .eq("id", id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const, improved, mode };
  }

  const { readDb, updateDb } = await import("./db.server");
  const db = await readDb();
  const item = db.testimonials.find((t) => t.id === id);
  if (!item) return { ok: false as const, error: "Depoimento não encontrado." };
  const project = db.projects.find((p) => p.id === item.projectId);
  if (!project || project.ownerId !== user.id) {
    return { ok: false as const, error: "Sem permissão." };
  }

  const original = item.textOriginal || item.text;
  const { improved, mode } = await improveTestimonialCopy(original);
  await updateDb((store) => {
    const t = store.testimonials.find((x) => x.id === id);
    if (t) t.textImproved = improved;
  });
  return { ok: true as const, improved, mode };
}

export const improveTestimonialById = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => runImproveTestimonialById(data.id));
