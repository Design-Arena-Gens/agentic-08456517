import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { appendCallMessage, getConversation } from "@/lib/call-session";
import { analyzeCallImportance, generateAssistantReply, type ConversationTurn } from "@/lib/ai";
import { finishCallLog, getCallLog, upsertCallLog } from "@/lib/call-log";
import { notifyImportantCall } from "@/lib/notifications";
import { VoiceResponseBuilder, validateTwilioSignature } from "@/lib/twilio";

function xmlResponse(response: VoiceResponseBuilder) {
  return new NextResponse(response.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

function getRequestUrl(req: NextRequest) {
  const host = req.headers.get("host") ?? "localhost";
  const protocol = req.headers.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}${new URL(req.url).pathname}`;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  const signature = req.headers.get("x-twilio-signature");
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (signature && authToken) {
    const url = process.env.TWILIO_WEBHOOK_URL ?? getRequestUrl(req);
    const valid = validateTwilioSignature(authToken, signature, url, params);
    if (!valid) {
      return new NextResponse("Invalid Twilio signature", { status: 401 });
    }
  }

  const callSid = params.CallSid;
  if (!callSid) {
    return new NextResponse("Missing CallSid", { status: 400 });
  }

  const from = params.From ?? "Unknown";
  const callStatus = params.CallStatus;
  const speechResult = params.SpeechResult;
  const timestamp = new Date().toISOString();

  const response = new VoiceResponseBuilder();

  if (!speechResult) {
    response.gather(
      {
        input: "speech",
        language: "en-US",
        speechTimeout: "auto",
        action: "/api/voice",
        method: "POST"
      },
      {
        voice: "Polly.Amy",
        language: "en-US",
        text: "Assalamualaikum, this is Iqra, Syed Eman Ali Shah’s virtual assistant. How may I help you today?"
      }
    );

    await upsertCallLog({
      callSid,
      caller: from,
      topic: "Awaiting caller input",
      summary: "Call initiated, awaiting summary",
      importance: "casual",
      startedAt: timestamp,
      notifiedChannels: []
    });

    return xmlResponse(response);
  }

  const conversation: ConversationTurn[] = await getConversation(callSid);
  const callerTurn: ConversationTurn = { role: "user", content: speechResult };

  await appendCallMessage(callSid, callerTurn);

  const assistantMessage = await generateAssistantReply([...conversation, callerTurn]);
  const assistantTurn: ConversationTurn = { role: "assistant", content: assistantMessage.reply };
  await appendCallMessage(callSid, assistantTurn);

  const analysis = await analyzeCallImportance([...conversation, callerTurn, assistantTurn]);

  let notifiedChannels: string[] = [];
  const existingLog = await getCallLog(callSid);
  const alreadyNotified = existingLog?.notified_channels ?? [];

  if (
    (analysis.importance === "critical" || analysis.importance === "business") &&
    alreadyNotified.length === 0
  ) {
    notifiedChannels = await notifyImportantCall({
      caller: from,
      summary: analysis.summary,
      callSid,
      startedAt: timestamp
    });
  }

  response.say(
    {
      voice: "Polly.Amy",
      language: "en-US"
    },
    assistantMessage.reply
  );

  const turnsCount = conversation.length + 2;
  const shouldHangup =
    analysis.importance === "spam" ||
    (analysis.importance === "casual" && turnsCount >= 6) ||
    callStatus === "completed";

  const mergedChannels =
    notifiedChannels.length > 0 ? Array.from(new Set([...alreadyNotified, ...notifiedChannels])) : alreadyNotified;

  await finishCallLog(callSid, {
    summary: analysis.summary,
    topic: analysis.topic,
    importance: analysis.importance,
    notifiedChannels: mergedChannels,
    endedAt: shouldHangup ? timestamp : undefined,
    durationSeconds: shouldHangup && params.CallDuration ? Number(params.CallDuration) : undefined
  });

  if (shouldHangup) {
    response.say(
      {
        voice: "Polly.Amy",
        language: "en-US"
      },
      "Thank you for reaching out. Have a peaceful day ahead."
    );
    response.hangup();
  } else {
    response.pause(1);
    response.gather(
      {
        input: "speech",
        speechTimeout: "auto",
        action: "/api/voice",
        method: "POST",
        language: "en-US"
      },
      {
        voice: "Polly.Amy",
        language: "en-US",
        text: "I'm listening."
      }
    );
  }

  return xmlResponse(response);
}
