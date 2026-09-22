import { NextResponse } from "next/server";
import { getInternalUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const userId = await getInternalUserId();

    // 1. Erase messages older than 7 days (global cleanup for user)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Perform cleanup asynchronously (or await it if preferred)
    // First, find all user conversations
    const userConversations = await prisma.aIConversation.findMany({
      where: { userId },
      select: { id: true }
    });
    
    const conversationIds = userConversations.map(c => c.id);

    if (conversationIds.length > 0) {
      await prisma.aIMessage.deleteMany({
        where: {
          conversationId: { in: conversationIds },
          createdAt: { lt: sevenDaysAgo }
        }
      });
    }

    // 2. Find all conversations for this user that have recent messages
    // To be clean, we can just fetch all conversations created in the last 7 days
    const conversations = await prisma.aIConversation.findMany({
      where: { 
        userId,
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // 3. Map them to the format expected by the frontend
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title,
      createdAt: conv.createdAt,
      messages: conv.messages.map(msg => ({
        id: msg.id,
        role: msg.role === "USER" ? "user" : "assistant",
        content: msg.content
      }))
    }));

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("[GET /api/coach/chat/history]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
