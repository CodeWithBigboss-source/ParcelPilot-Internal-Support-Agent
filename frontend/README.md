# ParcelPilot — Internal AI Support & Operations Console (Frontend)

Production-quality internal operations interface for the ParcelPilot B2B logistics AI Support Agent. Built with **Next.js 16.3**, **TypeScript**, **Tailwind CSS v4**, **Framer Motion**, and **Lucide Icons**.

---

## Key Interface Features

1. **Light Enterprise Aesthetics**: Slate grays (`#F8FAFC`), deep operational blue (`#2563EB`), crisp typography, dense information layout.
2. **Tool Execution Traces**: Visible, expandable step-by-step reasoning panel showing tool calls, timings (ms), and parameters.
3. **Evidence & Precedence**: Interactive source badges with popovers displaying exact document section, agreement precedence, and excerpts.
4. **Human Control Over Actions**: Pending Action cards (e.g. P1 Escalation) requiring explicit human confirmation before execution.
5. **Role & Account Switcher**: Global role switching (*Support Agent*, *Senior Support*, *Ops Manager*, *Admin*) with live permission updates.
6. **5 Investigation Scenarios**: Pre-built mock interactions grounded in the real dataset.

---

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build
```bash
pnpm build
pnpm start
```

---

## Connecting to Backend

By default, the application runs in **Mock Data Mode** (`NEXT_PUBLIC_USE_MOCK=true`), using `lib/api-client.ts` to simulate realistic tool-step streaming and response generation.

To connect to the live FastAPI backend:
1. Set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local`
2. Set `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. All components automatically route requests to the FastAPI endpoints through `lib/api-client.ts`.
