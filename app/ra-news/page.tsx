import type { Metadata } from "next";
import { headers } from "next/headers";
import { TopicDesk } from "@/components/topic-desk";
import { getTopicArticles, getTopicBySlug, ownerTrackingFromCookie } from "@/lib/db";

export const metadata: Metadata = {
  title: "RA News",
  description:
    "Evidence-ranked rheumatoid arthritis research, treatment news, and practical relief guidance.",
};

export default async function RaNewsPage() {
  const ownerTracking = ownerTrackingFromCookie((await headers()).get("cookie"));
  const topic = await getTopicBySlug("ra-news");
  if (!topic) return null;
  const articles = await getTopicArticles("ra-news", ownerTracking);
  return (
    <TopicDesk
      initialData={{
        topic,
        articles,
        generatedAt: new Date().toISOString(),
        ownerTracking,
      }}
    />
  );
}
