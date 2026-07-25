import { neon } from "@neondatabase/serverless";
import type { ManagedTopic, TopicArticle } from "./topics";
import {
  RA_MANAGED_TOPIC,
  SOLID_STATE_BATTERIES_TOPIC,
  SOLID_STATE_BATTERY_SEEDS,
} from "./topics";
import { getRaNews } from "./ra-news";

const OWNER_COOKIE = "mb_owner";
const OWNER_VALUE = "owner";

type DbTopicRow = {
  id: string;
  slug: string;
  title: string;
  deck: string;
  purpose: string;
  geography: string[];
  refresh_hours: number;
  publish_mode: ManagedTopic["publishMode"];
  status: ManagedTopic["status"];
  categories: string[];
  source_policy: ManagedTopic["sourcePolicy"];
  public_path: string | null;
  created_at: string;
  updated_at: string;
};

type DbArticleRow = {
  id: string;
  title: string;
  summary: string;
  why_it_matters: string;
  limitation: string;
  source: string;
  url: string;
  published_at: string;
  reviewed_at: string;
  evidence: TopicArticle["evidence"];
  tags: string[];
  evergreen: boolean;
  automated: boolean;
  canonical_key: string | null;
  viewed_at: string | null;
};

export function ownerTrackingFromCookie(cookieHeader: string | null | undefined) {
  return Boolean(
    cookieHeader
      ?.split(";")
      .map((part) => part.trim())
      .some((part) => part === `${OWNER_COOKIE}=${OWNER_VALUE}`),
  );
}

export function ownerCookieHeader() {
  return `${OWNER_COOKIE}=${OWNER_VALUE}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function sqlClient() {
  if (!process.env.DATABASE_URL) return null;
  return neon(process.env.DATABASE_URL);
}

function topicFromRow(row: DbTopicRow): ManagedTopic {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    deck: row.deck,
    purpose: row.purpose,
    geography: row.geography ?? [],
    refreshHours: row.refresh_hours,
    publishMode: row.publish_mode,
    status: row.status,
    categories: row.categories ?? [],
    sourcePolicy: row.source_policy ?? { prefer: [], caution: [] },
    publicPath: row.public_path ?? `/topics/${row.slug}`,
    createdAt: String(row.created_at).slice(0, 10),
    updatedAt: String(row.updated_at).slice(0, 10),
  };
}

function articleFromRow(row: DbArticleRow): TopicArticle {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    whyItMatters: row.why_it_matters,
    limitation: row.limitation,
    source: row.source,
    url: row.url,
    publishedAt: String(row.published_at).slice(0, 10),
    reviewedAt: String(row.reviewed_at).slice(0, 10),
    evidence: row.evidence,
    tags: row.tags ?? [],
    evergreen: row.evergreen,
    automated: row.automated,
    canonicalKey: row.canonical_key ?? undefined,
    viewedAt: row.viewed_at,
  };
}

function raArticles(): TopicArticle[] {
  return getRaNews().articles.map((article) => ({
    id: article.id,
    title: article.title,
    summary: article.summary,
    whyItMatters: article.whyItMatters,
    limitation: article.limitation,
    source: article.source,
    url: article.url,
    publishedAt: article.publishedAt,
    reviewedAt: article.reviewedAt,
    evidence:
      article.evidence === "Regulator" || article.evidence === "Guideline"
        ? "Primary source"
        : article.evidence === "Systematic review"
          ? "Review"
          : article.evidence === "Clinical trial record"
            ? "Primary source"
            : "Research paper",
    tags: article.tags,
    evergreen: article.evergreen,
    automated: Boolean((article as { automated?: boolean }).automated),
    canonicalKey: article.doi ?? article.pmid ?? article.trialId ?? article.url,
  }));
}

export function fallbackTopics() {
  return [RA_MANAGED_TOPIC, SOLID_STATE_BATTERIES_TOPIC];
}

export async function listManagedTopics(): Promise<ManagedTopic[]> {
  const sql = sqlClient();
  if (!sql) return fallbackTopics();
  try {
    const rows = await sql`
      select id, slug, title, deck, purpose, geography, refresh_hours,
        publish_mode, status, categories, source_policy, public_path,
        created_at::text, updated_at::text
      from managed_topics
      order by title asc
    `;
    return (rows as DbTopicRow[]).map(topicFromRow);
  } catch {
    return fallbackTopics();
  }
}

export async function getTopicBySlug(slug: string): Promise<ManagedTopic | null> {
  const fallback = fallbackTopics().find((topic) => topic.slug === slug);
  const sql = sqlClient();
  if (!sql) return fallback ?? null;
  try {
    const rows = await sql`
      select id, slug, title, deck, purpose, geography, refresh_hours,
        publish_mode, status, categories, source_policy, public_path,
        created_at::text, updated_at::text
      from managed_topics
      where slug = ${slug}
      limit 1
    `;
    return rows[0] ? topicFromRow(rows[0] as DbTopicRow) : fallback ?? null;
  } catch {
    return fallback ?? null;
  }
}

export async function getTopicArticles(
  slug: string,
  ownerTracking: boolean,
): Promise<TopicArticle[]> {
  const fallback = slug === "ra-news" ? raArticles() : SOLID_STATE_BATTERY_SEEDS;
  const sql = sqlClient();
  if (!sql) return fallback;
  try {
    const rows = await sql`
      select a.id, a.title, a.summary, a.why_it_matters, a.limitation,
        a.source, a.url, a.published_at::text, a.reviewed_at::text,
        a.evidence, a.tags, a.evergreen, a.automated, a.canonical_key,
        max(v.viewed_at)::text as viewed_at
      from articles a
      join topic_articles ta on ta.article_id = a.id
      join managed_topics t on t.id = ta.topic_id
      left join article_views v on v.article_id = a.id
        and v.viewer_key = 'owner'
        and ${ownerTracking}
      where t.slug = ${slug}
        and ta.status = 'published'
      group by a.id
      order by a.published_at desc, a.title asc
      limit 240
    `;
    const dbArticles = (rows as DbArticleRow[]).map(articleFromRow);
    const byId = new Map<string, TopicArticle>();
    for (const article of fallback) byId.set(article.id, article);
    for (const article of dbArticles) {
      byId.set(article.id, {
        ...(byId.get(article.id) ?? article),
        ...article,
      });
    }
    return [...byId.values()].sort((left, right) =>
      right.publishedAt.localeCompare(left.publishedAt),
    );
  } catch {
    return fallback;
  }
}

export async function markArticleViewed(
  articleId: string,
  topicSlug: string,
  article?: TopicArticle,
) {
  const sql = sqlClient();
  if (!sql) return { ok: true, persisted: false };
  if (article) {
    await sql`
      insert into articles (
        id, title, summary, why_it_matters, limitation, source, url,
        published_at, reviewed_at, evidence, tags, evergreen, automated, canonical_key
      )
      values (
        ${article.id}, ${article.title}, ${article.summary}, ${article.whyItMatters},
        ${article.limitation}, ${article.source}, ${article.url}, ${article.publishedAt},
        ${article.reviewedAt}, ${article.evidence}, ${article.tags}, ${Boolean(article.evergreen)},
        ${Boolean(article.automated)}, ${article.canonicalKey ?? article.url}
      )
      on conflict (id)
      do update set
        title = excluded.title,
        summary = excluded.summary,
        why_it_matters = excluded.why_it_matters,
        limitation = excluded.limitation,
        source = excluded.source,
        url = excluded.url,
        published_at = excluded.published_at,
        reviewed_at = excluded.reviewed_at,
        evidence = excluded.evidence,
        tags = excluded.tags,
        evergreen = excluded.evergreen,
        automated = excluded.automated,
        updated_at = now()
    `;
    await sql`
      insert into topic_articles (topic_id, article_id, status)
      select id, ${article.id}, 'published'
      from managed_topics
      where slug = ${topicSlug}
      on conflict (topic_id, article_id) do nothing
    `;
  }
  await sql`
    insert into article_views (viewer_key, article_id, topic_slug, viewed_at)
    values ('owner', ${articleId}, ${topicSlug}, now())
    on conflict (viewer_key, article_id)
    do update set viewed_at = excluded.viewed_at, topic_slug = excluded.topic_slug
  `;
  return { ok: true, persisted: true };
}

export async function clearViewedArticle(articleId: string) {
  const sql = sqlClient();
  if (!sql) return { ok: true, persisted: false };
  await sql`
    delete from article_views
    where viewer_key = 'owner' and article_id = ${articleId}
  `;
  return { ok: true, persisted: true };
}

export async function viewedArchive(query = ""): Promise<TopicArticle[]> {
  const sql = sqlClient();
  if (!sql) return [];
  const normalized = query.trim();
  const rows = normalized
    ? await sql`
        select a.id, a.title, a.summary, a.why_it_matters, a.limitation,
          a.source, a.url, a.published_at::text, a.reviewed_at::text,
          a.evidence, a.tags, a.evergreen, a.automated, a.canonical_key,
          v.viewed_at::text
        from article_views v
        join articles a on a.id = v.article_id
        where v.viewer_key = 'owner'
          and (
            a.title ilike ${`%${normalized}%`}
            or a.summary ilike ${`%${normalized}%`}
            or a.source ilike ${`%${normalized}%`}
          )
        order by v.viewed_at desc
        limit 200
      `
    : await sql`
        select a.id, a.title, a.summary, a.why_it_matters, a.limitation,
          a.source, a.url, a.published_at::text, a.reviewed_at::text,
          a.evidence, a.tags, a.evergreen, a.automated, a.canonical_key,
          v.viewed_at::text
        from article_views v
        join articles a on a.id = v.article_id
        where v.viewer_key = 'owner'
        order by v.viewed_at desc
        limit 200
      `;
  return (rows as DbArticleRow[]).map(articleFromRow);
}
