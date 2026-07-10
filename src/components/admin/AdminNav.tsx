"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "ภาพรวม", exact: true },
  { href: "/admin/reviews", label: "รีวิวทั้งหมด", exact: false },
  { href: "/admin/pending", label: "รอตรวจสอบ", exact: false },
  { href: "/admin/import", label: "นำเข้าไฟล์", exact: false },
  { href: "/admin/manual-add", label: "เพิ่มรีวิว", exact: false },
  { href: "/admin/scrape", label: "Scrape X", exact: false },
];

export function AdminNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-t border-outline/10 px-3 scrollbar-none sm:px-6"
      aria-label="Admin navigation"
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap ${
              active
                ? "border-primary text-primary"
                : "border-transparent text-label hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
