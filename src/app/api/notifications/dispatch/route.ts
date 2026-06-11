import { NextResponse } from "next/server";
import { dispatchPendingNotifications } from "@/features/notifications/services/dispatcher";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expected = process.env.SYNC_TRIGGER_SECRET;
  if (expected) {
    const provided = request.headers.get("x-sync-secret");
    if (provided !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingNotifications();
  return NextResponse.json(result);
}
