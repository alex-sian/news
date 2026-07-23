import Link from "next/link";
import { SiteHeader } from "./site-header";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  items: { title: string; description: string }[];
};

export function PlaceholderPage({
  eyebrow,
  title,
  description,
  items,
}: PlaceholderPageProps) {
  return (
    <>
      <SiteHeader />
      <main className="placeholder-shell">
        <p className="kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="placeholder-lede">{description}</p>
        <div className="placeholder-grid">
          {items.map((item, index) => (
            <article key={item.title}>
              <span>0{index + 1}</span>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
              <small>Coming soon</small>
            </article>
          ))}
        </div>
        <Link href="/" className="back-link">
          Return to today’s market brief
        </Link>
      </main>
    </>
  );
}
