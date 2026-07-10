"use client";

import { useState } from "react";

/** Falls back to a brand-toned pastel placeholder when the source media
 * fails to load (dead scraped CDN link, blocked hotlink, etc.). */
export function ReviewImage({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-container to-pastel-purple">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-10 w-10 text-primary/60"
          aria-hidden
        >
          <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.3 5.1c2.3-1.2 4.9-.4 6.4 1.4l1.3 1.6 1.3-1.6c1.5-1.8 4.1-2.6 6.4-1.4 2.9 1.5 3.5 5 1.6 7.8C18.7 16.65 12 21 12 21z" />
        </svg>
      </div>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  );
}
