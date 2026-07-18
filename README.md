# ProofTaker

Micro-SaaS de coleta e exibição de depoimentos focado no mercado brasileiro.

## Stack

- **TanStack Start** (React 19 + Vite)
- **Supabase** (Auth, Postgres, Storage) via Lovable Cloud — com fallback local
- **Stripe** (checkout Pro, opcional)
- **Tailwind CSS v4** + shadcn/ui

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:8080`.

### Supabase (Lovable Cloud)

1. Cloud → Enable Cloud  
2. Preencha `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`  
3. Aplique `supabase/migrations/001_initial.sql`  
4. Auth → Google: ative o provider e adicione redirect `https://SEU_DOMINIO/auth/callback` (e `http://localhost:8080/auth/callback` no dev)  
5. Auth → URL Configuration: Site URL + Redirect URLs acima  

### Stripe (opcional)

1. Crie um Price mensal (ex.: R$ 39)  
2. No `.env`:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

3. Webhook apontando para `/api/stripe/webhook` com eventos:
   - `checkout.session.completed`
   - `customer.subscription.updated`

## Funcionalidades

| Fluxo | Status |
| --- | --- |
| Cadastro / login / logout | ✅ |
| Google OAuth | ✅ (requer provider no Supabase) |
| Recuperar / redefinir senha | ✅ |
| Projetos, coleta, moderação, vídeo | ✅ |
| Widgets + embed | ✅ |
| Upgrade Pro local ou Stripe Checkout | ✅ |
| E-mail novo depoimento (Resend/log) | ✅ |
