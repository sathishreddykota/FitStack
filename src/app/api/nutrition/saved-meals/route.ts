import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const savedMeals = await prisma.savedMeal.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ savedMeals });
  } catch (error: any) {
    console.error("[GET_SAVED_MEALS]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, items } = body;

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Name and items are required" },
        { status: 400 }
      );
    }

    const savedMeal = await prisma.savedMeal.create({
      data: {
        name,
        description,
        userId: user.id,
        items: {
          create: items.map((item: any) => ({
            foodId: item.foodId,
            quantityG: item.quantityG,
            servingUnit: item.servingUnit || "g",
          })),
        },
      },
      include: {
        items: {
          include: {
            food: true,
          },
        },
      },
    });

    return NextResponse.json({ savedMeal });
  } catch (error: any) {
    console.error("[POST_SAVED_MEAL]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
