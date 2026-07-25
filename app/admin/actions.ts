"use server";

import { redirect } from "next/navigation";
import { ownerCookieHeader } from "@/lib/db";
import { slugify } from "@/lib/topics";
import { cookies } from "next/headers";

export async function enableOwnerTracking() {
  (await cookies()).set("mb_owner", "owner", {
    path: "/",
    maxAge: 31_536_000,
    sameSite: "lax",
  });
}

export async function addTopic(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? title));
  const deck = String(formData.get("deck") ?? "").trim() || `${title} curated news and research.`;
  const purpose = String(formData.get("purpose") ?? "").trim() || "personal research and monitoring";
  const geography = String(formData.get("geography") ?? "United States")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const categories = String(formData.get("categories") ?? "Latest, Best & evergreen")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const prefer = String(formData.get("prefer") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const caution = String(formData.get("caution") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const refreshHours = Math.max(6, Number(formData.get("refreshHours") ?? 6));

  if (!title || !slug) redirect("/admin");

  if (process.env.DATABASE_URL) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    await sql`
      insert into managed_topics (
        id, slug, title, deck, purpose, geography, refresh_hours,
        publish_mode, status, categories, source_policy, public_path
      )
      values (
        ${`topic-${slug}`}, ${slug}, ${title}, ${deck}, ${purpose}, ${geography},
        ${refreshHours}, 'auto-with-labels', 'active', ${categories},
        ${JSON.stringify({ prefer, caution })}::jsonb, ${`/topics/${slug}`}
      )
      on conflict (slug)
      do update set
        title = excluded.title,
        deck = excluded.deck,
        purpose = excluded.purpose,
        geography = excluded.geography,
        refresh_hours = excluded.refresh_hours,
        categories = excluded.categories,
        source_policy = excluded.source_policy,
        updated_at = now()
    `;
  }

  redirect(`/topics/${slug}`);
}
