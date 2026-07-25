import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { addTopic } from "../actions";
import { searchTopicCandidates } from "@/lib/topic-search";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Topic Search",
  description: "Search candidate sources and add managed news topics.",
};

export default async function TopicSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const results = await searchTopicCandidates(query);
  const firstDraft = results[0]?.topicDraft;

  return (
    <>
      <SiteHeader />
      <main className="admin-shell">
        <section className="admin-hero compact">
          <p className="kicker">Topic search</p>
          <h1>{query ? query : "Search topics"}</h1>
          <p>
            Results are candidate sources and clusters. Add the topic from here,
            then the collector can maintain it as a managed desk.
          </p>
        </section>

        <form className="admin-search" action="/admin/topic-search">
          <label>
            <span>Search topic candidates</span>
            <input name="q" defaultValue={query} placeholder="Balcony solar, solid state batteries..." />
          </label>
          <button type="submit">Search</button>
        </form>

        {firstDraft && (
          <section className="admin-panel add-topic-panel">
            <div className="section-heading">
              <div>
                <p className="kicker">Add as topic</p>
                <h2>{firstDraft.title}</h2>
              </div>
            </div>
            <form action={addTopic} className="topic-settings-form">
              <label>
                <span>Display name</span>
                <input name="title" defaultValue={firstDraft.title} />
              </label>
              <label>
                <span>Slug</span>
                <input name="slug" defaultValue={firstDraft.slug} />
              </label>
              <label>
                <span>Short description</span>
                <input
                  name="deck"
                  defaultValue={`${firstDraft.title} news, research, primary sources, and skepticism-friendly context.`}
                />
              </label>
              <label>
                <span>Purpose</span>
                <input name="purpose" defaultValue={firstDraft.purpose} />
              </label>
              <label>
                <span>Geography</span>
                <input name="geography" defaultValue={firstDraft.geography.join(", ")} />
              </label>
              <label>
                <span>Categories</span>
                <input name="categories" defaultValue={firstDraft.categories.join(", ")} />
              </label>
              <label>
                <span>Prefer</span>
                <input name="prefer" defaultValue={firstDraft.prefer.join(", ")} />
              </label>
              <label>
                <span>Caution</span>
                <input name="caution" defaultValue={firstDraft.caution.join(", ")} />
              </label>
              <label>
                <span>Refresh hours</span>
                <input name="refreshHours" type="number" min="6" step="6" defaultValue="6" />
              </label>
              <button type="submit">Add this as topic</button>
            </form>
          </section>
        )}

        <section className="admin-list">
          {results.map((result) => (
            <article key={result.id}>
              <div>
                <span>{result.source}</span>
                <time>{result.publishedAt}</time>
              </div>
              <h2>
                {result.url === "#" ? (
                  result.title
                ) : (
                  <a href={result.url} target="_blank" rel="noreferrer">
                    {result.title}
                  </a>
                )}
              </h2>
              <p>{result.summary}</p>
              <div className="ra-tags">
                {result.suggestedTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </article>
          ))}
          {!results.length && (
            <div className="ra-empty">
              <strong>No topic search yet.</strong>
              <p>Search from Admin to find candidate sources and add a managed topic.</p>
              <Link href="/admin">Back to admin</Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
