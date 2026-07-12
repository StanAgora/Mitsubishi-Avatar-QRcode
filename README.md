# Mitsubishi Avatar QR Code Demo

React (Vite) + Express demo: a landing page shows a QR code; scanning it opens
a full-screen page that joins an Agora RTC channel and starts a Conversational
AI Agent (TTS + Avatar video) for a live voice conversation.

## Structure

- `client/` — React + Vite frontend
  - `src/pages/LandingPage.jsx` — generates a session id and renders its QR code
  - `src/pages/AgentPage.jsx` — joins the Agora RTC+RTM channel, publishes the mic, renders the agent's avatar video full-screen with a live caption
  - `src/lib/agoraClient.js` — Agora RTC SDK join/publish/leave helpers
  - `src/lib/rtmClient.js` — Agora RTM login/subscribe + transcription event parsing
  - `src/lib/api.js` — calls to the backend (`/api/token`, `/api/agent/start`, `/api/agent/stop`)
- `server/` — Express backend
  - `src/routes/token.js` — mints a combined RTC+RTM token (keeps `AGORA_APP_CERTIFICATE` server-side)
  - `src/routes/agent.js` — starts/stops the Conversational AI Agent via Agora's REST API
  - `src/services/agentService.js` — joins the agent (audio) and avatar (video) into the channel as two extra RTC participants
  - `src/config/agentProfile.js` — builds the ASR/LLM/TTS/Avatar `properties` payload entirely from env vars (no secrets or prompts in source)
  - in production, also serves the built client from `client/dist`

## Setup

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
# fill in AGORA_APP_ID / AGORA_APP_CERTIFICATE / AGORA_CUSTOMER_ID / AGORA_CUSTOMER_SECRET
# and the ASR / LLM / TTS / Avatar vendor credentials in server/.env
```

## Development

```bash
npm run dev
```

Runs the Vite dev server (http://localhost:5173) and the Express API
(http://localhost:8080) together; Vite proxies `/api/*` to Express.

## Production (single-process deploy)

```bash
npm run start
```

Builds the client and starts Express, which serves the built assets and the
API from one process/port (`PORT` env var, default 8080).
