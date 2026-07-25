import { createHash } from "node:crypto";
import type { TopicSearchResult } from "./topics";
import { normalizeTopicTitle, slugify } from "./topics";

function clean(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function stableId(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function dateFromParts(parts?: { "date-parts"?: number[][] }) {
  const [year, month = 1, day = 1] = parts?.["date-parts"]?.[0] ?? [];
  if (!year) return new Date().toISOString().slice(0, 10);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function suggestedTags(title: string, query: string) {
  const text = `${title} ${query}`.toLowerCase();
  const tags = ["Latest"];
  if (/review|overview|state of/i.test(text)) tags.push("Best & evergreen");
  if (/manufactur|scal|factory|production|pilot/i.test(text)) tags.push("Manufacturing & scale-up");
  if (/toyota|bmw|mercedes|honda|nissan|hyundai|volkswagen|ford|gm/i.test(text)) {
    tags.push("Automakers");
  }
  if (/safety|thermal|dendrite|failure/i.test(text)) tags.push("Safety");
  if (/sulfide|oxide|lithium metal|electrolyte|anode/i.test(text)) tags.push("Materials & supply chain");
  if (/patent/i.test(text)) tags.push("Patents & IP");
  if (/solid.state|battery|batteries/i.test(text)) tags.push("Technology basics");
  return [...new Set(tags)];
}

function draftForQuery(query: string) {
  const draftTitle = normalizeTopicTitle(query);
  const slug = slugify(draftTitle);
  const sportsTeam =
    /\b(mavericks|nba|basketball|cowboys|rangers|stars|fc dallas|wings)\b/i.test(query);

  if (sportsTeam) {
    return {
      title: draftTitle,
      slug,
      purpose: "personal sports/team monitoring",
      geography: ["Dallas", "Texas", "United States"],
      categories: [
        "Latest",
        "Best & evergreen",
        "Official team news",
        "Roster & injuries",
        "Schedule & results",
        "Transactions",
        "Analysis",
        "Stats",
      ],
      prefer: [
        "official team sources",
        "league sources",
        "box score and schedule data",
        "credible beat reporting",
        "statistics references",
      ],
      caution: [
        "trade rumors without named reporting",
        "engagement-bait fan speculation",
        "thin rewrites of official announcements",
      ],
    };
  }

  return {
    title: draftTitle,
    slug,
    purpose: "personal research and monitoring",
    geography: ["United States"],
    categories: [
      "Latest",
      "Best & evergreen",
      "Technology basics",
      "Manufacturing & scale-up",
      "Safety",
      "Research papers",
      "Timelines & skepticism",
    ],
    prefer: ["primary sources", "government sources", "peer-reviewed research", "credible trade coverage"],
    caution: ["company claims without independent validation", "content farms", "thin recaps of press releases"],
  };
}

export async function searchTopicCandidates(query: string): Promise<TopicSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];

  const url = new URL("https://api.crossref.org/works");
  url.search = new URLSearchParams({
    query: normalized,
    rows: "10",
    sort: "published",
    order: "desc",
    filter: "type:journal-article,type:proceedings-article,type:report",
  }).toString();

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "MarketBriefTopicSearch/1.0 (personal research project)",
      },
      next: { revalidate: 3600 },
    });
    if (!response.ok) throw new Error(`Crossref failed ${response.status}`);
    const payload = await response.json();
    const topicDraft = draftForQuery(normalized);
    return (payload.message?.items ?? [])
      .map((item: {
        title?: string[];
        abstract?: string;
        DOI?: string;
        URL?: string;
        publisher?: string;
        published?: { "date-parts"?: number[][] };
        "container-title"?: string[];
      }) => {
        const title = clean(item.title?.[0]);
        if (!title) return null;
        const source = clean(item["container-title"]?.[0] ?? item.publisher ?? "Crossref");
        const tags = suggestedTags(title, normalized);
        return {
          id: `crossref-${stableId(item.DOI ?? item.URL ?? title)}`,
          title,
          summary:
            clean(item.abstract).slice(0, 360) ||
            "A scholarly or technical source found through Crossref. Use it as a candidate seed or as evidence that this topic has a research literature.",
          source,
          url: item.URL ?? (item.DOI ? `https://doi.org/${item.DOI}` : "https://www.crossref.org/"),
          publishedAt: dateFromParts(item.published),
          evidence: title.toLowerCase().includes("review") ? "Review" : "Research paper",
          suggestedTags: tags,
          topicDraft,
        } satisfies TopicSearchResult;
      })
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    const topicDraft = draftForQuery(normalized);
    return [
      {
        id: `manual-${slugify(normalized)}`,
        title: topicDraft.title,
        summary:
          "Search could not reach the candidate-source API from this environment. You can still add the topic and let the scheduled collector populate it later.",
        source: "Manual topic draft",
        url: "#",
        publishedAt: new Date().toISOString().slice(0, 10),
        evidence: "Context",
        suggestedTags: ["Latest", "Best & evergreen"],
        topicDraft,
      },
    ];
  }
}
