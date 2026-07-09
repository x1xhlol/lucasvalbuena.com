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

## Scripts

```bash
bun run dev
bun run build
bun run typecheck
```

Use Bun. `bun.lock` is the only lockfile.

## License

MIT
