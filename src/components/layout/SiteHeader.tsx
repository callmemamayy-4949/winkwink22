"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";

type RawSearchParams = Record<string, string | string[] | undefined>;

function toUrlSearchParams(searchParams: RawSearchParams) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value) {
      params.set(key, value);
    }
  });
  return params;
}

export function SiteHeader({
  searchParams = {},
}: {
  searchParams?: RawSearchParams;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentQ = typeof searchParams.q === "string" ? searchParams.q : "";
  const [searchValue, setSearchValue] = useState(currentQ);
  const [prevQ, setPrevQ] = useState(currentQ);

  if (currentQ !== prevQ) {
    setPrevQ(currentQ);
    setSearchValue(currentQ);
  }

  function updateSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = toUrlSearchParams(searchParams);
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      if (!params.get("sort")) params.set("sort", "likes");
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 350);
  }

  return (
    <header className="sticky top-0 z-30 border-b border-white/55 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-3 px-4 py-3 sm:flex-row sm:px-6">
        <Link href="/reviews" className="flex shrink-0 items-center gap-2 text-primary" aria-label="Winkwink Review Center">
          <Image
            src="/winkwink-logo.png"
            alt="Winkwink"
            width={96}
            height={96}
            preload
            className="h-12 w-auto object-contain drop-shadow-sm sm:h-16"
          />
        </Link>

        <div className="relative w-full min-w-0 flex-1">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-label"
            aria-hidden
          >
            <circle cx={11} cy={11} r={7} />
            <path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={searchValue}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="ค้นหารีวิว รุ่นอุปกรณ์ หรือสถานที่"
            className="w-full rounded-full border border-primary/10 bg-primary-container/30 px-4 py-3 pl-11 text-sm font-medium text-text-strong outline-none transition focus:border-primary/30 focus:bg-white focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>
    </header>
  );
}
