# AGENTS.md

## Cursor Cloud specific instructions

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
- `OPENROUTER_API_KEY` — powers the Ask agent at `/ask` (`app/api/ask/route.ts`). It calls Claude through OpenRouter's Anthropic-compatible endpoint with the official `@anthropic-ai/sdk`, so model ids are OpenRouter slugs. It answers with `anthropic/claude-sonnet-5.5` unless the optional `ASK_MODEL` names another slug (`anthropic/claude-opus-5.5` is slower but holds the voice slightly better). Each question, its answer, and the outcome are saved to the `ask-questions` Payload collection (readable in `/cms`, no IPs stored). The lock's knowledge lives in `lib/ask/context.ts`; Lucas's own words go in `lib/ask/notes.ts`. It can end an answer with a card (a project, his experience, posts, photos, contact details, or ZeroLeaks pricing); see "Ask cards" in `docs/design/components.md`. Every question carries the whole conversation (only a size guard, `MAX_CONVERSATION_CHARS`, trims the oldest exchanges), and the chat is kept in `sessionStorage` for the tab until "New chat". Rate limiting lives in the Vercel Firewall, not the code: the custom rule "Ask rate limit" allows 30 requests to `/api/ask` per 10 minutes per IP and device (JA4 fingerprint) and answers 429 before the function runs. Inspect or change it with `vercel firewall rules ls` / `vercel firewall rules edit`, then `vercel firewall publish`. Without the key, `/ask` renders an offline notice and the nav, side rail, palette, and sitemap leave Ask out. That switch (`NEXT_PUBLIC_ASK_ENABLED` in `next.config.mjs`) is set at build time, so redeploy after adding the key.

The core portfolio site (Hero, About, Projects, Skills, Tech Stack, Contact) works without any environment variables. The photo gallery (`/photos`, `/admin/photos`) requires `BLOB_READ_WRITE_TOKEN`.

Photos never publish where they were taken. The admin upload removes GPS from the file in the browser before it goes to Blob storage (`lib/photo-privacy.ts`, which zeroes the EXIF GPS block and XMP GPS fields in place without re-encoding), and the server stores the location as "City, Country" from OpenStreetMap's Nominatim instead of coordinates (`lib/geocode.ts`). The manifest and the original files are public, so keep both rules if you change the upload flow.

### Database schema changes

Payload only auto-pushes schema in development; production never gets new tables or columns on its own. After changing anything in `collections/` or `payload.config.ts` that affects the schema, run `bun run migrate:create <name>` (it diffs against the last migration's snapshot in `migrations/`, so no production database is needed) and commit the generated files. The build script runs `payload migrate` on Vercel before `next build`. The baseline migration `20261025_182133_baseline` matches the schema production already had and is marked as applied there.

### Gotchas

- Next.js config has `typescript: { ignoreBuildErrors: true }` so TypeScript errors won't fail the build.
- The `bun.lock`, `pnpm-lock.yaml`, and `package-lock.json` all exist; use `bun.lock` as the canonical lockfile.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
