# Lucas Valbuena

This is my personal site. It has the main portfolio, a small blog, and a photo
gallery.

## Local setup

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://localhost:3000`.

## Env

Copy `.env.example`. The main site runs without the photo/admin env vars, but
the Payload build path needs `DATABASE_URL` and `PAYLOAD_SECRET`.

`/ask` needs `OPENROUTER_API_KEY`; without it the page says Ask is offline and
the site hides its links. Redeploy after adding the key, since the links are
decided at build time.
Set a credit limit on that key in OpenRouter, since the endpoint is public.
`ASK_MODEL` optionally swaps the model (an OpenRouter slug). Questions people ask
are saved under Ask questions in `/cms`, and `lib/ask/notes.ts` is where to add
anything the lock should know in your own words.

## Database changes

Your local dev server pushes collection and field changes straight into its
own database. Production only changes through migrations: after editing a
collection, run `bun run migrate:create <name>` and commit the new files in
`migrations/`. The Vercel build runs `payload migrate` before building, so the
deploy applies them. Skipping this step leaves production without the new
tables or columns, and the admin breaks on them.

## Scripts

```bash
bun run dev
bun run build
bun run typecheck
```

Use Bun. `bun.lock` is the only lockfile.

`typecheck` generates Payload's collection types before running TypeScript.
`build` applies pending database migrations, runs that check, and builds Next.js. The generated
`payload-types.ts` stays ignored; a fresh checkout does not need a prior dev-server run.

## License

MIT
