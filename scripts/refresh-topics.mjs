import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const today = new Date().toISOString().slice(0, 10);
const maxPerTopic = Number(process.env.TOPIC_REFRESH_LIMIT ?? 24);

function clean(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function dateFromParts(parts) {
  const [year, month = 1, day = 1] = parts?.["date-parts"]?.[0] ?? [];
  if (!year) return today;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function tagsFor(title, topicTitle, categories = []) {
  const text = `${title} ${topicTitle}`.toLowerCase();
  const tags = ["Latest"];
  for (const category of categories) {
    const key = category.toLowerCase();
    if (key === "latest") continue;
    if (key.includes("research") && /journal|study|review|electrolyte|lithium|battery/i.test(text)) tags.push(category);
    if (key.includes("manufacturing") && /manufactur|scale|factory|pilot|production/i.test(text)) tags.push(category);
    if (key.includes("automaker") && /toyota|bmw|honda|nissan|mercedes|hyundai|volkswagen|ford|gm/i.test(text)) tags.push(category);
    if (key.includes("safety") && /safe|dendrite|thermal|failure|separator/i.test(text)) tags.push(category);
    if (key.includes("material") && /sulfide|oxide|electrolyte|anode|cathode|lithium metal/i.test(text)) tags.push(category);
    if (key.includes("patent") && /patent/i.test(text)) tags.push(category);
    if (key.includes("technology") && /solid.state|battery|electrolyte|cell/i.test(text)) tags.push(category);
  }
  return [...new Set(tags)];
}

async function crossrefForTopic(topic) {
  const url = new URL("https://api.crossref.org/works");
  url.search = new URLSearchParams({
    query: topic.title,
    rows: String(maxPerTopic),
    sort: "published",
    order: "desc",
  });
  const response = await fetch(url, {
    headers: { "User-Agent": "MarketBriefTopicRefresh/1.0 (personal research project)" },
  });
  if (!response.ok) throw new Error(`Crossref failed for ${topic.slug}: ${response.status}`);
  const payload = await response.json();
  return (payload.message?.items ?? [])
    .map((item) => {
      const title = clean(item.title?.[0]);
      if (!title || !/solid.state|battery|batter/i.test(`${title} ${topic.title}`)) return null;
      const doi = item.DOI ? `https://doi.org/${item.DOI}` : null;
      return {
        id: stableId("topic", item.DOI ?? item.URL ?? title),
        title,
        summary:
          clean(item.abstract).slice(0, 360) ||
          "A scholarly or technical source collected for this managed topic. Open the original source to inspect methods, claims, and applicability.",
        whyItMatters:
          "This keeps the topic desk connected to the research and technical literature instead of only press coverage.",
        limitation:
          "Automatic collection checks topic fit and source metadata, not commercial readiness or independent validation.",
        source: clean(item["container-title"]?.[0] ?? item.publisher ?? "Crossref"),
        url: item.URL ?? doi ?? "https://www.crossref.org/",
        publishedAt: dateFromParts(item.published),
        evidence: title.toLowerCase().includes("review") ? "Review" : "Research paper",
        tags: tagsFor(title, topic.title, topic.categories),
        canonicalKey: doi ?? item.URL ?? title,
      };
    })
    .filter(Boolean);
}

async function upsertArticle(sql, topic, article) {
  await sql`
    insert into articles (
      id, title, summary, why_it_matters, limitation, source, url,
      published_at, reviewed_at, evidence, tags, evergreen, automated, canonical_key
    )
    values (
      ${article.id}, ${article.title}, ${article.summary}, ${article.whyItMatters},
      ${article.limitation}, ${article.source}, ${article.url}, ${article.publishedAt},
      ${today}, ${article.evidence}, ${article.tags}, false, true, ${article.canonicalKey}
    )
    on conflict (canonical_key)
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
      automated = true,
      updated_at = now()
    returning id
  `;
  const rows = await sql`select id from articles where canonical_key = ${article.canonicalKey} limit 1`;
  const articleId = rows[0]?.id ?? article.id;
  await sql`
    insert into topic_articles (topic_id, article_id, status)
    values (${topic.id}, ${articleId}, 'published')
    on conflict (topic_id, article_id) do nothing
  `;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  const sql = neon(process.env.DATABASE_URL);
  const topics = await sql`
    select id, slug, title, categories
    from managed_topics
    where status = 'active'
      and slug <> 'ra-news'
    order by slug
  `;

  let inserted = 0;
  for (const topic of topics) {
    const articles = await crossrefForTopic(topic);
    for (const article of articles) {
      await upsertArticle(sql, topic, article);
      inserted += 1;
    }
  }
  console.log(`Topic refresh complete: ${topics.length} topics, ${inserted} collected/updated articles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
