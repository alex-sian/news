"use client";

import { useEffect, useMemo, useState } from "react";
import { RA_CATEGORIES, type RaArticle, type RaNewsPayload } from "@/lib/ra-news";
import { SiteHeader } from "./site-header";

const STORAGE_KEY = "market-brief:ra-news:read:v1";

const evidenceTone: Record<RaArticle["evidence"], string> = {
  Guideline: "strong",
  Regulator: "strong",
  "Systematic review": "strong",
  "Randomized trial": "moderate",
  "Observational study": "moderate",
  "Preclinical study": "early",
  "Retraction notice": "warning",
  "Clinical trial record": "early",
  "Patient guidance": "context",
  "Evidence review": "context",
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function ArticleCard({
  article,
  read,
  onRead,
}: {
  article: RaArticle;
  read: boolean;
  onRead: (id: string) => void;
}) {
  return (
    <article className={`ra-card ${read ? "is-read" : ""}`}>
      <div className="ra-card-topline">
        <span className={`evidence-badge ${evidenceTone[article.evidence]}`}>
          {article.evidence}
        </span>
        <span>{displayDate(article.publishedAt)}</span>
        {article.hawaii && <span className="hawaii-badge">Hawaiʻi</span>}
        {read && <span className="read-label">Read</span>}
      </div>
      <h2>
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => onRead(article.id)}
        >
          {article.title}
        </a>
      </h2>
      <p className="ra-summary">{article.summary}</p>
      <div className="ra-analysis">
        <p>
          <strong>Why it matters</strong>
          {article.whyItMatters}
        </p>
        <p>
          <strong>Keep in mind</strong>
          {article.limitation}
        </p>
      </div>
      <div className="ra-tags" aria-label="Article topics">
        {article.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <footer>
        <span>{article.source}</span>
        <a
          href={article.url}
          target="_blank"
          rel="noreferrer"
          onClick={() => onRead(article.id)}
        >
          Read original <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </article>
  );
}

export function RaNewsDesk({ initialData }: { initialData: RaNewsPayload }) {
  const [active, setActive] = useState("Latest");
  const [query, setQuery] = useState("");
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [hideRead, setHideRead] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      if (Array.isArray(stored)) setReadIds(new Set(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setReady(true);
  }, []);

  function markRead(id: string) {
    setReadIds((current) => {
      const next = new Set(current).add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function clearReadHistory() {
    setReadIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return initialData.articles
      .filter((article) => {
        if (hideRead && readIds.has(article.id)) return false;
        if (active === "Read") return readIds.has(article.id);
        if (active === "Unread") return !readIds.has(article.id);
        if (
          active === "Best & evergreen" &&
          !article.evergreen &&
          !article.tags.includes(active)
        ) {
          return false;
        }
        if (
          active !== "Latest" &&
          active !== "Best & evergreen" &&
          !article.tags.includes(active)
        ) {
          return false;
        }
        if (!normalizedQuery) return true;
        return [
          article.title,
          article.summary,
          article.whyItMatters,
          article.source,
          ...article.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (active === "Best & evergreen") {
          return Number(Boolean(right.evergreen)) - Number(Boolean(left.evergreen));
        }
        return right.publishedAt.localeCompare(left.publishedAt);
      });
  }, [active, hideRead, initialData.articles, query, readIds]);

  const unreadCount = initialData.articles.filter(
    (article) => !readIds.has(article.id),
  ).length;

  return (
    <>
      <SiteHeader />
      <main className="ra-shell">
        <section className="ra-masthead">
          <div>
            <p className="kicker">Research without the algorithmic sludge</p>
            <h1>RA News</h1>
            <p className="ra-deck">
              Rheumatoid arthritis research, treatment updates, and practical
              ways to feel better—ranked by evidence and stripped of hype.
            </p>
          </div>
          <aside className="ra-status" aria-label="Feed status">
            <span>Reviewed sources</span>
            <strong>{initialData.articles.length}</strong>
            <small>
              {ready ? `${Math.max(0, unreadCount)} unread` : "Loading history…"}
            </small>
          </aside>
        </section>

        <section className="ra-disclaimer">
          <strong>Context, not a treatment plan.</strong>
          <p>
            This page can help you ask better questions. It cannot account for
            your dose, labs, infections, or drug interactions. Do not start,
            stop, or change prescribed treatment from an article.
          </p>
        </section>

        <div className="ra-tools">
          <label className="ra-search">
            <span>Search this desk</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value) setActive("Latest");
              }}
              placeholder="Try Enbrel, exercise, CBD…"
            />
          </label>
          <label className="hide-read">
            <input
              type="checkbox"
              checked={hideRead}
              onChange={(event) => setHideRead(event.target.checked)}
            />
            Hide read
          </label>
        </div>

        <nav className="ra-nav" aria-label="RA news sections">
          {[...RA_CATEGORIES, "Unread", "Read"].map((category) => (
            <button
              type="button"
              className={active === category ? "active" : ""}
              onClick={() => setActive(category)}
              key={category}
            >
              {category}
            </button>
          ))}
        </nav>

        <section className="ra-results-heading">
          <div>
            <p className="kicker">{active === "Latest" ? "The full desk" : "Filtered view"}</p>
            <h2>{active}</h2>
          </div>
          <span>{visible.length} {visible.length === 1 ? "article" : "articles"}</span>
        </section>

        {visible.length ? (
          <div className="ra-grid">
            {visible.map((article) => (
              <ArticleCard
                article={article}
                read={readIds.has(article.id)}
                onRead={markRead}
                key={article.id}
              />
            ))}
          </div>
        ) : (
          <div className="ra-empty">
            <strong>Nothing matches this view.</strong>
            <p>Try another topic, show read articles, or clear the search.</p>
            <button
              type="button"
              onClick={() => {
                setActive("Latest");
                setQuery("");
                setHideRead(false);
              }}
            >
              Show everything
            </button>
          </div>
        )}

        {readIds.size > 0 && (
          <div className="ra-history">
            <span>Read history is stored only in this browser.</span>
            <button type="button" onClick={clearReadHistory}>
              Mark everything unread
            </button>
          </div>
        )}
      </main>
      <footer className="site-footer ra-footer">
        <span>RA News</span>
        <p>Evidence-ranked information, not medical advice.</p>
        <span>Sources refresh every six hours</span>
      </footer>
    </>
  );
}
