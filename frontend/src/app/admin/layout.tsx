"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import AuthGuard from "@/components/AuthGuard";
import { useAuth, getUserInitials } from "@/lib/useAuth";

const NAV_SECTIONS = [
  {
    heading: "Main",
    items: [
      { href: "/admin", label: "Dashboard Overview", icon: "📊" },
    ],
  },
  {
    heading: "Members",
    items: [
      { href: "/admin/members", label: "Member Management", icon: "👥" },
    ],
  },
  {
    heading: "Finance",
    items: [
      { href: "/admin/payments", label: "Payments & Renewals", icon: "💳" },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/admin/content", label: "Content Management", icon: "📝" },
      { href: "/admin/resources", label: "Resource Library", icon: "📁" },
      { href: "/admin/contact", label: "Contact Messages", icon: "✉️" },
    ],
  },
  {
    heading: "Governance",
    items: [
      { href: "/admin/elections", label: "Elections & Voting", icon: "🗳" },
      { href: "/admin/reports", label: "Reports & Analytics", icon: "📈" },
    ],
  },
  {
    heading: "Settings",
    items: [
      { href: "/admin/profile", label: "My Profile", icon: "👤" },
      { href: "/admin/settings", label: "System Settings", icon: "⚙" },
    ],
  },
];

const PAGE_TITLES: Record<string, string> = {
  "/admin": "Dashboard Overview",
  "/admin/members": "Member Management",
  "/admin/payments": "Payments & Renewals",
  "/admin/content": "Content Management",
  "/admin/resources": "Resource Library",
  "/admin/elections": "Elections & Voting",
  "/admin/reports": "Reports & Analytics",
  "/admin/profile": "My Profile",
  "/admin/settings": "System Settings",
  "/admin/contact": "Contact Messages",
};

function AdminContent({ children }: { children: React.ReactNode }) {
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
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  const pageTitle = PAGE_TITLES[pathname] || "Admin";
  const initials = user ? getUserInitials(user) : "AD";
  const displayName = user ? `${user.firstName} ${user.lastName}` : "Admin";

  return (
    <div className="app-layout">
      {/* Dark Sidebar */}
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} id="sidebar">
        <Link href="/admin" className="sidebar-brand">
          <img src="/gkac-logo.png" alt="GKAC Logo" className="sb-logo" />
          <span className="sb-title">Admin Panel</span>
        </Link>
        <nav className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading}>
              <div className="nav-section">{section.heading}</div>
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href) ? "active" : ""}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button
            className="btn-signout"
            onClick={() => { logout(); router.push("/login"); }}
          >
            🚪 Sign Out
          </button>
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
          <Link href="/admin/profile" className="user-chip" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="avatar">{initials}</div>
            <span className="uname">Admin · {displayName}</span>
          </Link>
        </header>

        {/* Page Content */}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <AdminContent>{children}</AdminContent>
    </AuthGuard>
  );
}
