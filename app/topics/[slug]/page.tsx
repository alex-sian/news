import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TopicDesk } from "@/components/topic-desk";
import { getTopicArticles, getTopicBySlug, ownerTrackingFromCookie } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  return {
    title: topic?.title ?? "Topic",
    description: topic?.deck ?? "Managed news topic.",
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const topic = await getTopicBySlug(slug);
  if (!topic) notFound();
  const ownerTracking = ownerTrackingFromCookie((await headers()).get("cookie"));
  const articles = await getTopicArticles(slug, ownerTracking);

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
