import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataPath = path.join(root, "data", "ra-news.json");
const maxDynamicItems = Number(process.env.RA_MAX_DYNAMIC_ITEMS ?? 60);
const today = new Date().toISOString().slice(0, 10);

const categoryRules = [
  ["Methotrexate", /\bmethotrexate\b|\bmtx\b/i],
  ["Prednisone", /\bprednisone\b|\bglucocorticoid/i],
  ["Enbrel & TNF inhibitors", /\betanercept\b|\benbrel\b|\btnf\b/i],
  ["Latent TB & infections", /\btuberculosis\b|\blatent tb\b|\binfection/i],
  ["THC, CBD & cannabis", /\bcannabis\b|\bcannabinoid\b|\bcbd\b|\bthc\b/i],
  ["Homeopathy", /\bhomeopath/i],
  ["Diet & supplements", /\bdiet\b|\bnutrition\b|\bsupplement\b|\bomega-?3\b|\bvitamin\b/i],
  ["Exercise & mobility", /\bexercise\b|\bphysical activity\b|\brehabilitation\b|\bmobility\b/i],
  ["Safety, vaccines & monitoring", /\bsafety\b|\badverse\b|\bvaccin|\bmonitor/i],
  ["Newly diagnosed", /\bearly rheumatoid\b|\bnewly diagnosed\b|\bdmard.naive\b/i],
];

function clean(value = "") {
  return String(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function stableId(prefix, value) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function normalizeTitle(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\b(a|an|the|study|trial|review)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagsFor(title, publicationTypes = []) {
  const text = `${title} ${publicationTypes.join(" ")}`;
  const tags = categoryRules
    .filter(([, pattern]) => pattern.test(text))
    .map(([tag]) => tag);
  if (/trial|phase\s+[123]|randomized/i.test(text)) {
    tags.push("Trials & emerging treatments");
  }
  if (/guideline|recommendation|consensus/i.test(text)) tags.push("Guidelines");
  if (
    tags.some((tag) =>
      ["Exercise & mobility", "Diet & supplements", "THC, CBD & cannabis", "Homeopathy"].includes(tag),
    )
  ) {
    tags.push("Relief without prescriptions");
  }
  return [...new Set(tags.length ? tags : ["Trials & emerging treatments"])];
}

function evidenceFor(types = [], title = "") {
  const text = `${types.join(" ")} ${title}`;
  if (/retraction|retracted publication/i.test(text)) return "Retraction notice";
  if (/guideline|practice guideline|recommendation/i.test(text)) return "Guideline";
  if (/meta-analysis|systematic review/i.test(text)) return "Systematic review";
  if (/randomized controlled trial|randomised controlled trial/i.test(text)) return "Randomized trial";
  if (/observational|cohort|case-control/i.test(text)) return "Observational study";
  if (
    /\bin vitro\b|\bin vivo\b|\bcell[s]?\b|\bmice\b|\bmouse\b|\brat[s]?\b|molecular|signaling|pathway|network pharmacology/i.test(
      text,
    )
  ) {
    return "Preclinical study";
  }
  return "Evidence review";
}

function findDoi(ids = []) {
  const doi = ids.find((item) => item.idtype === "doi");
  return doi?.value;
}

function dateFromSummary(summary) {
  const raw = summary.sortpubdate || summary.pubdate || today;
  const match = String(raw).match(/(\d{4})(?:[ /-](\d{1,2}|[A-Za-z]{3}))?(?:[ /-](\d{1,2}))?/);
  if (!match) return today;
  const months = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
    Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
  };
  const month = months[match[2]] ?? String(match[2] || "01").padStart(2, "0");
  const normalized = `${match[1]}-${month}-${String(match[3] || "01").padStart(2, "0")}`;
  return normalized > today ? today : normalized;
}

async function pubmedArticles() {
  const query =
    '("rheumatoid arthritis"[Title/Abstract]) AND ("last 45 days"[Date - Publication]) AND (english[Language])';
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.search = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmode: "json",
    retmax: "35",
    sort: "pub date",
  });
  const searchResponse = await fetch(searchUrl, {
    headers: { "User-Agent": "RA-News/1.0 (personal research project)" },
  });
  if (!searchResponse.ok) throw new Error(`PubMed search failed: ${searchResponse.status}`);
  const search = await searchResponse.json();
  const ids = search.esearchresult?.idlist ?? [];
  if (!ids.length) return [];

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.search = new URLSearchParams({
    db: "pubmed",
    id: ids.join(","),
    retmode: "json",
    version: "2.0",
  });
  const summaryResponse = await fetch(summaryUrl, {
    headers: { "User-Agent": "RA-News/1.0 (personal research project)" },
  });
  if (!summaryResponse.ok) throw new Error(`PubMed summary failed: ${summaryResponse.status}`);
  const payload = await summaryResponse.json();

  return ids
    .map((pmid) => payload.result?.[pmid])
    .filter(Boolean)
    .filter((item) => clean(item.title).length > 20)
    .map((item) => {
      const title = clean(item.title);
      const types = item.pubtype ?? [];
      const evidence = evidenceFor(types, title);
      const journal = clean(item.fulljournalname || item.source || "PubMed");
      const doi = findDoi(item.articleids);
      return {
        id: `pubmed-${item.uid}`,
        title,
        summary:
          evidence === "Retraction notice"
            ? "A formal notice that a previously published rheumatoid arthritis paper has been retracted. The original findings should not be relied upon."
            : `${evidence === "Evidence review" ? "A peer-reviewed publication" : `A ${evidence.toLowerCase()}`} examining rheumatoid arthritis, indexed by the U.S. National Library of Medicine.`,
        whyItMatters:
          "This is newly indexed primary literature. Use the abstract and full paper to judge the population, intervention, outcomes, and applicability.",
        limitation:
          evidence === "Preclinical study"
            ? "Laboratory or animal findings are early-stage evidence and often do not translate into a safe or effective human treatment."
            : evidence === "Retraction notice"
              ? "Retraction reasons vary, but the withdrawn results should not be used to guide care or treated as valid evidence."
              : "Automatic collection confirms indexing and article type, not that the finding should change treatment. The publisher may restrict full-text access.",
        source: `${journal} / PubMed`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
        publishedAt: dateFromSummary(item),
        reviewedAt: today,
        evidence,
        tags: tagsFor(title, types),
        ...(doi ? { doi } : {}),
        pmid: String(item.uid),
        automated: true,
      };
    });
}

async function clinicalTrialsArticles() {
  const url = new URL("https://clinicaltrials.gov/api/v2/studies");
  url.search = new URLSearchParams({
    "query.cond": "Rheumatoid Arthritis",
    "filter.overallStatus": "RECRUITING|NOT_YET_RECRUITING|ACTIVE_NOT_RECRUITING",
    format: "json",
    pageSize: "20",
    sort: "LastUpdatePostDate:desc",
    fields:
      "NCTId,BriefTitle,OverallStatus,Phase,StudyType,InterventionName,LastUpdatePostDate,LeadSponsorName",
  });
  const response = await fetch(url, {
    headers: { "User-Agent": "RA-News/1.0 (personal research project)" },
  });
  if (!response.ok) throw new Error(`ClinicalTrials.gov request failed: ${response.status}`);
  const payload = await response.json();
  return (payload.studies ?? []).slice(0, 12).map((study) => {
    const protocol = study.protocolSection ?? {};
    const id = protocol.identificationModule?.nctId;
    const title = clean(protocol.identificationModule?.briefTitle);
    const design = protocol.designModule ?? {};
    const sponsor = clean(protocol.sponsorCollaboratorsModule?.leadSponsor?.name);
    const interventions = (protocol.armsInterventionsModule?.interventions ?? [])
      .map((item) => clean(item.name))
      .filter(Boolean)
      .slice(0, 3);
    const updated = study.derivedSection?.miscInfoModule?.lastUpdatePostDateStruct?.date ?? today;
    const phase = (design.phases ?? []).join(", ").replaceAll("_", " ");
    return {
      id: `trial-${id}`,
      title,
      summary: `${phase ? `${phase} ` : ""}clinical trial${interventions.length ? ` studying ${interventions.join(", ")}` : ""}. Status: ${(protocol.statusModule?.overallStatus ?? "active").replaceAll("_", " ").toLowerCase()}.`,
      whyItMatters:
        "The registry shows what researchers are testing now and provides official eligibility, locations, endpoints, and sponsor details.",
      limitation:
        "A trial listing is not evidence that an intervention works. Results may be years away, negative, or never published.",
      source: `${sponsor || "Study sponsor"} / ClinicalTrials.gov`,
      url: `https://clinicaltrials.gov/study/${id}`,
      publishedAt: updated,
      reviewedAt: today,
      evidence: "Clinical trial record",
      tags: tagsFor(`${title} ${interventions.join(" ")}`, ["clinical trial"]),
      trialId: id,
      automated: true,
    };
  }).filter((item) => item.trialId && item.title);
}

function dedupe(items) {
  const seen = new Set();
  const titleKeys = [];
  return items.filter((item) => {
    const identity = item.doi?.toLowerCase() || item.pmid || item.trialId || item.url;
    if (seen.has(identity)) return false;
    const normalized = normalizeTitle(item.title);
    const tokens = new Set(normalized.split(" ").filter((token) => token.length > 3));
    const nearDuplicate = titleKeys.some((prior) => {
      const overlap = [...tokens].filter((token) => prior.has(token)).length;
      return overlap >= 6 && overlap / Math.min(tokens.size || 1, prior.size || 1) >= 0.75;
    });
    if (nearDuplicate) return false;
    seen.add(identity);
    titleKeys.push(tokens);
    return true;
  });
}

async function main() {
  const current = JSON.parse(await readFile(dataPath, "utf8"));
  const curated = current.filter((article) => !article.automated);
  const results = await Promise.allSettled([pubmedArticles(), clinicalTrialsArticles()]);
  const failures = results.filter((result) => result.status === "rejected");
  failures.forEach((failure) => console.warn(failure.reason?.message ?? failure.reason));
  if (failures.length === results.length) {
    throw new Error("Every RA source failed; preserving the last known-good dataset.");
  }
  const dynamic = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  const combined = dedupe([...curated, ...dynamic])
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  const curatedIds = new Set(curated.map((article) => article.id));
  const bounded = [
    ...combined.filter((article) => curatedIds.has(article.id)),
    ...combined.filter((article) => !curatedIds.has(article.id)).slice(0, maxDynamicItems),
  ].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
  await writeFile(dataPath, `${JSON.stringify(bounded, null, 2)}\n`, "utf8");
  console.log(`RA News refreshed: ${curated.length} curated + ${bounded.length - curated.length} automated articles.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
