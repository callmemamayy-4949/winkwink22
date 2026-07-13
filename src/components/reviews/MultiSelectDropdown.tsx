"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const listId = useId();

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
    <div ref={rootRef} className={`relative overflow-visible ${open ? "z-50" : "z-10"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex min-h-11 touch-manipulation items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition-all hover:scale-[1.02] active:scale-95 ${
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
        <div className="absolute left-0 top-full z-[9999] mt-2 hidden w-64 rounded-[1.25rem] border border-white/70 bg-white/95 p-2 shadow-card-hover backdrop-blur sm:block">
          {searchable && (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`ค้นหา${label}...`}
              className="mb-2 w-full rounded-control bg-surface-cream px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 && (
              <p className="px-2 py-3 text-center text-sm text-label">ไม่พบตัวเลือก</p>
            )}
            {filteredOptions.map((o, index) => {
              const checked = selected.includes(o.value);
              const optionId = `${listId}-${index}`;

              return (
                <label
                  key={o.value}
                  htmlFor={optionId}
                  className={`flex min-h-11 w-full cursor-pointer touch-manipulation select-none items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors active:bg-primary-container/80 ${
                    checked
                      ? "bg-primary-container/70 font-semibold text-on-primary-container ring-1 ring-primary/20"
                      : "text-text hover:bg-surface-container-low"
                  }`}
                >
                  <input
                    id={optionId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(o.value)}
                    className="h-5 w-5 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </label>
              );
            })}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mt-2 min-h-11 w-full touch-manipulation rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low active:bg-primary-container/70"
            >
              ล้างตัวเลือก
            </button>
          )}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end bg-black/10 sm:hidden"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            className="max-h-[calc(100dvh-2.5rem)] w-full overflow-y-auto rounded-t-[1.5rem] bg-white p-4 shadow-card-hover"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-display text-lg font-bold text-text-strong">{label}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-full px-4 text-sm font-semibold text-primary hover:bg-primary-container/60"
              >
                ปิด
              </button>
            </div>
            {searchable && (
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`ค้นหา${label}...`}
                className="mb-3 w-full rounded-control bg-surface-cream px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            )}
            <div className="max-h-[55dvh] overflow-y-auto">
              {filteredOptions.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-label">ไม่พบตัวเลือก</p>
              )}
              {filteredOptions.map((o, index) => {
                const checked = selected.includes(o.value);
                const optionId = `${listId}-mobile-${index}`;

                return (
                  <label
                    key={o.value}
                    htmlFor={optionId}
                    className={`flex min-h-11 w-full cursor-pointer touch-manipulation select-none items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors active:bg-primary-container/80 ${
                      checked
                        ? "bg-primary-container/70 font-semibold text-on-primary-container ring-1 ring-primary/20"
                        : "text-text hover:bg-surface-container-low"
                    }`}
                  >
                    <input
                      id={optionId}
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(o.value)}
                      className="h-5 w-5 shrink-0 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  </label>
                );
              })}
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-3 min-h-11 w-full touch-manipulation rounded-xl px-3 py-2.5 text-center text-sm font-semibold text-primary transition-colors hover:bg-surface-container-low active:bg-primary-container/70"
              >
                ล้างตัวเลือก
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
