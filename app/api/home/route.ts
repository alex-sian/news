import { NextResponse } from "next/server";
import { getHomePayload } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET() {
  const payload = await getHomePayload();
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
