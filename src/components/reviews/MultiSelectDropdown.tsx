"use client";

import { useEffect, useRef, useState } from "react";

export interface DropdownOption {
  value: string;
  label: string;
}

export function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  searchable = true,
}: {
  label: string;
  options: DropdownOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const filteredOptions = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95 ${
          selected.length
            ? "border-primary/30 bg-primary-container/60 text-on-primary-container"
            : "border-white/70 bg-white/80 text-text backdrop-blur"
        }`}
      >
        {label}
        {selected.length > 0 && (
          <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-on-primary">
            {selected.length}
          </span>
        )}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-[1.25rem] border border-white/70 bg-white/95 p-2 shadow-card-hover backdrop-blur">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`ค้นหา${label}...`}
              className="mb-2 w-full rounded-control bg-surface-cream px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <div className="max-h-56 overflow-y-auto">
            {filteredOptions.length === 0 && (
              <p className="px-2 py-3 text-center text-sm text-label">ไม่พบตัวเลือก</p>
            )}
            {filteredOptions.map((o) => (
              <label
                key={o.value}
                className="flex cursor-pointer items-center gap-2 rounded-control px-2 py-1.5 text-sm hover:bg-surface-container-low"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="truncate">{o.label}</span>
              </label>
            ))}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-1 w-full rounded-control px-2 py-1.5 text-center text-xs font-semibold text-primary hover:bg-surface-container-low"
            >
              ล้างตัวเลือก
            </button>
          )}
        </div>
      )}
    </div>
  );
}
