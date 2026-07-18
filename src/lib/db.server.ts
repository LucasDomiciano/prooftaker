import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "./password.server";
import type { CollectLink, Project, Testimonial, User } from "./types";

export type Store = {
  users: User[];
  projects: Project[];
  testimonials: Testimonial[];
  collectLinks?: CollectLink[];
};

const DATA_DIR = join(process.cwd(), ".data");
const STORE_PATH = join(DATA_DIR, "store.json");

let memory: Store | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emptyStore(): Store {
  return { users: [], projects: [], testimonials: [] };
}

async function seedStore(): Promise<Store> {
  const ownerId = "u_ana";
  const passwordHash = await hashPassword("demo1234");

  const users: User[] = [
    {
      id: ownerId,
      email: "ana@estudioana.com.br",
      passwordHash,
      name: "Ana Souza",
      company: "Estúdio Ana Design",
      avatarUrl: "",
      plan: "Free",
      notifyNew: true,
      notifyWeekly: true,
      notifyProduct: false,
      createdAt: "2026-01-10T12:00:00.000Z",
    },
  ];

  const projects: Project[] = [
    {
      id: "p1",
      ownerId,
      name: "Estúdio Ana Design",
      slug: "ana-design",
      description: "Depoimentos dos clientes de branding e identidade visual.",
      color: "oklch(0.55 0.13 178)",
      createdAt: "2026-05-10",
    },
    {
      id: "p2",
      ownerId,
      name: "Curso Freelancer Pro",
      slug: "freelancer-pro",
      description: "Alunos do curso online — turmas 2025 e 2026.",
      color: "oklch(0.42 0.13 235)",
      createdAt: "2026-02-01",
    },
    {
      id: "p3",
      ownerId,
      name: "Consultoria E-commerce",
      slug: "ecom-consultoria",
      description: "Clientes de auditoria e otimização de lojas Shopify.",
      color: "oklch(0.65 0.16 155)",
      createdAt: "2025-11-22",
    },
  ];

  const testimonials: Testimonial[] = [
    {
      id: "t1",
      projectId: "p1",
      name: "Mariana Ribeiro",
      role: "Sócia-fundadora",
      company: "Café da Vila",
      text: "A Ana entregou uma identidade que representa exatamente o que a gente queria transmitir. Depois do rebranding, nossas vendas online cresceram 40% em três meses.",
      rating: 5,
      hasVideo: true,
      status: "aprovado",
      tags: ["Alta Conversão", "E-commerce"],
      createdAt: "2026-07-01",
    },
    {
      id: "t2",
      projectId: "p1",
      name: "Rafael Lima",
      role: "CEO",
      company: "Tech Nordeste",
      text: "Processo impecável, comunicação clara e um resultado final que superou nossas expectativas. Recomendo de olhos fechados.",
      rating: 5,
      hasVideo: false,
      status: "aprovado",
      tags: ["B2B"],
      createdAt: "2026-06-15",
    },
    {
      id: "t3",
      projectId: "p2",
      name: "Juliana Alves",
      role: "Designer Freelancer",
      company: "Freelance",
      text: "O curso mudou minha forma de precificar. Em 60 dias já tinha triplicado meu ticket médio. Vale cada centavo.",
      rating: 5,
      hasVideo: true,
      status: "aprovado",
      tags: ["Depoimento Aluno"],
      createdAt: "2026-06-10",
    },
    {
      id: "t4",
      projectId: "p2",
      name: "Pedro Henrique Costa",
      role: "Dev Frontend",
      company: "Independente",
      text: "Conteúdo direto ao ponto, sem enrolação. As planilhas e contratos prontos já pagaram o curso.",
      rating: 4,
      hasVideo: false,
      status: "pendente",
      tags: [],
      createdAt: "2026-07-14",
    },
    {
      id: "t5",
      projectId: "p3",
      name: "Camila Ferreira",
      role: "Diretora",
      company: "Loja Bem-me-quer",
      text: "A auditoria identificou 12 pontos que estavam matando nossa conversão. Aplicamos as mudanças e vimos aumento de 27% no checkout.",
      rating: 5,
      hasVideo: false,
      status: "aprovado",
      tags: ["E-commerce", "Alta Conversão"],
      createdAt: "2026-05-30",
    },
    {
      id: "t6",
      projectId: "p1",
      name: "Bruno Martins",
      role: "Fundador",
      company: "Barbearia Reis",
      text: "A logo nova deu uma cara profissional pra barbearia. Cliente comenta toda semana. Trabalho de primeira.",
      rating: 5,
      hasVideo: false,
      status: "aprovado",
      tags: [],
      createdAt: "2026-04-18",
    },
    {
      id: "t7",
      projectId: "p2",
      name: "Larissa Nogueira",
      role: "Ilustradora",
      company: "Freelance",
      text: "Assisti todo o módulo de propostas e negociação em uma semana. Fechei três contratos usando os templates.",
      rating: 5,
      hasVideo: true,
      status: "pendente",
      tags: [],
      createdAt: "2026-07-15",
    },
    {
      id: "t8",
      projectId: "p1",
      name: "Fernanda Duarte",
      role: "Marketing",
      company: "Instituto Verde",
      text: "Trabalho estratégico, não só bonito. A Ana entendeu nosso público antes mesmo da gente.",
      rating: 5,
      hasVideo: false,
      status: "aprovado",
      tags: ["ONG"],
      createdAt: "2026-03-05",
    },
  ];

  return { users, projects, testimonials };
}

async function loadStore(): Promise<Store> {
  if (memory) return memory;

  try {
    if (existsSync(STORE_PATH)) {
      memory = JSON.parse(readFileSync(STORE_PATH, "utf8")) as Store;
      return memory;
    }
  } catch (error) {
    console.error("Falha ao ler store local:", error);
  }

  memory = await seedStore();
  await persistStore(memory);
  return memory;
}

function persistStore(store: Store) {
  writeQueue = writeQueue.then(() => {
    try {
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
    } catch (error) {
      console.error("Falha ao gravar store local:", error);
    }
  });
  return writeQueue;
}

export async function readDb(): Promise<Store> {
  const store = await loadStore();
  return {
    users: [...store.users],
    projects: [...store.projects],
    testimonials: [...store.testimonials],
  };
}

export async function updateDb(mutator: (store: Store) => void | Promise<void>) {
  const store = await loadStore();
  await mutator(store);
  memory = store;
  await persistStore(store);
  return store;
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function toPublicUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    avatarUrl: user.avatarUrl,
    plan: user.plan,
    notifyNew: user.notifyNew,
    notifyWeekly: user.notifyWeekly,
    notifyProduct: user.notifyProduct,
    slackWebhookUrl: user.slackWebhookUrl || "",
    outboundWebhooks: user.outboundWebhooks || [],
  };
}
