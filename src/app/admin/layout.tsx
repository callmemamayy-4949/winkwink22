import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = {
  title: "Admin — Winkwink Review Gallery",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-outline/15 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary text-sm font-extrabold">
              W
            </div>
            <span className="text-base font-extrabold text-primary">Winkwink Admin</span>
          </div>
          <Link
            href="/reviews"
            className="flex items-center gap-1 rounded-full bg-surface-container px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-container-high"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            กลับสู่เว็บ
          </Link>
        </div>
        <AdminNav />
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
