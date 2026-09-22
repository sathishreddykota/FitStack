import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    await getRequiredUser();
    
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    
    const exercises = await prisma.exercise.findMany({
      where: {
        name: { contains: query, mode: "insensitive" }
      },
      take: 20,
      orderBy: { name: "asc" }
    });
    
    return NextResponse.json({ exercises });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
