import { redirect } from "next/navigation";

export function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const symbol = query.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, "");
  if (!symbol) redirect("/");
  redirect(`/symbol/${encodeURIComponent(symbol)}`);
}
