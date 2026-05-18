# 🔥 FORJA — Treino & Nutrição com IA

SaaS completo de **treino e nutrição** para o mercado brasileiro, com
inteligência artificial. Monta divisões de treino, planos alimentares
adaptados à rotina do usuário (trabalho, treino, refeições), gera receitas
fitness com vídeo do YouTube e tem um Coach IA que conhece o perfil do aluno.

Stack: **Next.js 15** (App Router) · **React 19** · **TypeScript** ·
**Supabase** (Postgres + Auth + RLS) · **Groq** (IA gratuita) · **Recharts**.
Interface 100% em português, mobile-first, pronta para o **Vercel**.

---

## ✨ Funcionalidades

- **Onboarding** — perfil físico, biotipo e objetivo.
- **Rotina** — horários de sono, trabalho, treino e refeições. Tudo que a IA
  gera respeita esses horários.
- **Treinos** — divisão (A/B/C/D) gerada por IA, editor de exercícios e
  **sessão ao vivo** com cronômetro, registro de séries e volume.
- **Nutrição** — plano alimentar com **gramas exatas** por alimento, medida
  caseira, macros por refeição e meta de hidratação.
- **Receitas com IA** — para cada refeição, uma receita completa
  (ingredientes, modo de preparo, dica do chef) com **vídeo do YouTube**
  incorporado.
- **Progresso** — registro de peso, gráfico de evolução e histórico de treinos.
- **Coach IA** — chat que conhece perfil, rotina e treinos do usuário.
- **Persistência total** no Supabase, com Row Level Security (cada usuário só
  enxerga os próprios dados).

---

## 🚀 Setup local

### 1. Pré-requisitos
- Node.js 18.18+ (recomendado 20+)
- Conta no [Supabase](https://supabase.com) (plano free serve)
- Chave gratuita da [Groq](https://console.groq.com/keys)
- *(opcional)* Chave da [YouTube Data API v3](https://console.cloud.google.com)

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar o banco (Supabase)
1. Crie um projeto novo no Supabase.
2. Abra **SQL Editor** → **New query**.
3. Cole todo o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql) e
   execute (**Run**).

Isso cria todas as tabelas, as políticas de RLS e o gatilho que gera
automaticamente o perfil e a rotina quando um usuário se cadastra.

### 4. Variáveis de ambiente
Copie o exemplo e preencha:
```bash
cp .env.example .env.local
```

| Variável | Onde obter | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | ✅ |
| `GROQ_API_KEY` | console.groq.com/keys | ✅ |
| `GROQ_MODEL` | padrão `llama-3.3-70b-versatile` | ⬜ |
| `YOUTUBE_API_KEY` | Google Cloud Console (YouTube Data API v3) | ⬜ |
| `NEXT_PUBLIC_SITE_URL` | URL do app (`http://localhost:3000` em dev) | ✅ |

> Sem `YOUTUBE_API_KEY` o app funciona normalmente — as receitas mostram um
> link de busca no YouTube em vez do vídeo incorporado.

### 5. Rodar
```bash
npm run dev
```
Acesse <http://localhost:3000>.

---

## ▲ Deploy no Vercel

1. Suba o projeto para um repositório no GitHub.
2. No [Vercel](https://vercel.com), clique em **Add New → Project** e importe
   o repositório. O framework Next.js é detectado automaticamente.
3. Em **Environment Variables**, adicione **todas** as variáveis do
   `.env.example` (use a URL do Vercel em `NEXT_PUBLIC_SITE_URL`).
4. Clique em **Deploy**.
5. No Supabase, em **Authentication → URL Configuration**, adicione a URL do
   Vercel em **Site URL** e em **Redirect URLs**.

A cada `git push` o Vercel publica uma nova versão.

---

## 🔐 Segurança

- As chaves da Groq e do YouTube são usadas **apenas no servidor**
  (rotas em `src/app/api/`) — nunca chegam ao navegador.
- O banco usa **Row Level Security**: as políticas garantem que cada usuário
  só lê e grava os próprios registros.
- O `middleware.ts` protege as rotas autenticadas e renova a sessão.

---

## 🗂️ Estrutura

```
src/
  app/
    (app)/            páginas autenticadas (com navegação inferior)
      inicio/         dashboard
      treinos/        lista, editor e sessão ao vivo
      nutricao/       plano alimentar + receitas com vídeo
      rotina/         horários de trabalho, treino e refeições
      progresso/      peso, gráfico e histórico
      coach/          chat com a IA
    api/ai/           rotas server-side da IA (treino, dieta, receita, coach)
    api/youtube/      busca de vídeos
    login/            autenticação
    onboarding/       cadastro de perfil
  components/         UI compartilhada e navegação
  lib/                Supabase, cálculos, integração com IA e YouTube
supabase/schema.sql   banco de dados completo
```

---

## ⚠️ Aviso

O FORJA é uma ferramenta de apoio. As recomendações geradas por IA não
substituem a orientação de um educador físico ou nutricionista. Em caso de
condições de saúde, consulte um profissional.
