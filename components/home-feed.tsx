"use client";

import { useCallback, useState } from "react";
import type { HomePayload } from "@/lib/alpaca";
import { FeedStory, HeroStory, CompactStory } from "./news-card";
import { MarketStrip } from "./market-strip";
import { SiteHeader } from "./site-header";

const filters = ["Top", "Latest", "Markets", "Technology", "Economy"];

export function HomeFeed({ initialData }: { initialData: HomePayload }) {
  const [data, setData] = useState(initialData);
  const [active, setActive] = useState("Top");
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/home", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as HomePayload);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const [lead, ...rest] = data.articles;
  const topStories = rest.slice(0, 3);
  const latest = rest.slice(3);

  return (
    <>
      <SiteHeader />
      <MarketStrip markets={data.markets} />
      <main className="page-shell">
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
            <HeroStory article={lead} />
            <div className="top-stories">
              <div className="section-heading">
                <div>
                  <p className="kicker">Developing</p>
                  <h2>Top stories</h2>
                </div>
                <span>{topStories.length} updates</span>
              </div>
              {topStories.map((article) => (
                <CompactStory article={article} key={article.id} />
              ))}
            </div>
          </section>
        )}

        <section className="content-grid">
          <div className="latest-column">
            <div className="section-heading latest-heading">
              <div>
                <p className="kicker">News desk</p>
                <h2>Latest</h2>
              </div>
              <span>Newest first</span>
            </div>
            <div className="feed-list">
              {(latest.length ? latest : topStories).map((article) => (
                <FeedStory article={article} key={article.id} />
              ))}
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
        </section>
      </main>
      <footer className="site-footer">
        <span>Market Brief</span>
        <p>Market information for context, not investment advice.</p>
        <span>Powered by Alpaca</span>
      </footer>
    </>
  );
}
