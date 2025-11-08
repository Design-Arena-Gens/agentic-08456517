import { NextResponse } from "next/server";
import { analyzeCallImportance, generateAssistantReply, type ConversationTurn } from "@/lib/ai";

interface SimulationRequest {
  conversation: ConversationTurn[];
}

export async function POST(request: Request) {
  const payload = (await request.json()) as SimulationRequest;

  if (!payload.conversation || !Array.isArray(payload.conversation)) {
    return NextResponse.json({ error: "conversation is required" }, { status: 400 });
  }

  const assistant = await generateAssistantReply(payload.conversation);
  const analysis = await analyzeCallImportance([
    ...payload.conversation,
    { role: "assistant", content: assistant.reply }
  ]);

  return NextResponse.json({
    reply: assistant.reply,
    language: assistant.language,
    analysis
  });
}
