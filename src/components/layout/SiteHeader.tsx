import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-surface/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/reviews" className="flex items-center gap-2 text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-primary text-white shadow-glow">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.3 5.1c2.3-1.2 4.9-.4 6.4 1.4l1.3 1.6 1.3-1.6c1.5-1.8 4.1-2.6 6.4-1.4 2.9 1.5 3.5 5 1.6 7.8C18.7 16.65 12 21 12 21z" />
            </svg>
          </span>
          <span className="font-display text-base font-bold text-gradient-primary sm:text-lg">
            Winkwink
          </span>
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-white/60 bg-white/70 px-4 py-1.5 text-sm font-semibold text-primary shadow-sm backdrop-blur transition-transform hover:scale-[1.03] active:scale-95"
        >
          Admin
        </Link>
      </div>
    </header>
  );
}
