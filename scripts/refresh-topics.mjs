import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const today = new Date().toISOString().slice(0, 10);
const maxPerTopic = Number(process.env.TOPIC_REFRESH_LIMIT ?? 24);
const mavsTopicLimit = Number(process.env.MAVERICKS_REFRESH_LIMIT ?? Math.max(maxPerTopic, 36));
const mavsTextPattern =
  /\bdallas\b|\bmavericks\b|\bmavs\b|\bluka\b|\bkyrie\b|\banthony davis\b|\bcooper flagg\b|\bnba draft\b|\btrade\b|\broster\b|\bcontract\b|\bfree agency\b/i;

const mavsRssSources = [
  {
    url: "https://www.mavs.com/feed/",
    source: "Dallas Mavericks",
    evidence: "Primary source",
    purpose: "Official team announcements, game coverage, community items, and organization framing.",
  },
  {
    url: "https://sports.yahoo.com/nba/teams/dallas/rss.xml",
    source: "Yahoo Sports",
    evidence: "News report",
    purpose: "Syndicated and national Mavericks headlines with scores, schedule, roster, and rumor context.",
  },
  {
    url: "https://www.mavsmoneyball.com/rss/index.xml",
    source: "Mavs Moneyball",
    evidence: "Trade coverage",
    purpose: "Team-specific fan and analysis coverage that often catches the argument around the news quickly.",
  },
  {
    url: "https://thesmokingcuban.com/feed/",
    source: "The Smoking Cuban",
    evidence: "Trade coverage",
    purpose: "Commentary-heavy Mavericks rumor reaction and fan-facing roster speculation.",
  },
  {
    url: "https://www.hoopsrumors.com/dallas-mavericks/feed",
    source: "Hoops Rumors",
    evidence: "Trade coverage",
    purpose: "Transaction and rumor monitoring from a leaguewide roster-movement site.",
  },
  {
    url: "https://www.si.com/nba/mavericks/.rss/full/",
    source: "Sports Illustrated Mavericks",
    evidence: "News report",
    purpose: "Additional team-specific news, analysis, and video-adjacent coverage.",
  },
];

const mavsYoutubeSources = [
  {
    url: "https://www.youtube.com/@dallasmavericks",
    source: "Dallas Mavericks YouTube",
    evidence: "Primary source",
    purpose: "Official video, interviews, highlights, and team-produced media.",
  },
];

function clean(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
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

function dateFromUnknown(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return today;
  return date.toISOString().slice(0, 10);
}

function articleTime(article) {
  const time = new Date(article.publishedAt).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function rssField(item, field) {
  const match = item.match(new RegExp(`<${field}[^>]*>([\\s\\S]*?)<\\/${field}>`, "i"));
  return clean(match?.[1] ?? "");
}

function xmlAttribute(item, tag, attr) {
  const match = item.match(new RegExp(`<${tag}\\b[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return clean(match?.[1] ?? "");
}

function sourceSlug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

function sportsTagsFor(article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const tags = ["Latest"];
  if (article.evidence === "Primary source") {
    tags.push("Official team news");
  }
  if (/injur|ankle|knee|hamstring|illness|questionable|probable|out\b/i.test(text)) {
    tags.push("Roster & injuries");
  }
  if (/trade|sign|waive|contract|extension|free agent|transaction/i.test(text)) {
    tags.push("Trades & roster", "Transactions");
  }
  if (/score|schedule|standings|playoff|final|win|loss|recap|highlights?/i.test(text)) {
    tags.push("Scores & games", "Schedule & results");
  }
  if (/stat|rating|rank|efficiency|points|rebounds|assists/i.test(text)) {
    tags.push("Stats");
  }
  if (/analysis|why|how|grade|takeaway|preview/i.test(text)) {
    tags.push("Analysis");
  }
  if (/youtube\.com|youtu\.be|video|watch|interview|media day|podcast|highlights?/i.test(`${article.url} ${text}`)) {
    tags.push("Video");
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

async function espnMavericksArticles() {
  const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news";
  const response = await fetch(url, {
    headers: { "User-Agent": "MarketBriefTopicRefresh/1.0 (personal research project)" },
  });
  if (!response.ok) throw new Error(`ESPN NBA news failed: ${response.status}`);
  const payload = await response.json();
  return (payload.articles ?? [])
    .map((item) => {
      const title = clean(item.headline);
      const summary = clean(item.description);
      const categoryText = (item.categories ?? [])
        .map((category) => clean(category.description ?? category.text ?? category.type))
        .join(" ");
      const text = `${title} ${summary} ${categoryText}`.toLowerCase();
      if (!mavsTextPattern.test(text)) {
        return null;
      }
      const url =
        item.links?.web?.href ??
        item.link?.href ??
        `https://www.espn.com/nba/story/_/id/${item.id}`;
      const article = {
        id: stableId("espn", String(item.id ?? url ?? title)),
        title,
        summary:
          summary ||
          "Current Mavericks-related coverage from ESPN's NBA news feed.",
        whyItMatters:
          "This adds current, non-official coverage so the team topic is more useful than a list of reference links.",
        limitation:
          "ESPN is a broad sports-news source. Treat rumors, anonymous sourcing, and opinion as weaker than official team or league confirmation.",
        source: "ESPN NBA",
        url,
        publishedAt: String(item.published ?? item.lastModified ?? today).slice(0, 10),
        evidence: "News report",
      };
      return {
        ...article,
        tags: sportsTagsFor(article),
        canonicalKey: url,
      };
    })
    .filter(Boolean)
    .sort((left, right) => articleTime(right) - articleTime(left))
    .slice(0, maxPerTopic);
}

function parseRssArticles(xml, source, feedUrl, evidence = "News report") {
  const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item) => {
      const title = rssField(item, "title");
      const summary = rssField(item, "description") || `Recent Dallas Mavericks coverage from ${source}.`;
      const url = rssField(item, "link") || feedUrl;
      const text = `${title} ${summary}`.toLowerCase();
      if (!mavsTextPattern.test(text)) {
        return null;
      }
      const article = {
        id: stableId(sourceSlug(source), url || title),
        title,
        summary: summary.slice(0, 360),
        whyItMatters:
          source === "Dallas Mavericks"
            ? "This keeps the topic anchored to the team's latest official announcements and game coverage."
            : source === "Mavs Moneyball" || source === "The Smoking Cuban"
              ? "This adds team-specific independent coverage and fan-facing analysis beyond official Mavericks and league pages."
              : "This adds current Mavericks coverage from a non-official source.",
        limitation:
          evidence === "Trade coverage"
            ? "This feed can include opinion, speculation, and rumor reaction. Use it for signal, then look for confirmation."
            : "Automatically collected sports coverage can repeat wire stories and should be deduped against other sources.",
        source,
        url,
        publishedAt: dateFromUnknown(rssField(item, "pubDate") || rssField(item, "dc:date")),
        evidence,
      };
      return {
        ...article,
        tags: sportsTagsFor(article),
        canonicalKey: url,
      };
    })
    .filter(Boolean);
}

async function rssFeedArticles({ url, source, evidence }) {
  const response = await fetch(url, {
    headers: { "User-Agent": "MarketBriefTopicRefresh/1.0 (personal research project)" },
  });
  if (!response.ok) throw new Error(`${source} RSS failed: ${response.status}`);
  return parseRssArticles(await response.text(), source, url, evidence);
}

function parseYoutubeArticles(xml, source, feedUrl, evidence = "News report") {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return entries
    .map((entry) => {
      const title = rssField(entry, "title");
      const summary = rssField(entry, "media:description") || rssField(entry, "summary") || `Recent Mavericks video from ${source}.`;
      const url = xmlAttribute(entry, "link", "href") || feedUrl;
      const article = {
        id: stableId(sourceSlug(source), rssField(entry, "yt:videoId") || url || title),
        title,
        summary: summary.slice(0, 360),
        whyItMatters:
          source === "Dallas Mavericks YouTube"
            ? "This adds official video, interviews, highlights, and team-produced context alongside written coverage."
            : "This adds Mavericks video coverage that can surface interviews, film context, and fan discussion faster than articles.",
        limitation:
          "Video feeds are collected by publish time. Watch for title-driven hype, sponsor reads, and clips that need confirmation from reporting.",
        source,
        url,
        publishedAt: dateFromUnknown(rssField(entry, "published") || rssField(entry, "updated")),
        evidence,
      };
      return {
        ...article,
        tags: sportsTagsFor(article),
        canonicalKey: url,
      };
    })
    .filter((article) => article.title && article.url);
}

async function youtubeFeedArticles({ url, source, evidence }) {
  const channelResponse = await fetch(url, {
    headers: { "User-Agent": "MarketBriefTopicRefresh/1.0 (personal research project)" },
  });
  if (!channelResponse.ok) throw new Error(`${source} channel failed: ${channelResponse.status}`);
  const channelHtml = await channelResponse.text();
  const feedUrl =
    channelHtml.match(/https:\/\/www\.youtube\.com\/feeds\/videos\.xml\?channel_id=[A-Za-z0-9_-]+/)?.[0]?.replace(/&amp;/g, "&") ??
    channelHtml.match(/"channelId":"(UC[A-Za-z0-9_-]+)"/)?.[1]?.replace(
      /^/,
      "https://www.youtube.com/feeds/videos.xml?channel_id=",
    );
  if (!feedUrl) throw new Error(`${source} YouTube feed not found`);
  const feedResponse = await fetch(feedUrl, {
    headers: { "User-Agent": "MarketBriefTopicRefresh/1.0 (personal research project)" },
  });
  if (!feedResponse.ok) throw new Error(`${source} YouTube RSS failed: ${feedResponse.status}`);
  return parseYoutubeArticles(await feedResponse.text(), source, feedUrl, evidence);
}

async function dallasMavericksArticles() {
  const settled = await Promise.allSettled([
    espnMavericksArticles(),
    ...mavsRssSources.map((source) => rssFeedArticles(source)),
    ...mavsYoutubeSources.map((source) => youtubeFeedArticles(source)),
  ]);
  const articles = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const seen = new Set();
  return articles
    .filter((article) => {
      const key = article.canonicalKey ?? article.url ?? article.title;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const dateOrder = articleTime(right) - articleTime(left);
      if (dateOrder !== 0) return dateOrder;
      return left.title.localeCompare(right.title);
    })
    .slice(0, mavsTopicLimit);
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
    const articles =
      topic.slug === "dallas-mavericks"
        ? await dallasMavericksArticles()
        : await crossrefForTopic(topic);
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
