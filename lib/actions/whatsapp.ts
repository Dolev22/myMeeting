"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/session";
import { getOrAssignBusinessNumber } from "@/lib/whatsapp/business-number";
import { getMockWhatsAppProvider, getWhatsAppProvider } from "@/lib/whatsapp/provider";
import { generateWhatsAppReply } from "@/lib/ai/whatsapp-response";
import { analyzeConversation } from "@/lib/ai/conversation-analysis";
import { buildWhatsAppTranscript } from "@/lib/whatsapp/build-transcript";
import {
  getWhatsAppConversation,
  listWhatsAppMessages,
  markConversationRead,
  saveWhatsAppConversationAnalysis,
} from "@/lib/repo/whatsapp";

export interface SimulateIncomingFormState {
  error?: string;
}

const simulateSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7),
  message: z.string().trim().min(1),
});

// "Simulate Incoming WhatsApp" (requirement #4): posts a real message-received
// event through the Mock WhatsApp Provider, which flows through
// /api/whatsapp/webhook exactly like a real Wasender delivery would — this
// action never touches the database directly.
export async function simulateIncomingWhatsAppAction(
  _prevState: SimulateIncomingFormState,
  formData: FormData
): Promise<SimulateIncomingFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const parsed = simulateSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: "invalid" };

  let conversationId: string | undefined;
  try {
    const businessNumber = await getOrAssignBusinessNumber(userId);
    const provider = getMockWhatsAppProvider();
    const result = await provider.simulateIncoming({
      to: businessNumber,
      from: parsed.data.phone,
      senderName: parsed.data.name,
      text: parsed.data.message,
    });
    conversationId = result.conversationId;
  } catch (err) {
    console.error("[whatsapp] simulate incoming failed", err);
    return { error: "simulate_failed" };
  }

  revalidatePath("/whatsapp");
  revalidatePath("/leads");
  revalidatePath("/");
  if (conversationId) redirect(`/whatsapp/${conversationId}`);
  return {};
}

export interface SendWhatsAppMessageFormState {
  error?: string;
}

// Manual outgoing message from the chat view (requirement #11): CRM -> Mock
// WhatsApp Provider -> simulated message-sent event -> webhook -> saved.
export async function sendWhatsAppMessageAction(
  conversationId: string,
  _prevState: SendWhatsAppMessageFormState,
  formData: FormData
): Promise<SendWhatsAppMessageFormState> {
  const userId = await getCurrentUserId();
  if (!userId) redirect("/login");

  const body = (formData.get("body") as string | null)?.trim();
  if (!body) return { error: "empty" };

  const conversation = await getWhatsAppConversation(userId, conversationId);
  if (!conversation) return { error: "not_found" };

  try {
    const businessNumber = await getOrAssignBusinessNumber(userId);
    const provider = getWhatsAppProvider();
    await provider.sendMessage({ from: businessNumber, to: conversation.phoneNumber, body });
  } catch (err) {
    console.error("[whatsapp] send message failed", err);
    return { error: "send_failed" };
  }

  revalidatePath(`/whatsapp/${conversationId}`);
  revalidatePath("/whatsapp");
  return {};
}

export interface GenerateReplyFormState {
  error?: string;
}

// Optional manual "Generate AI Response" action (requirement #15) — the
// automatic flow already sends one after every incoming message; this lets
// the user trigger another one on demand (e.g. after re-reading the thread).
export async function generateAiReplyAction(
  conversationId: string,
  _prevState: GenerateReplyFormState,
  _formData: FormData
): Promise<GenerateReplyFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  const conversation = await getWhatsAppConversation(userId, conversationId);
  if (!conversation) return { error: "not_found" };

  const messages = await listWhatsAppMessages(userId, conversationId);
  const lastIncoming = [...messages].reverse().find((m) => m.direction === "incoming");
  if (!lastIncoming) return { error: "no_incoming_message" };

  try {
    const reply = generateWhatsAppReply({
      incomingText: lastIncoming.body,
      lead: {
        name: conversation.lead.name,
        company: conversation.lead.company,
        status: conversation.lead.status,
      },
      isFirstMessage: messages.filter((m) => m.direction === "incoming").length <= 1,
      previousMessages: messages,
    });
    const businessNumber = await getOrAssignBusinessNumber(userId);
    const provider = getWhatsAppProvider();
    await provider.sendMessage({
      from: businessNumber,
      to: conversation.phoneNumber,
      body: reply,
      isAiGenerated: true,
    });
  } catch (err) {
    console.error("[whatsapp] manual AI reply failed", err);
    return { error: "generate_failed" };
  }

  revalidatePath(`/whatsapp/${conversationId}`);
  revalidatePath("/whatsapp");
  return {};
}

export interface GenerateSummaryFormState {
  error?: string;
}

// Bonus (requirement #16): reuses the existing local, deterministic
// lib/ai/conversation-analysis.ts analyzer instead of a second AI engine.
export async function generateWhatsAppSummaryAction(
  conversationId: string,
  _prevState: GenerateSummaryFormState,
  _formData: FormData
): Promise<GenerateSummaryFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "unauthorized" };

  const conversation = await getWhatsAppConversation(userId, conversationId);
  if (!conversation) return { error: "not_found" };

  const messages = await listWhatsAppMessages(userId, conversationId);
  if (messages.length === 0) return { error: "no_messages" };

  try {
    const analysis = await analyzeConversation({
      transcription: buildWhatsAppTranscript(messages),
      occurredAt: conversation.lastMessageAt,
    });
    await saveWhatsAppConversationAnalysis(userId, conversationId, analysis);
  } catch (err) {
    console.error("[whatsapp] summary generation failed", err);
    return { error: "unknown_error" };
  }

  revalidatePath(`/whatsapp/${conversationId}`);
  return {};
}

export async function markWhatsAppConversationReadAction(conversationId: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;
  await markConversationRead(userId, conversationId);
  revalidatePath("/whatsapp");
}
