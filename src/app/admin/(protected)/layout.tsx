import Link from "next/link";
import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { logoutAdmin } from "@/lib/actions/auth";
import { requireAdminSession } from "@/lib/auth/admin";

export const metadata = {
  title: "Admin — Winkwink Review Gallery",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdminSession();

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
          <div className="flex items-center gap-2">
            <span className="hidden text-xs font-semibold text-label sm:inline">
              {session.username}
            </span>
            <Link
              href="/reviews"
              className="flex items-center gap-1 rounded-full bg-surface-container px-3.5 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surface-container-high"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              กลับสู่เว็บ
            </Link>
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="rounded-full border border-outline/35 px-3.5 py-1.5 text-sm font-semibold text-label transition-colors hover:bg-surface-container-low hover:text-error"
              >
                ออก
              </button>
            </form>
          </div>
        </div>
        <AdminNav />
      </header>

      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
