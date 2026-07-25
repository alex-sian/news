import articles from "@/data/ra-news.json";

export const RA_CATEGORIES = [
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
] as const;

export type RaCategory = (typeof RA_CATEGORIES)[number];

export type EvidenceLevel =
  | "Guideline"
  | "Regulator"
  | "Systematic review"
  | "Randomized trial"
  | "Observational study"
  | "Preclinical study"
  | "Retraction notice"
  | "Clinical trial record"
  | "Patient guidance"
  | "Evidence review";

export type RaArticle = {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  limitation: string;
  source: string;
  url: string;
  publishedAt: string;
  reviewedAt: string;
  evidence: EvidenceLevel;
  tags: string[];
  evergreen?: boolean;
  hawaii?: boolean;
  doi?: string;
  pmid?: string;
  trialId?: string;
};

export type RaNewsPayload = {
  generatedAt: string;
  articles: RaArticle[];
};

export function getRaNews(): RaNewsPayload {
  const typed = articles as RaArticle[];
  const generatedAt = typed.reduce(
    (latest, article) =>
      article.reviewedAt > latest ? article.reviewedAt : latest,
    "2026-01-01",
  );
  return { articles: typed, generatedAt };
}
