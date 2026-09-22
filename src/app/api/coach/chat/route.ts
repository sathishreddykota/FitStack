import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { getInternalUserId } from "@/lib/auth";
import { isProOrElite } from "@/lib/services/subscription-service";
import { getUserAiContext } from "@/lib/services/ai-service";
import { prisma } from "@/lib/prisma";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

export const maxDuration = 30; // 30 second timeout for Vercel

export async function POST(req: Request) {
  try {
    const userId = await getInternalUserId();
    const { messages, conversationId } = await req.json();

    if (!(await isProOrElite(userId))) {
      return new Response(JSON.stringify({ error: "Premium feature" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Check if Gemini API key exists
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_gemini_api_key_here") {
      return new Response(
        JSON.stringify({ error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file." }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = await getUserAiContext(userId);

    // 1. Find or create the conversation for this user
    let conversation = null;

    if (conversationId) {
      conversation = await prisma.aIConversation.findUnique({
        where: { id: conversationId, userId }
      });
    }

    if (!conversation) {
      // Find today's conversation
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      conversation = await prisma.aIConversation.findFirst({
        where: { 
          userId,
          createdAt: { gte: startOfToday }
        }
      });
    }

    if (!conversation) {
      // Create one for today
      conversation = await prisma.aIConversation.create({
        data: {
          userId,
          title: new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }), // e.g. "Thu, Sep 17"
        }
      });
    }

    // 2. Erase messages older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await prisma.aIMessage.deleteMany({
      where: {
        conversationId: conversation.id,
        createdAt: { lt: sevenDaysAgo }
      }
    });

    // 3. Persist the new user message
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage && latestUserMessage.role === "user") {
      await prisma.aIMessage.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: latestUserMessage.content,
        }
      });
    }
    
    // 4. Stream response and save AI message
    const result = await streamText({
      model: google("gemini-flash-lite-latest"),
      system: systemPrompt || "You are the FitStack AI Coach.",
      messages,
      async onFinish({ text }) {
        if (text && conversation) {
          await prisma.aIMessage.create({
            data: {
              conversationId: conversation.id,
              role: "ASSISTANT",
              content: text,
            }
          });
        }
      },
    });

    return new Response(result.textStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[POST /api/coach/chat]", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
