"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth, getUserInitials } from "@/lib/useAuth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/profile", label: "My Profile", icon: "👤" },
  { href: "/dashboard/card", label: "Membership Card", icon: "💳" },
  { href: "/dashboard/billing", label: "Billing", icon: "💰" },
  { href: "/dashboard/resources", label: "Resources", icon: "📁" },
  { href: "/dashboard/elections", label: "Elections & Voting", icon: "🗳️" },
  { href: "/dashboard/events", label: "Events", icon: "📅" },
];

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profile": "My Profile",
  "/dashboard/card": "Membership Card",
  "/dashboard/billing": "Billing & Payments",
  "/dashboard/resources": "Resources & Documents",
  "/dashboard/elections": "Elections & Voting",
  "/dashboard/events": "Events",
};

function DashboardContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => { close(); }, [pathname, close]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest(".sidebar") && !t.closest(".menu-btn")) close();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [sidebarOpen, close]);

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname === k || (k !== "/dashboard" && pathname.startsWith(k)))?.[1] || "Dashboard";

  const initials = user ? getUserInitials(user) : "??";
  const displayName = user ? `${user.firstName} ${user.lastName}` : "GKAC Member";

  return (
    <div className="app-layout">
      {/* Dark Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} id="sidebar">
        <Link href="/dashboard" className="sidebar-brand">
          <img src="/gkac-logo.png" alt="GKAC Logo" style={{ width: 34, height: 34, borderRadius: "var(--radius-sm)", objectFit: "contain", flexShrink: 0 }} />
          Member Portal
        </Link>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? "active" : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); router.push("/login"); }} style={{ cursor: "pointer" }}>
            🚪 Sign Out
          </a>
        </div>
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? " open" : ""}`}
        onClick={close}
      />

      {/* Main Area */}
      <div className="main-area">
        {/* Top Header */}
        <header className="top-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button className="menu-btn" onClick={() => setSidebarOpen((p) => !p)} aria-label="Toggle menu">
              ☰
            </button>
            <span className="page-title">{pageTitle}</span>
          </div>
          <div className="header-actions">
            <div className="user-chip">
              <div className="avatar">{initials}</div>
              <span className="uname">{displayName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
