# Kenya Fund Finder

Kenya Fund Finder is a financial education and market-comparison platform for Kenyan investors. It brings unit trusts, NSE stocks, exchange rates, commodities, market news, watchlists, portfolio tools, alerts, calculators, and an educational AI Lab into one responsive web application.

## Stack

- React 18, TypeScript, and Vite
- Tailwind CSS and shadcn/ui
- Supabase Auth, Postgres, Storage, and Edge Functions
- Vitest and Testing Library

## Local development

Requirements: Node.js 22 or newer and npm.

```sh
git clone <repository-url>
cd kenya-fund-finder
npm install
cp .env.example .env
npm run dev
```

At minimum, configure these browser-safe values in `.env`:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_SUPABASE_PROJECT_ID=<project-ref>
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend code or commit it to Git.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Generate the sitemap and start Vite |
| `npm test` | Run the complete Vitest suite |
| `npm run test:watch` | Run tests in watch mode |
| `npm run build` | Generate the sitemap and create a production build |
| `npm run check` | Run tests and a production build |
| `npm run lint` | Run ESLint across the repository |
| `npm run preview` | Preview the production build locally |

The test commands disable Node's experimental web-storage global so jsdom owns `localStorage` consistently, including on Node 26.

## Supabase

- Database changes live in `supabase/migrations/`.
- Edge Functions live in `supabase/functions/`.
- Script-only and Edge Function secrets are documented in `.env.example`.
- Administrative helper scripts require a service-role key for the same project configured by `VITE_SUPABASE_URL`.

Useful data-maintenance commands:

```sh
npm run db:check-counts
npm run db:migrate-lovable
npm run db:apply-repair-schema
```

Review each script's prerequisites before running it against a hosted project.

## Deployment

Build with `npm run build` and deploy the generated `dist/` directory. Configure the `VITE_*` values at build time and configure backend secrets in Supabase rather than the frontend environment.

## Project status

The automated suite covers the AI Lab routing and guardrails, fund imports and matching, guest portfolio storage, alerts, watchlists, and email-section generation. Run `npm run check` before shipping changes.
