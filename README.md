# یادباکس (YadBox)

رابط کاربری SaaS مدیریت پروژه — الهام‌گرفته از Asana، Trello، Linear و ClickUp. ساخته‌شده با Next.js App Router، TypeScript، Tailwind CSS، shadcn/ui، TanStack Query/Table، Zustand، dnd-kit، React Hook Form، Zod و Recharts.

## شروع سریع

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) را در مرورگر باز کنید.

**ورود آزمایشی (۵ نقش):** رمز همه `demo`

| نقش | ایمیل |
|------|--------|
| مالک | `owner@yadbox.app` |
| مدیر | `admin@yadbox.app` |
| عضو | `member@yadbox.app` |
| مهمان | `guest@yadbox.app` |
| بیننده | `viewer@yadbox.app` |

در صفحه `/login` می‌توانید با یک کلیک وارد هر اکانت شوید. منو و دکمه‌ها بر اساس نقش فیلتر می‌شوند.

---

Frontend-only project management SaaS UI inspired by Asana, Trello, Linear, and ClickUp. Built with Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query/Table, Zustand, dnd-kit, React Hook Form, Zod, and Recharts.

Visual system follows [`design.md`](./design.md) (YadBox): Atlassian blue primary, Inter typography, compact density, sharp radii, lozenge status badges.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo credentials

Password for all: `demo`

| Role | Email |
|------|--------|
| Owner | `owner@yadbox.app` |
| Admin | `admin@yadbox.app` |
| Member | `member@yadbox.app` |
| Guest | `guest@yadbox.app` |
| Viewer | `viewer@yadbox.app` |

Click any account on `/login` to sign in. Sidebar and actions are filtered by role permissions.

## Architecture

```txt
app/                  # App Router routes (auth, onboarding, dashboard, admin, billing)
components/
  ui/                 # shadcn primitives
  layout/             # App shell, sidebars, switchers, command palette
  common/             # Empty/error/loading, badges, tables helpers
  features/           # Kanban, list, calendar, tasks, projects, reports
lib/
  api/                # API-ready mock services (swap for FastAPI later)
  mock/               # Typed mock datasets
  types/              # Shared TypeScript models
hooks/queries/        # TanStack Query hooks
stores/               # Zustand UI + workspace state
```

## Key routes

| Area | Examples |
|------|----------|
| Auth | `/login`, `/signup`, `/forgot-password`, `/two-factor` |
| Onboarding | `/onboarding`, `/onboarding/workspace`, `/onboarding/templates` |
| App | `/dashboard`, `/workspaces`, `/workspaces/[id]/projects` |
| Views | `.../kanban`, `.../list`, `.../calendar`, `.../timeline`, `.../gantt` |
| Billing | `/billing/plans`, `/billing/subscription`, `/billing/invoices` |
| Admin | `/admin`, `/admin/users`, `/admin/logs` |
| Settings | `/settings/profile`, `/settings/appearance` |

## Notes

- No backend: all data comes from `lib/api/*` mock services with artificial latency.
- Dark mode: theme toggle in user menu / appearance settings (`next-themes`).
- Command palette: `⌘K` / `Ctrl+K`.
- Replace mock services with real FastAPI clients without changing page components.
