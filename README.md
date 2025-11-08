# Iqra – Virtual Call Handling Assistant

Iqra is a bilingual (Urdu ↔ English) call-handling assistant for Syed Eman Ali Shah. She answers inbound calls through Twilio, holds natural conversations powered by OpenAI, escalates urgent conversations via WhatsApp and Gmail, and archives structured call logs in Supabase.

## ✨ Core Capabilities

- **Warm, human greeting**: “Assalamualaikum, this is Iqra, Syed Eman Ali Shah’s virtual assistant. How may I help you today?”
- **Emotionally intelligent dialogue** with OpenAI (Urdu, English, or natural mix).
- **Real-time triage** into `critical`, `business`, `casual`, or `spam`.
- **Instant alerts** for important calls (WhatsApp + Gmail).
- **Graceful closures** for casual / spam callers.
- **Persistent logging** of caller, topic, summary, and notification channels in Supabase.

## 🧱 Architecture Overview

| Layer | Service | Purpose |
| ----- | ------- | ------- |
| Telephony | Twilio Voice | Receives inbound calls, streams audio → webhook |
| Intelligence | OpenAI (`gpt-4o-mini` default) | Generates calming replies + triages conversations |
| Notifications | Twilio WhatsApp, Gmail (Nodemailer) | Notifies Syed Eman Ali Shah about priority calls |
| Storage | Supabase Postgres | Persists transcripts and call logs |
| Web | Next.js 14 (App Router) | Marketing site, interactive demo, API routes |

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and update every placeholder value.

```bash
cp .env.example .env.local
```

Required environment variables:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_VOICE_FROM`, `TWILIO_WEBHOOK_URL`
- `NOTIFICATION_WHATSAPP_TO`, `NOTIFICATION_EMAIL_TO`
- `GMAIL_USER`, `GMAIL_APP_PASSWORD`

### 3. Create database tables

Run the SQL below inside Supabase:

```sql
create table public.call_logs (
  id uuid primary key default uuid_generate_v4(),
  call_sid text unique not null,
  caller text not null,
  topic text not null,
  summary text not null,
  importance text not null check (importance in ('critical','business','casual','spam')),
  started_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz,
  duration_seconds integer,
  notified_channels text[] default '{}'::text[]
);

create table public.call_messages (
  id uuid primary key default uuid_generate_v4(),
  call_sid text not null,
  role text not null check (role in ('system','user','assistant')),
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index call_messages_sid_idx on public.call_messages(call_sid, created_at);
```

### 4. Link the Twilio webhook

1. Deploy (see below) and note `https://agentic-08456517.vercel.app/api/voice`.
2. In the Twilio Console → Voice → Phone Numbers → Configure, set the **A Call Comes In** webhook to `POST` `https://agentic-08456517.vercel.app/api/voice`.
3. Set the same URL as `TWILIO_WEBHOOK_URL` so signature validation succeeds.

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:3000` to explore the marketing site and interactive simulator.

## 📞 Call Flow

1. Twilio hits `/api/voice` when a call arrives.
2. Iqra greets and gathers speech input.
3. Transcripts are appended to Supabase (`call_messages`).
4. OpenAI crafts the bilingual reply and a triage summary.
5. Important calls trigger `notifyImportantCall` (WhatsApp & Gmail).
6. Casual/spam callers hear “Thank you for reaching out. Have a peaceful day ahead.” and the call ends.
7. Call logs are upserted to Supabase (`call_logs`) with summary, topic, importance, and notification channels.

## 🧪 Testing Checklist

- `npm run lint` – static analysis before deploy.
- Call the Twilio number and verify webhook responses (use Twilio debugger for request logs).
- Confirm call log rows appear in Supabase.
- Ensure WhatsApp and Gmail alerts arrive for `critical` / `business` triage.

## 📦 Deployment

Builds are optimized for Vercel:

```bash
npm run build
npm run start
```

After verifying locally, deploy with:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-08456517
```

Finally, hit the production health check:

```bash
curl https://agentic-08456517.vercel.app
```

## 🔐 Security Notes

- Keep the Supabase Service Role key server-only.
- Rotate Twilio auth tokens and Gmail app passwords regularly.
- Restrict Twilio webhook URL exposure with signature validation (already built in).

---

Iqra is designed to feel present, compassionate, and dependable. Customize prompts, extend analytics, or plug in dashboards to keep raising the bar for every caller. 💛
