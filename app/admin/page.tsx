import Link from "next/link";
import { headers } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { listManagedTopics, ownerTrackingFromCookie } from "@/lib/db";
import { enableOwnerTracking } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  description: "Manage curated news topics.",
};

export default async function AdminPage() {
  const topics = await listManagedTopics();
  const tracking = ownerTrackingFromCookie((await headers()).get("cookie"));

  return (
    <>
      <SiteHeader />
      <main className="admin-shell">
        <section className="admin-hero">
          <p className="kicker">Admin</p>
          <h1>Topic Management</h1>
          <p>
            Managed topics, source policy, viewed tracking, and topic discovery.
          </p>
        </section>

        <section className="admin-toolbar">
          <form className="admin-search" action="/admin/topic-search">
            <label>
              <span>Search for a new managed topic</span>
              <input name="q" placeholder="Solid state batteries, balcony solar..." />
            </label>
            <button type="submit">Search topics</button>
          </form>
          <form action={enableOwnerTracking}>
            <button className="admin-secondary" type="submit">
              {tracking ? "Owner tracking enabled" : "Enable owner tracking"}
            </button>
          </form>
          <Link className="admin-secondary" href="/archive">
            Viewed archive
          </Link>
        </section>

        <section className="admin-panel">
          <div className="section-heading">
            <div>
              <p className="kicker">Managed now</p>
              <h2>Topics</h2>
            </div>
            <span>{topics.length} active</span>
          </div>
          <div className="topic-table">
            {topics.map((topic) => (
              <article key={topic.id}>
                <div>
                  <h3>{topic.title}</h3>
                  <p>{topic.deck}</p>
                </div>
                <span>{topic.refreshHours}h refresh</span>
                <span>{topic.status}</span>
                <Link href={topic.publicPath}>Open</Link>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
