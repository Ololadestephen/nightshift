# Nightshift

**The night shift for unfinished background work.**

Nightshift is an AI operations agent that investigates stalled report jobs, safely resumes work from checkpoints, and verifies the finished report against its original input.

[Try Nightshift](https://trynightshift.vercel.app) · [Project evidence](evidence/README.md)

## How it works

1. Submit a small dataset to generate a report.
2. Nightshift inspects the job, worker lease, checkpoints and errors.
3. It chooses an allowed repair or escalates when acting would be unsafe.
4. It checks the report's contents before marking the job complete.

Each browser session sees its own reports. Active leases are protected, repairs are fenced, and model calls have a shared budget cap. Demonstration failures are deliberately induced in a controlled environment.

## Run locally

Use Node.js 24.

```bash
npm ci
cp .env.example .env
npm run serve
```

Open `http://127.0.0.1:8787`. Configure the server-side model key, spend approval and both budget values in `.env` to enable live model runs. Add a neatlogs key to export traces.

```bash
npm run typecheck
npm test
npm run demo:recover
```

## Built with

TypeScript, Node.js, SQLite locally, Turso on Vercel, and a model through LiteLLM. **neatlogs** helped investigate and improve agent runs, **Entire** recorded development context, and **cfo.ai** informed pricing, costs and runway planning. See the [evidence page](evidence/README.md) for the actual runs and sponsor artifacts.
