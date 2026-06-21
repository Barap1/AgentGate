# AgentGate Evals

Small toy cases for checking demo behavior against `POST /api/sanitize`.

Run the app first:

```bash
npm run dev
```

Then run:

```bash
npm run eval:local
```

The runner calls `http://localhost:3000` by default. Override with:

```bash
AGENTGATE_EVAL_URL=https://your-deployment.example npm run eval:local
```

These are deterministic inputs, not proof that the guardrail is complete. Free
provider models can vary or rate-limit, so use failures as review signals.
