# AGENTS.md

### Overview

This is a **Next.js 16 (canary)** portfolio website using React 19, Tailwind CSS v4, shadcn/ui, and Framer Motion. It is a single-service application — only the Next.js dev server needs to run.

### Package Manager

The project uses **bun**. The lockfile is `bun.lock`. Run `bun install` to install dependencies.

### Running the dev server

```
bun run dev
```

The server starts on `http://localhost:3000`.

### Build

```
bun run build
```

### Lint

The `bun run lint` script calls `eslint .`, but **eslint is not declared as a dependency** in `package.json`. This is a pre-existing gap — the lint command will fail with `command not found` unless eslint is installed separately.

### Environment variables (optional)

- `ADMIN_PASSWORD` — password for the admin photo management panel at `/admin`
- `BLOB_READ_WRITE_TOKEN` — required by `@vercel/blob` for the photography gallery feature

The core portfolio site (Hero, About, Projects, Skills, Tech Stack, Contact) works without any environment variables. The photo gallery (`/photos`, `/admin/photos`) requires `BLOB_READ_WRITE_TOKEN`.

### Gotchas

- Next.js config has `typescript: { ignoreBuildErrors: true }` so TypeScript errors won't fail the build.
- The `bun.lock`, `pnpm-lock.yaml`, and `package-lock.json` all exist; use `bun.lock` as the canonical lockfile.
