import { NextResponse } from "next/server";
import { getSymbolPayload } from "@/lib/alpaca";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const range = new URL(request.url).searchParams.get("range") ?? undefined;
  return NextResponse.json(await getSymbolPayload((await params).symbol, range), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
