import { NextResponse } from "next/server";
import { getRequiredUser } from "@/lib/auth";
import { getCalendarSessions } from "@/lib/services/workout-service";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(req: Request) {
  try {
    const user = await getRequiredUser();
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    
    // Default to current month if no date provided
    const refDate = dateParam ? parseISO(dateParam) : new Date();
    const startDate = startOfMonth(refDate);
    const endDate = endOfMonth(refDate);

    const sessions = await getCalendarSessions(user.id, startDate, endDate);

    return NextResponse.json({ sessions });
  } catch (error: any) {
    console.error("Calendar fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
