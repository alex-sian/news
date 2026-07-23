"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon, SearchIcon } from "./icons";

const links = [
  { href: "/", label: "Home", eyebrow: "Latest market news" },
  { href: "/watchlists", label: "Watchlists", eyebrow: "Symbols you follow" },
  { href: "/settings", label: "Settings", eyebrow: "Your news preferences" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
          <form className="search" action="/" role="search">
            <SearchIcon />
            <input
              aria-label="Search news or symbols"
              name="q"
              placeholder="Search news, symbols or companies"
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
