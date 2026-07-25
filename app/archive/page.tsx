import Link from "next/link";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { ownerTrackingFromCookie, viewedArchive } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Viewed Archive",
  description: "Search articles you have already opened.",
};

export default async function ViewedArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q ?? "";
  const tracking = ownerTrackingFromCookie((await headers()).get("cookie"));
  const articles = tracking ? await viewedArchive(query) : [];

  return (
    <>
      <SiteHeader />
      <main className="admin-shell">
        <section className="admin-hero">
          <p className="kicker">Research memory</p>
          <h1>Viewed Archive</h1>
          <p>
            Search articles you already opened across managed topics. This is
            intentionally small: find it again, mark it unread from the topic,
            move on.
          </p>
        </section>

        <form className="admin-search" action="/archive">
          <label>
            <span>Search viewed articles</span>
            <input name="q" defaultValue={query} placeholder="source, title, topic..." />
          </label>
          <button type="submit">Search</button>
        </form>

        {!tracking && (
          <section className="admin-panel">
            <h2>Owner tracking is off</h2>
            <p>Open Admin and enable owner tracking on this device first.</p>
            <Link href="/admin">Open admin</Link>
          </section>
        )}

        <section className="admin-list">
          {articles.map((article) => (
            <article key={article.id}>
              <div>
                <span>{article.source}</span>
                {article.viewedAt && <time>Viewed {new Date(article.viewedAt).toLocaleString()}</time>}
              </div>
              <h2>
                <a href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
              </h2>
              <p>{article.summary}</p>
            </article>
          ))}
          {tracking && !articles.length && (
            <div className="ra-empty">
              <strong>No viewed articles found.</strong>
              <p>Open a managed topic article first, or try a different search.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
