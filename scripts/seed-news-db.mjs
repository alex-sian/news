import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const today = new Date().toISOString().slice(0, 10);

const topicSql = neon(process.env.DATABASE_URL ?? "");

const raTopic = {
  id: "topic-ra-news",
  slug: "ra-news",
  title: "RA News",
  deck:
    "Rheumatoid arthritis research, treatment updates, and practical ways to feel better, ranked by evidence and stripped of hype.",
  purpose: "personal health research",
  geography: ["Hawaii", "United States"],
  refreshHours: 6,
  categories: [
    "Latest",
    "Best & evergreen",
    "Newly diagnosed",
    "Relief without prescriptions",
    "Exercise & mobility",
    "Diet & supplements",
    "THC, CBD & cannabis",
    "Homeopathy",
    "Methotrexate",
    "Prednisone",
    "Enbrel & TNF inhibitors",
    "Latent TB & infections",
    "Trials & emerging treatments",
    "Safety, vaccines & monitoring",
    "Guidelines",
  ],
  sourcePolicy: {
    prefer: ["guidelines", "regulators", "systematic reviews", "clinical trial registries"],
    caution: ["preclinical-only claims", "retracted studies", "commercial supplement claims"],
  },
  publicPath: "/ra-news",
};

const solidTopic = {
  id: "topic-solid-state-batteries",
  slug: "solid-state-batteries",
  title: "Solid State Batteries",
  deck:
    "A research desk for battery chemistry, manufacturability, automaker promises, supplier reality, safety claims, and timelines that deserve skepticism.",
  purpose: "personal technology and market understanding",
  geography: ["United States", "Japan", "South Korea", "China", "European Union"],
  refreshHours: 6,
  categories: [
    "Latest",
    "Best & evergreen",
    "Technology basics",
    "Manufacturing & scale-up",
    "Automakers",
    "Startups & suppliers",
    "Safety",
    "Materials & supply chain",
    "Timelines & skepticism",
    "Research papers",
    "Patents & IP",
    "Policy & funding",
  ],
  sourcePolicy: {
    prefer: [
      "national labs and government programs",
      "peer-reviewed research",
      "standards bodies",
      "automaker primary announcements",
      "supplier filings and technical releases",
    ],
    caution: [
      "commercial range claims without pack-level details",
      "single-cell lab breakthroughs presented as production-ready",
      "timelines that omit yield, cost, or cycle-life tradeoffs",
    ],
  },
  publicPath: "/topics/solid-state-batteries",
};

const solidArticles = [
  {
    id: "ssb-doe-vehicle-technologies",
    title: "Vehicle Technologies Office battery research overview",
    summary:
      "The U.S. Department of Energy frames advanced battery work around cost, performance, charging, safety, and domestic manufacturing.",
    whyItMatters:
      "It is a sober baseline for judging claims about solid-state batteries against the public goals funders and labs are actually targeting.",
    limitation: "Program overviews are broad. They do not validate a specific company timeline or chemistry.",
    source: "U.S. Department of Energy",
    url: "https://www.energy.gov/eere/vehicles/batteries",
    publishedAt: "2026-01-01",
    reviewedAt: today,
    evidence: "Government",
    tags: ["Best & evergreen", "Policy & funding", "Technology basics"],
    evergreen: true,
  },
  {
    id: "ssb-toyota-progress",
    title: "Toyota outlines solid-state battery commercialization work",
    summary:
      "Toyota has repeatedly presented solid-state batteries as part of its next-generation EV roadmap, with production timing tied to technical and manufacturing progress.",
    whyItMatters:
      "Automaker roadmaps matter because they signal procurement, validation, and product integration plans beyond a lab cell.",
    limitation: "Company timelines are strategic communications. Watch for pack-level specs, warranty terms, yield, and volume.",
    source: "Toyota",
    url: "https://global.toyota/en/newsroom/corporate/39526684.html",
    publishedAt: "2023-06-13",
    reviewedAt: today,
    evidence: "Company claim",
    tags: ["Automakers", "Timelines & skepticism", "Manufacturing & scale-up"],
    evergreen: true,
  },
  {
    id: "ssb-quantumscape-platform",
    title: "QuantumScape technical platform and shareholder materials",
    summary:
      "QuantumScape publishes technical updates and investor materials for its anode-free lithium-metal solid-state cell program.",
    whyItMatters:
      "It is one of the most watched public pure-play solid-state battery efforts, useful for tracking milestones and risk language.",
    limitation: "Investor-facing material can emphasize upside. Compare claims against independent testing, production scale, and customer validation.",
    source: "QuantumScape",
    url: "https://www.quantumscape.com/technology/",
    publishedAt: "2026-01-01",
    reviewedAt: today,
    evidence: "Company claim",
    tags: ["Startups & suppliers", "Technology basics", "Timelines & skepticism"],
    evergreen: true,
  },
];

function raEvidence(value) {
  if (value === "Regulator" || value === "Guideline") return "Primary source";
  if (value === "Systematic review") return "Review";
  if (value === "Clinical trial record") return "Primary source";
  if (value === "Patient guidance") return "Context";
  return "Research paper";
}

async function upsertTopic(topic) {
  await topicSql`
    insert into managed_topics (
      id, slug, title, deck, purpose, geography, refresh_hours,
      publish_mode, status, categories, source_policy, public_path
    )
    values (
      ${topic.id}, ${topic.slug}, ${topic.title}, ${topic.deck}, ${topic.purpose},
      ${topic.geography}, ${topic.refreshHours}, 'auto-with-labels', 'active',
      ${topic.categories}, ${JSON.stringify(topic.sourcePolicy)}::jsonb, ${topic.publicPath}
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
      public_path = excluded.public_path,
      updated_at = now()
  `;
}

async function upsertArticle(topicId, article) {
  await topicSql`
    insert into articles (
      id, title, summary, why_it_matters, limitation, source, url,
      published_at, reviewed_at, evidence, tags, evergreen, automated, canonical_key
    )
    values (
      ${article.id}, ${article.title}, ${article.summary}, ${article.whyItMatters},
      ${article.limitation}, ${article.source}, ${article.url}, ${article.publishedAt},
      ${article.reviewedAt ?? today}, ${article.evidence}, ${article.tags ?? []},
      ${Boolean(article.evergreen)}, ${Boolean(article.automated)}, ${article.canonicalKey ?? article.doi ?? article.pmid ?? article.trialId ?? article.url}
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
  await topicSql`
    insert into topic_articles (topic_id, article_id, status)
    values (${topicId}, ${article.id}, 'published')
    on conflict (topic_id, article_id) do nothing
  `;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  await upsertTopic(raTopic);
  await upsertTopic(solidTopic);

  const raJson = JSON.parse(await readFile(path.join(root, "data", "ra-news.json"), "utf8"));
  for (const article of raJson) {
    await upsertArticle(raTopic.id, {
      ...article,
      evidence: raEvidence(article.evidence),
      canonicalKey: article.doi ?? article.pmid ?? article.trialId ?? article.url,
    });
  }
  for (const article of solidArticles) {
    await upsertArticle(solidTopic.id, article);
  }
  console.log(`Seeded ${raJson.length} RA articles and ${solidArticles.length} solid-state battery articles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
