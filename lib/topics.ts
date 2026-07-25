export const TOPIC_CATEGORIES = [
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
] as const;

export type EvidenceLabel =
  | "Primary source"
  | "Government"
  | "Research paper"
  | "Review"
  | "Company claim"
  | "Trade coverage"
  | "News report"
  | "Patent"
  | "Context";

export type ManagedTopic = {
  id: string;
  slug: string;
  title: string;
  deck: string;
  purpose: string;
  geography: string[];
  refreshHours: number;
  publishMode: "auto-with-labels" | "review-first";
  status: "active" | "paused";
  categories: string[];
  sourcePolicy: {
    prefer: string[];
    caution: string[];
  };
  publicPath: string;
  createdAt: string;
  updatedAt: string;
};

export type TopicArticle = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  limitation: string;
  source: string;
  url: string;
  publishedAt: string;
  reviewedAt: string;
  evidence: EvidenceLabel;
  tags: string[];
  evergreen?: boolean;
  automated?: boolean;
  canonicalKey?: string;
  viewedAt?: string | null;
};

export type TopicPayload = {
  topic: ManagedTopic;
  articles: TopicArticle[];
  generatedAt: string;
  ownerTracking: boolean;
};

export type TopicSearchResult = {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  evidence: EvidenceLabel;
  suggestedTags: string[];
  topicDraft: {
    title: string;
    slug: string;
    purpose: string;
    geography: string[];
    categories: string[];
    prefer: string[];
    caution: string[];
  };
};

export const SOLID_STATE_BATTERIES_TOPIC: ManagedTopic = {
  id: "topic-solid-state-batteries",
  slug: "solid-state-batteries",
  title: "Solid State Batteries",
  deck:
    "A research desk for battery chemistry, manufacturability, automaker promises, supplier reality, safety claims, and timelines that deserve skepticism.",
  purpose: "personal technology and market understanding",
  geography: ["United States", "Japan", "South Korea", "China", "European Union"],
  refreshHours: 6,
  publishMode: "auto-with-labels",
  status: "active",
  categories: [...TOPIC_CATEGORIES],
  sourcePolicy: {
    prefer: [
      "national labs and government programs",
      "peer-reviewed research",
      "standards bodies",
      "automaker primary announcements",
      "supplier filings and technical releases",
      "credible battery trade publications",
    ],
    caution: [
      "commercial range claims without pack-level details",
      "single-cell lab breakthroughs presented as production-ready",
      "sponsored or affiliate product coverage",
      "timelines that omit yield, cost, or cycle-life tradeoffs",
    ],
  },
  publicPath: "/topics/solid-state-batteries",
  createdAt: "2026-07-25",
  updatedAt: "2026-07-25",
};

export const RA_MANAGED_TOPIC: ManagedTopic = {
  id: "topic-ra-news",
  slug: "ra-news",
  title: "RA News",
  deck:
    "Rheumatoid arthritis research, treatment updates, and practical ways to feel better, ranked by evidence and stripped of hype.",
  purpose: "personal health research",
  geography: ["Hawaii", "United States"],
  refreshHours: 6,
  publishMode: "auto-with-labels",
  status: "active",
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
    prefer: [
      "guidelines",
      "regulators",
      "systematic reviews",
      "clinical trial registries",
      "patient guidance from credible medical organizations",
    ],
    caution: [
      "preclinical-only claims",
      "retracted studies",
      "commercial supplement claims",
      "articles implying treatment changes without clinician context",
    ],
  },
  publicPath: "/ra-news",
  createdAt: "2026-07-25",
  updatedAt: "2026-07-25",
};

export const SOLID_STATE_BATTERY_SEEDS: TopicArticle[] = [
  {
    id: "ssb-doe-vehicle-technologies",
    title: "Vehicle Technologies Office battery research overview",
    summary:
      "The U.S. Department of Energy frames advanced battery work around cost, performance, charging, safety, and domestic manufacturing.",
    whyItMatters:
      "It is a sober baseline for judging claims about solid-state batteries against the public goals funders and labs are actually targeting.",
    limitation:
      "Program overviews are broad. They do not validate a specific company timeline or chemistry.",
    source: "U.S. Department of Energy",
    url: "https://www.energy.gov/eere/vehicles/batteries",
    publishedAt: "2026-01-01",
    reviewedAt: "2026-07-25",
    evidence: "Government",
    tags: ["Best & evergreen", "Policy & funding", "Technology basics"],
    evergreen: true,
  },
  {
    id: "ssb-argonne-solid-state",
    title: "Argonne solid-state battery research",
    summary:
      "Argonne describes solid-state work as a path toward safer, higher-energy cells while emphasizing materials interfaces and manufacturability.",
    whyItMatters:
      "National lab language is useful because it tends to show the hard parts: interfaces, dendrites, scale-up, and validation.",
    limitation:
      "Lab research can be years away from reliable mass production.",
    source: "Argonne National Laboratory",
    url: "https://www.anl.gov/topic/solidstate-batteries",
    publishedAt: "2026-01-01",
    reviewedAt: "2026-07-25",
    evidence: "Government",
    tags: ["Best & evergreen", "Research papers", "Manufacturing & scale-up"],
    evergreen: true,
  },
  {
    id: "ssb-toyota-progress",
    title: "Toyota outlines solid-state battery commercialization work",
    summary:
      "Toyota has repeatedly presented solid-state batteries as part of its next-generation EV roadmap, with production timing tied to technical and manufacturing progress.",
    whyItMatters:
      "Automaker roadmaps matter because they signal procurement, validation, and product integration plans beyond a lab cell.",
    limitation:
      "Company timelines are strategic communications. Watch for pack-level specs, warranty terms, yield, and volume.",
    source: "Toyota",
    url: "https://global.toyota/en/newsroom/corporate/39526684.html",
    publishedAt: "2023-06-13",
    reviewedAt: "2026-07-25",
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
    limitation:
      "Investor-facing material can emphasize upside. Compare claims against independent testing, production scale, and customer validation.",
    source: "QuantumScape",
    url: "https://www.quantumscape.com/technology/",
    publishedAt: "2026-01-01",
    reviewedAt: "2026-07-25",
    evidence: "Company claim",
    tags: ["Startups & suppliers", "Technology basics", "Timelines & skepticism"],
    evergreen: true,
  },
  {
    id: "ssb-nature-energy-review",
    title: "Solid-state lithium batteries: safety and energy-density tradeoffs",
    summary:
      "Review literature consistently treats solid-state batteries as promising but constrained by interface stability, processing, dendrite suppression, and cost.",
    whyItMatters:
      "A good review keeps the story balanced: solid electrolytes can help, but the system-level battery still has to survive real cycling and manufacturing.",
    limitation:
      "Reviews summarize a field that changes quickly and may not capture unpublished industrial progress.",
    source: "Nature Energy / review literature",
    url: "https://www.nature.com/subjects/solid-state-batteries",
    publishedAt: "2026-01-01",
    reviewedAt: "2026-07-25",
    evidence: "Review",
    tags: ["Best & evergreen", "Safety", "Research papers"],
    evergreen: true,
  },
  {
    id: "ssb-usabc-goals",
    title: "USABC battery goals and test procedures",
    summary:
      "The U.S. Advanced Battery Consortium publishes goals and testing context for advanced vehicle batteries.",
    whyItMatters:
      "Targets and test procedures help separate a flashy single metric from a battery that can satisfy vehicle requirements.",
    limitation:
      "Targets are not proof a specific solid-state product is ready.",
    source: "USABC",
    url: "https://uscar.org/usabc/",
    publishedAt: "2026-01-01",
    reviewedAt: "2026-07-25",
    evidence: "Primary source",
    tags: ["Best & evergreen", "Safety", "Manufacturing & scale-up"],
    evergreen: true,
  },
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeTopicTitle(value: string) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
