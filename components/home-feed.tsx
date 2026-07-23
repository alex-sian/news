"use client";

import { useCallback, useState } from "react";
import type { HomePayload } from "@/lib/alpaca";
import { FeedStory, HeroStory, CompactStory } from "./news-card";
import { MarketStrip } from "./market-strip";
import { SiteHeader } from "./site-header";
import { SymbolWorkspace } from "./symbol-workspace";

const filters = ["Top", "Latest", "Markets", "Technology", "Economy"];

const marketSymbols = new Set([
  "SPY",
  "DIA",
  "QQQ",
  "IWM",
  "VXX",
  "VIX",
  "TLT",
  "GLD",
  "USO",
  "XLF",
  "XLE",
  "XLK",
]);

const technologySymbols = new Set([
  "AAPL",
  "AMD",
  "AMZN",
  "AVGO",
  "GOOG",
  "GOOGL",
  "INTC",
  "META",
  "MSFT",
  "MU",
  "NFLX",
  "NVDA",
  "ORCL",
  "PLTR",
  "TSLA",
]);

const economyTerms = [
  "fed",
  "federal reserve",
  "inflation",
  "jobs",
  "payroll",
  "cpi",
  "gdp",
  "tariff",
  "treasury",
  "yield",
  "interest rate",
  "economy",
  "recession",
];

const marketTerms = [
  "market",
  "stocks",
  "shares",
  "futures",
  "wall street",
  "rally",
  "selloff",
  "s&p",
  "nasdaq",
  "dow",
  "volatility",
];

const technologyTerms = [
  "ai",
  "artificial intelligence",
  "chip",
  "semiconductor",
  "software",
  "cloud",
  "data center",
  "technology",
  "cyber",
];

function includesTopic(
  article: HomePayload["articles"][number],
  symbols: Set<string>,
  terms: string[],
) {
  const text = `${article.headline} ${article.summary}`.toLowerCase();
  return article.symbols.some((symbol) => symbols.has(symbol)) ||
    terms.some((term) => text.includes(term));
}

function filterArticles(
  articles: HomePayload["articles"],
  filter: string,
) {
  if (filter === "Top") return articles;
  if (filter === "Latest") {
    return [...articles].sort(
      (left, right) =>
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime(),
    );
  }
  if (filter === "Markets") {
    return articles.filter((article) =>
      includesTopic(article, marketSymbols, marketTerms),
    );
  }
  if (filter === "Technology") {
    return articles.filter((article) =>
      includesTopic(article, technologySymbols, technologyTerms),
    );
  }
  return articles.filter((article) =>
    includesTopic(article, new Set(), economyTerms),
  );
}

export function HomeFeed({ initialData }: { initialData: HomePayload }) {
  const [data, setData] = useState(initialData);
  const [active, setActive] = useState("Top");
  const [refreshing, setRefreshing] = useState(false);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/home", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as HomePayload);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const visibleArticles = filterArticles(data.articles, active);
  const [lead, ...rest] = visibleArticles;
  const topStories = rest.slice(0, 3);
  const latest = rest.slice(3);

  return (
    <>
      <SiteHeader />
      <MarketStrip markets={data.markets} />
      <main className={`page-shell ${symbol ? "has-workspace" : ""} ${expanded ? "workspace-expanded" : ""}`}>
        <div className="home-context">
        <section className="page-intro">
          <div>
            <p className="kicker">Your market, in focus</p>
            <h2>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}.</h2>
          </div>
          <div className="feed-status">
            <span className={data.isLive ? "live-dot" : "status-dot"} />
            {data.isLive ? "Live Alpaca feed" : data.message}
            <button type="button" onClick={refresh} disabled={refreshing}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </section>

        <nav className="topic-tabs" aria-label="News sections">
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              className={active === filter ? "active" : ""}
              onClick={() => setActive(filter)}
            >
              {filter}
            </button>
          ))}
        </nav>

        {lead && (
          <section className="lead-grid" aria-label="Top market stories">
            <HeroStory article={lead} onSymbol={setSymbol} />
            <div className="top-stories">
              <div className="section-heading">
                <div>
                  <p className="kicker">Developing</p>
                  <h2>Top stories</h2>
                </div>
                <span>{topStories.length} updates</span>
              </div>
              {topStories.map((article) => (
                <CompactStory article={article} key={article.id} onSymbol={setSymbol} />
              ))}
            </div>
          </section>
        )}

        <section className="content-grid">
          <div className="latest-column">
            <div className="section-heading latest-heading">
              <div>
                <p className="kicker">News desk</p>
                <h2>{active === "Top" ? "Latest" : active}</h2>
              </div>
              <span>
                {visibleArticles.length
                  ? `${visibleArticles.length} stories`
                  : "No matching stories"}
              </span>
            </div>
            <div className="feed-list">
              {visibleArticles.length ? (
                (latest.length ? latest : topStories).map((article) => (
                  <FeedStory article={article} key={article.id} onSymbol={setSymbol} />
                ))
              ) : (
                <div className="empty-topic">
                  <strong>No current {active.toLowerCase()} stories.</strong>
                  <p>
                    Try another topic or refresh for the newest Alpaca feed.
                  </p>
                  <button type="button" onClick={() => setActive("Top")}>
                    Show top stories
                  </button>
                </div>
              )}
            </div>
          </div>

          <aside className="right-rail">
            <section className="rail-card">
              <div className="section-heading">
                <div>
                  <p className="kicker">Personal</p>
                  <h2>Your watchlist</h2>
                </div>
                <a href="/watchlists">Open</a>
              </div>
              <div className="empty-watchlist">
                <div className="watchlist-spark" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <strong>Build your market view</strong>
                <p>Add symbols to keep their news and price action close.</p>
                <a href="/watchlists">Create watchlist</a>
              </div>
            </section>

            <section className="rail-card about-feed">
              <p className="kicker">About this feed</p>
              <h2>Broad market coverage from Alpaca</h2>
              <p>
                Stories are refreshed from Alpaca’s latest stock and crypto
                news feed and linked to the original source.
              </p>
              <div className="feed-fact">
                <span>Last checked</span>
                <strong>
                  {new Date(data.updatedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </strong>
              </div>
            </section>
          </aside>
        </section></div>
        {symbol && <SymbolWorkspace symbol={symbol} onClose={() => { setSymbol(null); setExpanded(false); }} onExpand={() => setExpanded(value => !value)} />}
      </main>
      <footer className="site-footer">
        <span>Market Brief</span>
        <p>Market information for context, not investment advice.</p>
        <span>Powered by Alpaca</span>
      </footer>
    </>
  );
}
