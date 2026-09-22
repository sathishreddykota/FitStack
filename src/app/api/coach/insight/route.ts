import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { isProOrElite } from "@/lib/services/subscription-service";
import { prisma } from "@/lib/prisma";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function GET() {
  try {
    const user = await getRequiredUser();
    
    if (!(await isProOrElite(user.id))) {
      return NextResponse.json({ error: "Premium feature" }, { status: 403 });
    }

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Fetch user context
    const [profile, workouts, waterLogs, weightLogs] = await Promise.all([
      prisma.fitnessProfile.findUnique({ where: { userId: user.id } }),
      prisma.workoutSession.findMany({
        where: { userId: user.id, date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
      }),
      prisma.waterLog.findMany({
        where: { userId: user.id, date: { gte: sevenDaysAgo } },
      }),
      prisma.weightLog.findMany({
        where: { userId: user.id, date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
        take: 3,
      }),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Prepare data for the prompt
    const contextStr = `
User Profile: Goal is ${profile.fitnessGoal}, Level is ${profile.activityLevel}.
Workouts in last 7 days: ${workouts.length}.
Total Water logged in last 7 days: ${waterLogs.reduce((acc, log) => acc + log.amountMl, 0)} ml.
Recent Weights (kg): ${weightLogs.map(l => l.weightKg).join(", ")}.
    `;

    // Generate insight using Gemini
    const { object } = await generateObject({
      model: google("gemini-1.5-pro-latest"),
      schema: z.object({
        title: z.string().describe("A catchy, short title for the insight (e.g., 'Hydration Alert', 'Crushing It!')."),
        insight: z.string().describe("A short, encouraging observation based on their last 7 days of data. Keep it under 2 sentences."),
        actionableAdvice: z.string().describe("One specific, actionable piece of advice they can do today based on the insight."),
      }),
      prompt: `You are the FitStack AI Coach. Look at the user's recent data and provide a proactive, daily insight. Be encouraging but direct. Data:\n${contextStr}`,
    });

    return NextResponse.json(object);
  } catch (error) {
    console.error("[COACH_INSIGHT]", error);
    return NextResponse.json({ error: "Failed to generate insight" }, { status: 500 });
  }
}
