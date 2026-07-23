import type { NewsArticle } from "@/lib/alpaca";
import { ArrowIcon, BookmarkIcon } from "./icons";

function timeAgo(date: string) {
  const then = new Date(date).getTime();
  const minutes = Math.max(1, Math.round((Date.now() - then) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function sourceLabel(source: string) {
  if (!source) return "Market news";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

function SymbolTags({ symbols }: { symbols: string[] }) {
  if (!symbols.length) return null;
  return (
    <div className="symbol-tags" aria-label="Related symbols">
      {symbols.slice(0, 3).map((symbol) => (
        <span key={symbol}>{symbol}</span>
      ))}
    </div>
  );
}

export function HeroStory({ article }: { article: NewsArticle }) {
  const image = article.images?.find((item) => item.size === "large")?.url ??
    article.images?.[0]?.url;
  return (
    <article className={`hero-story ${image ? "has-image" : ""}`}>
      {image ? (
        // Alpaca supplies story images from several publisher CDNs.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="hero-image" />
      ) : (
        <div className="hero-art" aria-hidden="true">
          <span>THE</span>
          <strong>MARKET</strong>
          <span>NOW</span>
        </div>
      )}
      <div className="hero-copy">
        <div className="story-meta">
          <span className="live-label">Top story</span>
          <span>{sourceLabel(article.source)}</span>
          <time>{timeAgo(article.updated_at)}</time>
        </div>
        <h1>{article.headline}</h1>
        <p>{article.summary}</p>
        <div className="story-actions">
          <SymbolTags symbols={article.symbols} />
          <a href={article.url} target="_blank" rel="noreferrer">
            Read story <ArrowIcon />
          </a>
        </div>
      </div>
    </article>
  );
}

export function CompactStory({ article }: { article: NewsArticle }) {
  const image = article.images?.[0]?.url;
  return (
    <article className="compact-story">
      <div className="compact-copy">
        <div className="story-meta">
          <span>{sourceLabel(article.source)}</span>
          <time>{timeAgo(article.updated_at)}</time>
        </div>
        <h2>
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.headline}
          </a>
        </h2>
        <SymbolTags symbols={article.symbols} />
      </div>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <div className="story-thumb" aria-hidden="true">
          {article.symbols[0]?.slice(0, 4) ?? "NEWS"}
        </div>
      )}
    </article>
  );
}

export function FeedStory({ article }: { article: NewsArticle }) {
  const image = article.images?.[0]?.url;
  return (
    <article className="feed-story">
      <div className="feed-copy">
        <div className="story-meta">
          <span>{sourceLabel(article.source)}</span>
          <time>{timeAgo(article.updated_at)}</time>
        </div>
        <h3>
          <a href={article.url} target="_blank" rel="noreferrer">
            {article.headline}
          </a>
        </h3>
        {article.summary && <p>{article.summary}</p>}
        <SymbolTags symbols={article.symbols} />
      </div>
      <div className="feed-side">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" />
        ) : (
          <div className="story-thumb" aria-hidden="true">
            {article.symbols[0]?.slice(0, 4) ?? "NEWS"}
          </div>
        )}
        <button type="button" aria-label="Save story" title="Save story">
          <BookmarkIcon />
        </button>
      </div>
    </article>
  );
}
