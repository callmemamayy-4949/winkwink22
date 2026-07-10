export function Hero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-8 pt-10 text-center sm:pt-14">
      <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-gradient-primary text-white shadow-glow sm:h-18 sm:w-18">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden>
          <path d="M12 21s-6.7-4.35-9.3-8.1C.8 10.1 1.4 6.6 4.3 5.1c2.3-1.2 4.9-.4 6.4 1.4l1.3 1.6 1.3-1.6c1.5-1.8 4.1-2.6 6.4-1.4 2.9 1.5 3.5 5 1.6 7.8C18.7 16.65 12 21 12 21z" />
        </svg>
        {/* soft sparkle accents */}
        <span className="absolute -right-1.5 -top-1.5 text-lg" aria-hidden>✨</span>
        <span className="absolute -bottom-1 -left-1.5 text-sm opacity-80" aria-hidden>💗</span>
      </div>
      <h1 className="font-display text-headline-lg-mobile font-bold text-gradient-primary sm:text-headline-lg">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-body-sm leading-relaxed text-label sm:text-body-lg">
        {subtitle}
      </p>
    </div>
  );
}
