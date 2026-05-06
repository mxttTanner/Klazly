# Parent Portal

Multi-tenant SaaS for English language centers in Vietnam. Teachers post per-lesson updates; parents see their child's progress.

See [AGENTS.md](./AGENTS.md) for full spec, build status, and architecture rules.

## Quick start

```bash
cp .env.local.example .env.local   # then fill in Supabase keys
npm install
npm run dev
```

Open http://localhost:3000.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase (Postgres + Auth + RLS) · next-intl · Vercel
