import type { NewsArticle } from "./alpaca";
import type { ManagedTopic, TopicArticle } from "./topics";

export type HomeDeskStory = {
  id: string;
  kind: "market" | "topic";
  deskLabel: string;
  deskHref: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  href: string;
  symbols: string[];
  image?: string;
};

export function marketStory(article: NewsArticle): HomeDeskStory {
  return {
    id: `market-${article.id}`,
    kind: "market",
    deskLabel: "Markets",
    deskHref: "/?desk=markets",
    title: article.headline,
    summary: article.summary,
    source: article.source,
    publishedAt: article.updated_at,
    href: article.url,
    symbols: article.symbols,
    image:
      article.images?.find((item) => item.size === "large")?.url ??
      article.images?.[0]?.url,
  };
}

export function topicStory(
  topic: ManagedTopic,
  article: TopicArticle,
): HomeDeskStory {
  return {
    id: `${topic.slug}-${article.id}`,
    kind: "topic",
    deskLabel: topic.title,
    deskHref: topic.publicPath,
    title: article.title,
    summary: article.summary,
    source: article.source,
    publishedAt: article.publishedAt,
    href: article.url,
    symbols: [],
  };
}
