import { getHomePayload } from "@/lib/alpaca";
import { marketStory, topicStory } from "@/lib/home-desks";
import { searchTopicArticles } from "@/lib/db";
import { SiteHeader } from "@/components/site-header";

function matchesMarketStory(
  story: ReturnType<typeof marketStory>,
  query: string,
) {
  const normalized = query.toLowerCase();
  return [story.title, story.summary, story.source, ...story.symbols]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function tickerCandidate(query: string) {
  const normalized = query.trim().replace(/^\$/, "").toUpperCase();
  return /^[A-Z]{1,5}(?:\.[A-Z])?$/.test(normalized) ? normalized : null;
}

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const scope = params.scope?.startsWith("/") ? params.scope : "";
  const [market, topicResults] = query
    ? await Promise.all([getHomePayload(), searchTopicArticles(query)])
    : [null, []];
  const marketResults = market
    ? market.articles.map(marketStory).filter((story) => matchesMarketStory(story, query))
    : [];
  const scopedTopicResults = scope
    ? topicResults.filter(({ topic }) => topic.publicPath === scope)
    : topicResults;
  const scopedMarketResults = scope ? [] : marketResults;
  const ticker = scope ? null : tickerCandidate(query);

  return (
    <>
      <SiteHeader />
      <main className="search-shell">
        <p className="kicker">Site search</p>
        <h1>Find it again.</h1>
        <form className="search-page-form" action="/search" role="search">
          {scope && <input type="hidden" name="scope" value={scope} />}
          <input name="q" defaultValue={query} autoFocus placeholder="Search news, topics, sources, or a symbol" />
          <button type="submit">Search</button>
        </form>
        {!query ? (
          <section className="search-empty"><strong>Search all of your current desks.</strong><p>Try a company, condition, technology, source, article keyword, or ticker.</p></section>
        ) : (
          <>
            <p className="search-summary">{scopedMarketResults.length + scopedTopicResults.length} current {scope ? "desk" : "site"} results for <strong>“{query}”</strong>. {scope && <a href={`/search?q=${encodeURIComponent(query)}`}>Search everywhere</a>}</p>
            {ticker && (
              <a className="symbol-search-cta" href={`/symbol/${ticker}`}>
                <span>Market research</span><strong>Open {ticker}</strong><span>Quote, charts, metrics, and related market news →</span>
              </a>
            )}
            <section className="search-results" aria-label="Search results">
              {scopedMarketResults.map((story) => (
                <article key={story.id}>
                  <div><a className="desk-tag" href={story.deskHref}>Markets</a><span>{story.source}</span></div>
                  <h2><a href={story.href} target="_blank" rel="noreferrer">{story.title}</a></h2>
                  <p>{story.summary}</p>
                </article>
              ))}
              {scopedTopicResults.map(({ topic, article }) => {
                const story = topicStory(topic as Parameters<typeof topicStory>[0], article);
                return (
                  <article key={`${topic.slug}-${article.id}`}>
                    <div><a className="desk-tag" href={story.deskHref}>{story.deskLabel}</a><span>{story.source}</span></div>
                    <h2><a href={story.href} target="_blank" rel="noreferrer">{story.title}</a></h2>
                    <p>{story.summary}</p>
                  </article>
                );
              })}
            </section>
            {!scopedMarketResults.length && !scopedTopicResults.length && <section className="search-empty"><strong>No current matches.</strong><p>Try a broader phrase, browse a topic in the navigation, or enter an exact ticker to open market research.</p>{scope && <p><a className="back-link" href={`/search?q=${encodeURIComponent(query)}`}>Search the whole site</a></p>}</section>}
          </>
        )}
      </main>
    </>
  );
}
