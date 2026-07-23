import { NextResponse } from "next/server";
import { getSymbolPayload } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ symbol: string }> }) {
  return NextResponse.json(await getSymbolPayload((await params).symbol), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
