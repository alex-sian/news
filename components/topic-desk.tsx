"use client";

import { useMemo, useState } from "react";
import type { TopicArticle, TopicPayload } from "@/lib/topics";
import { SiteHeader } from "./site-header";

const evidenceTone: Record<TopicArticle["evidence"], string> = {
  "Primary source": "strong",
  Government: "strong",
  "Research paper": "moderate",
  Review: "strong",
  "Company claim": "early",
  "Trade coverage": "context",
  "News report": "context",
  Patent: "early",
  Context: "context",
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

function youtubeVideoId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.split("/").filter(Boolean)[0];
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

function sourceMark(source: string) {
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function sourceTone(source: string) {
  const key = source.toLowerCase();
  if (key.includes("mavericks") || key.includes("mavs")) return "team";
  if (key.includes("espn") || key.includes("yahoo")) return "news";
  if (key.includes("hoops") || key.includes("realgm") || key.includes("spotrac")) return "roster";
  if (key.includes("smoking") || key.includes("moneyball")) return "fan";
  return "default";
}

function TopicMedia({ article, linked = true }: { article: TopicArticle; linked?: boolean }) {
  const videoId = youtubeVideoId(article.url);
  const isVideo = Boolean(videoId);
  const content = (
    <>
      {videoId ? (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
          alt=""
          loading="lazy"
        />
      ) : (
        <span>{sourceMark(article.source)}</span>
      )}
      {isVideo && <b aria-hidden="true" />}
    </>
  );

  return linked ? (
    <a
      className={`topic-media ${isVideo ? "is-video" : ""} tone-${sourceTone(article.source)}`}
      href={article.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${article.title}`}
    >
      {content}
    </a>
  ) : (
    <span className={`topic-media ${isVideo ? "is-video" : ""} tone-${sourceTone(article.source)}`}>
      {content}
    </span>
  );
}

function TopicArticleCard({
  article,
  topicSlug,
  ownerTracking,
  read,
  onViewed,
  onUnread,
}: {
  article: TopicArticle;
  topicSlug: string;
  ownerTracking: boolean;
  read: boolean;
  onViewed: (id: string) => void;
  onUnread: (id: string) => void;
}) {
  async function markViewed() {
    onViewed(article.id);
    if (!ownerTracking) return;
    await fetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId: article.id, topicSlug, article }),
    });
  }

  async function markUnread() {
    onUnread(article.id);
    if (!ownerTracking) return;
    await fetch(`/api/views?articleId=${encodeURIComponent(article.id)}`, {
      method: "DELETE",
    });
  }

  return (
    <article className={`ra-card ${read ? "is-read" : ""}`}>
      <TopicMedia article={article} />
      <div className="ra-card-body">
        <div className="ra-card-topline">
          <span className={`evidence-badge ${evidenceTone[article.evidence]}`}>
            {article.evidence}
          </span>
          <span>{displayDate(article.publishedAt)}</span>
          {article.evergreen && <span className="hawaii-badge">Evergreen</span>}
          {read && <span className="read-label">Viewed</span>}
        </div>
        <h2>
          <a href={article.url} target="_blank" rel="noreferrer" onClick={markViewed}>
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
          <div className="topic-card-actions">
            {read && (
              <button type="button" onClick={markUnread}>
                Mark unread
              </button>
            )}
            <a href={article.url} target="_blank" rel="noreferrer" onClick={markViewed}>
              Read original <span aria-hidden="true">↗</span>
            </a>
          </div>
        </footer>
      </div>
    </article>
  );
}

export function TopicDesk({ initialData }: { initialData: TopicPayload }) {
  const isMavs = initialData.topic.slug === "dallas-mavericks";
  const [active, setActive] = useState("Latest");
  const [query, setQuery] = useState("");
  const [hideViewed, setHideViewed] = useState(false);
  const [viewedIds, setViewedIds] = useState(
    () =>
      new Set(
        initialData.articles
          .filter((article) => article.viewedAt)
          .map((article) => article.id),
      ),
  );

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return initialData.articles
      .filter((article) => {
        const viewed = viewedIds.has(article.id);
        if (hideViewed && viewed) return false;
        if (active === "Viewed") return viewed;
        if (active === "Unread") return !viewed;
        if (isMavs && active === "Latest" && article.evergreen && !normalizedQuery) {
          return false;
        }
        if (active === "References" && !article.evergreen) {
          return false;
        }
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
          article.evidence,
          ...article.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((left, right) => {
        if (active === "References") {
          return left.source.localeCompare(right.source);
        }
        if (active === "Best & evergreen") {
          return Number(Boolean(right.evergreen)) - Number(Boolean(left.evergreen));
        }
        return right.publishedAt.localeCompare(left.publishedAt);
      });
  }, [active, hideViewed, initialData.articles, isMavs, query, viewedIds]);

  const unreadCount = initialData.articles.length - viewedIds.size;
  const latestCount = initialData.articles.filter((article) => !article.evergreen).length;
  const tradeCount = initialData.articles.filter((article) =>
    article.tags.some((tag) => ["Trades & roster", "Transactions", "Roster & injuries"].includes(tag)),
  ).length;
  const videoCount = initialData.articles.filter((article) => article.tags.includes("Video")).length;
  const videoArticles = initialData.articles
    .filter((article) => article.tags.includes("Video") && youtubeVideoId(article.url))
    .slice(0, 3);

  return (
    <>
      <SiteHeader />
      <main className="ra-shell">
        <section className="ra-masthead topic-masthead">
          <div>
            <p className="kicker">Managed topic</p>
            <h1>{initialData.topic.title}</h1>
            <p className="ra-deck">{initialData.topic.deck}</p>
          </div>
          <aside className="ra-status" aria-label="Feed status">
            <span>Tracked sources</span>
            <strong>{initialData.articles.length}</strong>
            <small>{Math.max(0, unreadCount)} unread</small>
          </aside>
        </section>

        <section className="ra-disclaimer topic-context">
          <strong>{initialData.ownerTracking ? "Owner tracking on" : "Owner tracking off"}</strong>
          <p>
            {initialData.ownerTracking
              ? "Viewed articles are saved to Neon for your devices."
              : "Open Admin and enable owner tracking on this device to sync viewed history."}
          </p>
        </section>

        {isMavs && (
          <section className="topic-pulse" aria-label="Mavericks pulse summary">
            <button type="button" onClick={() => setActive("Latest")}>
              <span>Newest first</span>
              <strong>{latestCount}</strong>
              <small>dated items</small>
            </button>
            <button type="button" onClick={() => setActive("Trades & roster")}>
              <span>Roster pulse</span>
              <strong>{tradeCount}</strong>
              <small>trade, contract, injury</small>
            </button>
            <button type="button" onClick={() => setActive("Video")}>
              <span>Video lane</span>
              <strong>{videoCount}</strong>
              <small>highlights and interviews</small>
            </button>
          </section>
        )}

        {isMavs && videoArticles.length > 0 && (
          <section className="topic-video-strip" aria-label="Latest Mavericks videos">
            <div>
              <p className="kicker">Video</p>
              <h2>Latest Mavericks video</h2>
            </div>
            <div className="topic-video-list">
              {videoArticles.map((article) => (
                <a href={article.url} target="_blank" rel="noreferrer" key={article.id}>
                  <TopicMedia article={article} linked={false} />
                  <strong>{article.title}</strong>
                  <span>{article.source}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="ra-tools">
          <label className="ra-search">
            <span>Search this topic</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (event.target.value) setActive("Latest");
              }}
              placeholder={`Search ${initialData.topic.title.toLowerCase()}...`}
            />
          </label>
          <label className="hide-read">
            <input
              type="checkbox"
              checked={hideViewed}
              onChange={(event) => setHideViewed(event.target.checked)}
            />
            Hide viewed
          </label>
        </div>

        <nav className="ra-nav" aria-label={`${initialData.topic.title} sections`}>
          {[...initialData.topic.categories, "Unread", "Viewed"].map((category) => (
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
            <p className="kicker">
              {isMavs && active === "Latest"
                ? "Newest Mavericks pulse"
                : active === "References"
                  ? "Source shelf"
                  : active === "Latest"
                    ? "The full desk"
                    : "Filtered view"}
            </p>
            <h2>{active}</h2>
          </div>
          <span>{visible.length} {visible.length === 1 ? "article" : "articles"}</span>
        </section>

        {visible.length ? (
          <div className="ra-grid">
            {visible.map((article) => (
              <TopicArticleCard
                article={article}
                topicSlug={initialData.topic.slug}
                ownerTracking={initialData.ownerTracking}
                read={viewedIds.has(article.id)}
                onViewed={(id) =>
                  setViewedIds((current) => new Set(current).add(id))
                }
                onUnread={(id) =>
                  setViewedIds((current) => {
                    const next = new Set(current);
                    next.delete(id);
                    return next;
                  })
                }
                key={article.id}
              />
            ))}
          </div>
        ) : (
          <div className="ra-empty">
            <strong>
              {initialData.articles.length
                ? "Nothing matches this view."
                : "This topic is created, but has no articles yet."}
            </strong>
            <p>
              {initialData.articles.length
                ? "Try another section, show viewed articles, or clear the search."
                : "The next collection pass can add sources here. Until then, Admin still keeps the topic settings."}
            </p>
            <button
              type="button"
              onClick={() => {
                setActive("Latest");
                setQuery("");
                setHideViewed(false);
              }}
            >
              Show everything
            </button>
          </div>
        )}
      </main>
      <footer className="site-footer ra-footer">
        <span>{initialData.topic.title}</span>
        <p>Curated research memory, not algorithmic search sludge.</p>
        <span>Refresh target: every {initialData.topic.refreshHours} hours</span>
      </footer>
    </>
  );
}
