import InteractiveDemo from "@/components/interactive-demo";
import styles from "./page.module.css";

interface CallLog {
  id: string;
  caller: string;
  topic: string;
  summary: string;
  importance: string;
  started_at: string;
  notified_channels: string[];
}

async function getRecentCallLogs(): Promise<CallLog[]> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return [];
  }

  const { getSupabaseAdmin } = await import("@/lib/supabase");
  const supabaseAdmin = getSupabaseAdmin();
  const table = process.env.CALL_LOG_TABLE ?? "call_logs";

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("id, caller, topic, summary, importance, started_at, notified_channels")
    .order("started_at", { ascending: false })
    .limit(8);

  if (error || !data) {
    console.error("Failed to fetch call logs", error);
    return [];
  }

  return data as CallLog[];
}

export default async function HomePage() {
  const recentLogs = await getRecentCallLogs();

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>Iqra — Your Bilingual, Heartfelt Call Assistant</h1>
          <p>
            Iqra greets every caller with warmth, listens with empathy, and responds intelligently in Urdu,
            English, or a natural blend of both. Critical conversations reach Syed Eman Ali Shah instantly,
            while casual and spam calls end gracefully.
          </p>
          <ul className={styles.heroList}>
            <li>Emotionally-aware dialogue driven by OpenAI&apos;s latest models</li>
            <li>Twilio voice handling with real-time call triage</li>
            <li>Instant WhatsApp &amp; email alerts for urgent conversations</li>
            <li>Structured call logging inside Supabase for full traceability</li>
          </ul>
        </div>
        <div className={styles.heroCard}>
          <h2>Default Greeting</h2>
          <p>
            “Assalamualaikum, this is Iqra, Syed Eman Ali Shah’s virtual assistant. How may I help you today?”
          </p>
          <small>Voice: Soft, calm, confident — optimized for Urdu &amp; English clarity.</small>
        </div>
      </section>

      <InteractiveDemo />

      <section className={styles.grid}>
        <article>
          <h3>Intelligent Call Routing</h3>
          <p>
            Every spoken word is transcribed, summarized, and classified as critical, business, casual, or spam. Iqra
            keeps context between turns, crafting emotionally attuned replies that feel genuinely human.
          </p>
        </article>
        <article>
          <h3>Real-Time Escalations</h3>
          <p>
            High-priority calls trigger proactive notifications. Iqra can message WhatsApp and send Gmail alerts with
            the caller&apos;s name, timestamp, and concise summary right away.
          </p>
        </article>
        <article>
          <h3>Respectful Call Closure</h3>
          <p>
            When a conversation is casual or spam, Iqra closes with “Thank you for reaching out. Have a peaceful day
            ahead.” — keeping the brand tone consistent.
          </p>
        </article>
      </section>

      <section className={styles.logs}>
        <div>
          <h2>Recent Conversations</h2>
          <p>Synced from Supabase with triage summaries and delivery channels.</p>
        </div>
        <div className={styles.logTableWrapper}>
          {recentLogs.length === 0 ? (
            <p className={styles.emptyState}>Call logs will appear here after your first live call.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Importance</th>
                  <th>Topic</th>
                  <th>Summary</th>
                  <th>Notified</th>
                  <th>Received</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.caller}</td>
                    <td>
                      <span className={`${styles.badge} ${styles[`badge${log.importance}`]}`}>
                        {log.importance}
                      </span>
                    </td>
                    <td>{log.topic}</td>
                    <td>{log.summary}</td>
                    <td>{(log.notified_channels ?? []).join(", ") || "—"}</td>
                    <td>{new Date(log.started_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={styles.architecture}>
        <h2>Deployment Blueprint</h2>
        <div className={styles.architectureGrid}>
          <article>
            <h3>1. Telephony</h3>
            <p>
              Twilio handles inbound PSTN calls via a webhook to <code>/api/voice</code>. Speech-to-text and
              Amazon Polly voices deliver natural, vivid dialogue flows.
            </p>
          </article>
          <article>
            <h3>2. Intelligence</h3>
            <p>
              OpenAI orchestrates empathetic replies, bilingual tone, and triage classification. Responses are tuned
              for emotional resonance and professional clarity.
            </p>
          </article>
          <article>
            <h3>3. Persistence</h3>
            <p>
              Supabase stores live transcripts and structured logs, powering dashboards, follow-ups, and training data
              for future improvements.
            </p>
          </article>
          <article>
            <h3>4. Alerts</h3>
            <p>
              WhatsApp and Gmail notifications keep Syed Eman Ali Shah informed within seconds when a conversation
              needs personal attention.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
