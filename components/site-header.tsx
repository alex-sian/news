"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";

type NavLink = {
  href: string;
  label: string;
  eyebrow: string;
};

const baseLinks: NavLink[] = [
  { href: "/", label: "Home", eyebrow: "Latest market news" },
  { href: "/archive", label: "Viewed Archive", eyebrow: "Previously opened articles" },
  { href: "/admin", label: "Admin", eyebrow: "Topic management" },
  { href: "/watchlists", label: "Watchlists", eyebrow: "Symbols you follow" },
  { href: "/settings", label: "Settings", eyebrow: "Your news preferences" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [topicLinks, setTopicLinks] = useState<NavLink[]>([
    { href: "/ra-news", label: "RA News", eyebrow: "Research, treatment & relief" },
    { href: "/topics/solid-state-batteries", label: "Solid State Batteries", eyebrow: "Research desk" },
  ]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    async function loadTopics() {
      try {
        const response = await fetch("/api/topics", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { topics?: NavLink[] };
        if (!cancelled && Array.isArray(payload.topics)) {
          setTopicLinks(payload.topics);
        }
      } catch {
        // Keep the built-in topic links if the dynamic list is unavailable.
      }
    }
    loadTopics();
    return () => {
      cancelled = true;
    };
  }, []);

  const links = [
    baseLinks[0],
    ...topicLinks,
    ...baseLinks.slice(1),
  ];

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="icon-button menu-button"
            type="button"
            aria-label="Open navigation"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </button>
          <Link href="/" className="wordmark" aria-label="Market Brief home">
            <span className="wordmark-mark">M</span>
            <span>Market Brief</span>
          </Link>
          <form className="search" action="/search" role="search">
            <SearchIcon />
            <input
              aria-label="Search symbols or stocks"
              name="q"
              placeholder="Search symbol or company"
            />
            <kbd>/</kbd>
          </form>
          <button className="avatar" type="button" aria-label="Account">
            AS
          </button>
        </div>
      </header>

      <div className={`drawer-layer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
        />
        <aside className="drawer" aria-label="Main navigation">
          <div className="drawer-heading">
            <div className="wordmark">
              <span className="wordmark-mark">M</span>
              <span>Market Brief</span>
            </div>
            <button
              className="icon-button"
              type="button"
              aria-label="Close navigation"
              onClick={() => setOpen(false)}
            >
              <CloseIcon />
            </button>
          </div>
          <nav className="drawer-nav">
            {links.map((link) => (
              <Link
                href={link.href}
                key={link.href}
                className={pathname === link.href ? "active" : ""}
              >
                <span>{link.label}</span>
                <small>{link.eyebrow}</small>
              </Link>
            ))}
          </nav>
          <div className="drawer-foot">
            <span className="live-dot" />
            Powered by Alpaca
          </div>
        </aside>
      </div>
    </>
  );
}
