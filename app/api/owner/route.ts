import { NextResponse } from "next/server";
import { ownerCookieHeader } from "@/lib/db";

export async function POST() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Set-Cookie": ownerCookieHeader(),
      },
    },
  );
}
