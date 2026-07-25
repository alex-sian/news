import { NextResponse } from "next/server";
import { listManagedTopics } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const topics = await listManagedTopics();
  return NextResponse.json({
    topics: topics.map((topic) => ({
      href: topic.publicPath,
      label: topic.title,
      eyebrow:
        topic.purpose.includes("sports") || topic.slug.includes("mavericks")
          ? "Team news desk"
          : topic.purpose.includes("health")
            ? "Research, treatment & relief"
            : "Research desk",
    })),
  });
}
