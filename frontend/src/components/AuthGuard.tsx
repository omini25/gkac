"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import NextImage from "next/image";
import { useAuth } from "@/lib/useAuth";

interface Props {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthGuard({ children, requireAdmin = false }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (requireAdmin && !user.isAdmin) {
      router.replace("/dashboard");
      return;
    }
  }, [user, loading, requireAdmin, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 16,
          background: "var(--bg)",
        }}
      >
        <NextImage
          src="/gkac-logo.png"
          alt="GKAC"
          width={72}
          height={72}
          style={{ borderRadius: 12 }}
          priority
        />
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--green)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (requireAdmin && !user.isAdmin) {
    return null;
  }

  return <>{children}</>;
}
