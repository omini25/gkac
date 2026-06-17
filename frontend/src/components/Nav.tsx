"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/membership", label: "Membership" },
  { href: "/elections", label: "Elections" },
  { href: "/events", label: "Events" },
  { href: "/news", label: "News" },
  { href: "/contact", label: "Contact" },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const close = useCallback(() => setMenuOpen(false), []);

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close on Escape key
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [menuOpen, close]);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  // Scroll-aware shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className={`site-nav${scrolled ? " scrolled" : ""}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="nav-inner">
        <Link href="/" className="nav-brand" aria-label="GKAC — Home">
          <img src="/gkac-logo.png" alt="GKAC Logo" className="brand-mark" />
          <span className="brand-text">GKAC</span>
          <span className="brand-full" style={{
            background: "linear-gradient(135deg, var(--green-dark), oklch(40% 0.14 150))",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Global Kegite Archaverians Club
          </span>
        </Link>

        {/* Mobile overlay */}
        {menuOpen && (
          <div
            className="nav-overlay"
            onClick={close}
            aria-hidden="true"
          />
        )}

        <button
          className={`nav-toggle${menuOpen ? " open" : ""}`}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <span /><span /><span />
        </button>

        <ul className={`nav-links${menuOpen ? " open" : ""}`} role="menubar">
          {NAV_ITEMS.map(({ href, label }) => (
            <li key={href} role="none">
              <Link
                href={href}
                role="menuitem"
                className={isActive(href) ? "active" : ""}
              >
                {label}
              </Link>
            </li>
          ))}
          <li role="none" className="nav-divider" aria-hidden="true" />
          <li role="none">
            <Link
              href="/verification"
              role="menuitem"
              className={`nav-verify${isActive("/verification") ? " active" : ""}`}
            >
              Verify
            </Link>
          </li>
          <li role="none" className="nav-cta">
            <Link href="/login" role="menuitem">
              Sign In
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
