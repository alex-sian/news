import { HomeFeed } from "@/components/home-feed";
import { topicStory } from "@/lib/home-desks";
import { getHomePayload } from "@/lib/alpaca";
import { getTopicArticles, listManagedTopics } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [data, topics] = await Promise.all([getHomePayload(), listManagedTopics()]);
  const topicStories = (
    await Promise.all(
      topics.map(async (topic) =>
        (await getTopicArticles(topic.slug, false))
          .slice(0, 8)
          .map((article) => topicStory(topic, article)),
      ),
    )
  ).flat();
  return <HomeFeed initialData={data} topicStories={topicStories} />;
}
