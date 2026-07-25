"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type TopicLink = { href: string; label: string };

const fallbackTopics: TopicLink[] = [
  { href: "/ra-news", label: "RA News" },
  { href: "/topics/solid-state-batteries", label: "Solid State Batteries" },
];

export function TopicNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [topics, setTopics] = useState<TopicLink[]>(fallbackTopics);

  useEffect(() => {
    let cancelled = false;
    async function loadTopics() {
      try {
        const response = await fetch("/api/topics", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { topics?: TopicLink[] };
        if (!cancelled && Array.isArray(payload.topics)) setTopics(payload.topics);
      } catch {
        // The built-in topics keep navigation useful if the request is unavailable.
      }
    }
    loadTopics();
    return () => {
      cancelled = true;
    };
  }, []);

  const links: TopicLink[] = [
    { href: "/", label: "Latest" },
    { href: "/?desk=markets", label: "Markets" },
    ...topics,
  ];

  return (
    <nav className="topic-nav" aria-label="News topics">
      <div className="topic-nav-inner">
        {links.map((link) => {
          const marketActive = link.href.includes("desk=markets") &&
            pathname === "/" && searchParams.get("desk") === "markets";
          const latestActive = link.href === "/" && pathname === "/" &&
            searchParams.get("desk") !== "markets";
          const active = marketActive || latestActive ||
            (link.href !== "/" && !link.href.includes("?") && pathname === link.href);
          return (
            <Link href={link.href} key={link.href} className={active ? "active" : ""}>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
