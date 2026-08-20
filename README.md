# TypeScript security demo

A small pnpm monorepo demonstrating a secure Express + React setup:

- `apps/api` — Express API with three endpoints: `POST /api/login`,
  `GET /api/profile` (protected), `GET /api/notes/search?q=` (protected).
- `apps/web` — React (Vite) frontend for logging in, viewing your profile,
  and searching your notes.
- `packages/shared` — TypeScript types shared between both apps.

See [SECURITY.md](./SECURITY.md) for what each security control is
protecting against, and what the vulnerable version of the same code would
look like.

## Running it

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # then edit JWT_SECRET

pnpm --filter api dev    # http://localhost:3000
pnpm --filter web dev    # http://localhost:5173
```

Open http://localhost:5173 and log in with one of the seeded demo users
(shown pre-filled in the login form).
