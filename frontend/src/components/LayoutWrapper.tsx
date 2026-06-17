"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");
  const isAuth = AUTH_PATHS.includes(pathname);

  return (
    <>
      {!isDashboard && !isAuth && <Nav />}
      <main>{children}</main>
      {!isDashboard && !isAuth && <Footer />}
    </>
  );
}
