"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { HomePayload } from "@/lib/alpaca";
import { marketStory, type HomeDeskStory } from "@/lib/home-desks";
import { ArrowIcon, BookmarkIcon } from "./icons";
import { MarketStrip } from "./market-strip";
import { SiteHeader } from "./site-header";

function timeAgo(value: string) {
  const then = new Date(value.includes("T") ? value : `${value}T12:00:00`).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function StoryTags({ story }: { story: HomeDeskStory }) {
  if (story.kind === "topic") {
    return <a className="desk-tag" href={story.deskHref}>{story.deskLabel}</a>;
  }
  return (
    <div className="symbol-tags" aria-label="Related symbols">
      {story.symbols.slice(0, 3).map((symbol) => (
        <a key={symbol} href={`/symbol/${symbol}`}>{symbol}</a>
      ))}
    </div>
  );
}

function DeskHero({ story }: { story: HomeDeskStory }) {
  return (
    <article className={`home-hero ${story.image ? "has-image" : ""}`}>
      {story.image ? (
        // Images originate with the source publisher via Alpaca.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.image} alt="" />
      ) : (
        <div className="home-hero-art" aria-hidden="true">
          <span>{story.kind === "market" ? "MARKET" : "TOPIC"}</span>
          <strong>{story.deskLabel.split(" ").slice(0, 2).join(" ")}</strong>
        </div>
      )}
      <div className="home-hero-copy">
        <div className="story-meta">
          <a className="desk-tag" href={story.deskHref}>{story.deskLabel}</a>
          <span>{story.source}</span>
          <time>{timeAgo(story.publishedAt)}</time>
        </div>
        <h1><a href={story.href} target="_blank" rel="noreferrer">{story.title}</a></h1>
        <p>{story.summary}</p>
        <div className="story-actions">
          <StoryTags story={story} />
          <a href={story.href} target="_blank" rel="noreferrer">Read story <ArrowIcon /></a>
        </div>
      </div>
    </article>
  );
}

function CompactDeskStory({ story }: { story: HomeDeskStory }) {
  return (
    <article className="compact-story">
      <div className="compact-copy">
        <div className="story-meta">
          <a className="desk-tag" href={story.deskHref}>{story.deskLabel}</a>
          <span>{story.source}</span>
        </div>
        <h2><a href={story.href} target="_blank" rel="noreferrer">{story.title}</a></h2>
        <StoryTags story={story} />
      </div>
      {story.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={story.image} alt="" />
      ) : (
        <div className="story-thumb" aria-hidden="true">{story.deskLabel.slice(0, 5).toUpperCase()}</div>
      )}
    </article>
  );
}

function FeedDeskStory({ story }: { story: HomeDeskStory }) {
  return (
    <article className="feed-story">
      <div className="feed-copy">
        <div className="story-meta">
          <a className="desk-tag" href={story.deskHref}>{story.deskLabel}</a>
          <span>{story.source}</span>
          <time>{timeAgo(story.publishedAt)}</time>
        </div>
        <h3><a href={story.href} target="_blank" rel="noreferrer">{story.title}</a></h3>
        {story.summary && <p>{story.summary}</p>}
        <StoryTags story={story} />
      </div>
      <div className="feed-side">
        {story.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.image} alt="" />
        ) : (
          <div className="story-thumb" aria-hidden="true">{story.deskLabel.slice(0, 5).toUpperCase()}</div>
        )}
        <button type="button" aria-label="Save story" title="Save story"><BookmarkIcon /></button>
      </div>
    </article>
  );
}

export function HomeFeed({
  initialData,
  topicStories,
}: {
  initialData: HomePayload;
  topicStories: HomeDeskStory[];
}) {
  const [data, setData] = useState(initialData);
  const [refreshing, setRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const marketsOnly = searchParams.get("desk") === "markets";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/home", { cache: "no-store" });
      if (response.ok) setData((await response.json()) as HomePayload);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const stories = useMemo(() => {
    const marketStories = data.articles.map(marketStory);
    const all = marketsOnly ? marketStories : [...marketStories, ...topicStories];
    return all.sort((left, right) =>
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime(),
    );
  }, [data.articles, marketsOnly, topicStories]);

  const featured = useMemo(() => {
    if (marketsOnly) return stories.slice(0, 4);
    const seen = new Set<string>();
    return stories.filter((story) => {
      if (seen.has(story.deskLabel)) return false;
      seen.add(story.deskLabel);
      return true;
    }).slice(0, 4);
  }, [marketsOnly, stories]);
  const [lead, ...topStories] = featured;
  const featuredIds = new Set(featured.map((story) => story.id));
  const latest = stories.filter((story) => !featuredIds.has(story.id));
  const deskCount = new Set(stories.map((story) => story.deskLabel)).size;

  return (
    <>
      <SiteHeader />
      <MarketStrip markets={data.markets} />
      <main className="page-shell">
        <section className="page-intro">
          <div>
            <p className="kicker">{marketsOnly ? "Market desk" : "Your news desks"}</p>
            <h2>{marketsOnly ? "Markets." : "Latest across your topics."}</h2>
          </div>
          <div className="feed-status">
            <span className={data.isLive ? "live-dot" : "status-dot"} />
            {data.isLive ? "Market feed live" : data.message}
            <button type="button" onClick={refresh} disabled={refreshing}>{refreshing ? "Refreshing…" : "Refresh"}</button>
          </div>
        </section>

        <section className="desk-overview" aria-label="Home feed context">
          <p>{marketsOnly ? "The latest Alpaca market coverage." : `A cross-section of the newest reporting from ${deskCount} desks — market coverage plus the topics you follow.`}</p>
          {!marketsOnly && <a href="/?desk=markets">View market desk <ArrowIcon /></a>}
        </section>

        {lead && (
          <section className="lead-grid" aria-label="Latest news from each desk">
            <DeskHero story={lead} />
            <div className="top-stories">
              <div className="section-heading">
                <div><p className="kicker">Also new</p><h2>From your desks</h2></div>
                <span>{topStories.length} desks</span>
              </div>
              {topStories.map((story) => <CompactDeskStory story={story} key={story.id} />)}
            </div>
          </section>
        )}

        <section className="content-grid">
          <div className="latest-column">
            <div className="section-heading latest-heading">
              <div><p className="kicker">{marketsOnly ? "Market news" : "All desks"}</p><h2>{marketsOnly ? "Latest market coverage" : "Latest reporting"}</h2></div>
              <span>{stories.length} stories</span>
            </div>
            <div className="feed-list">
              {latest.length ? latest.map((story) => <FeedDeskStory story={story} key={story.id} />) : (
                <div className="empty-topic"><strong>No additional current stories.</strong><p>Refresh the market feed or choose a topic above.</p></div>
              )}
            </div>
          </div>

          <aside className="right-rail">
            <section className="rail-card">
              <div className="section-heading"><div><p className="kicker">Your desks</p><h2>Topics</h2></div></div>
              <div className="home-topic-list">
                <a href="/?desk=markets"><strong>Markets</strong><span>Alpaca market news and symbol research</span></a>
                {topicStories.reduce<HomeDeskStory[]>((items, story) => items.some((item) => item.deskHref === story.deskHref) ? items : [...items, story], []).map((story) => (
                  <a href={story.deskHref} key={story.deskHref}><strong>{story.deskLabel}</strong><span>Open this research desk</span></a>
                ))}
              </div>
            </section>
            <section className="rail-card about-feed">
              <p className="kicker">About this home</p><h2>One place to re-enter your reading.</h2>
              <p>Each topic retains its own filters and source context. Home surfaces the newest item from every desk before the full combined stream.</p>
            </section>
          </aside>
        </section>
      </main>
      <footer className="site-footer"><span>Alex&apos;s Curated News</span><p>Information for context, not investment advice.</p><span>Powered by your selected sources</span></footer>
    </>
  );
}
