import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { profile } from "@/content/profile";

const TABS = ["About", "Work", "Journey", "Contact"] as const;
type Tab = (typeof TABS)[number];

export function ProfileTabs({ onTabChange }: { onTabChange?: (tab: Tab) => void }) {
  const [active, setActive] = useState<Tab>("About");
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  // sliding underline follows the active tab; re-measure when fonts load or the layout resizes
  useLayoutEffect(() => {
    const el = tabRefs.current[TABS.indexOf(active)];
    if (!el) return;
    const measure = () => setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  const select = (t: Tab) => {
    if (t === active) return;
    setActive(t);
    onTabChange?.(t);
  };

  const onKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(active);
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : -1;
    if (next < 0) return;
    e.preventDefault();
    const t = TABS[next];
    if (t) select(t);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="pointer-events-auto mt-8 max-w-md">
      <div
        role="tablist"
        aria-label="Profile sections"
        onKeyDown={onKey}
        className="relative flex gap-6 border-b border-border"
      >
        {TABS.map((t, i) => (
          <button
            key={t}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            role="tab"
            id={`tab-${t}`}
            aria-selected={active === t}
            aria-controls={`panel-${t}`}
            tabIndex={active === t ? 0 : -1}
            onClick={() => select(t)}
            className={`pb-3 text-[10px] uppercase tracking-[0.3em] transition-colors focus-visible:outline-none focus-visible:text-foreground ${active === t ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}
          >
            {t}
          </button>
        ))}
        <span
          aria-hidden
          className="absolute -bottom-px h-px bg-primary transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>

      {/* fixed height keeps the layout steady while switching tabs */}
      <div
        key={active}
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="h-[270px] overflow-y-auto pt-6 animate-in fade-in slide-in-from-bottom-2 duration-500 [scrollbar-width:none]"
      >
        {active === "About" && <About />}
        {active === "Work" && <Work />}
        {active === "Journey" && <Journey />}
        {active === "Contact" && <Contact />}
      </div>
    </div>
  );
}

function About() {
  const { bio, focus, stats } = profile.about;
  return (
    <div>
      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{bio}</p>
      <div className="mt-5 flex flex-wrap gap-2">
        {focus.map((f) => (
          <span
            key={f}
            className="rounded-full border border-border px-3 py-1 text-[10px] uppercase tracking-widest text-foreground/80"
          >
            {f}
          </span>
        ))}
      </div>
      <dl className="mt-6 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="sr-only">{s.label}</dt>
            <dd className="font-display text-3xl leading-none text-primary">{s.value}</dd>
            <dd className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {s.label}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Work() {
  return (
    <ul className="-mx-3 space-y-1">
      {profile.work.map((w) => (
        <li key={w.title}>
          <a
            href={w.href}
            className="group block rounded-xl px-3 py-2.5 transition-colors hover:bg-card/70"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] tabular-nums tracking-widest text-muted-foreground">
                {w.year}
              </span>
              <span className="font-display text-xl leading-none">{w.title}</span>
              <span className="ml-auto text-primary opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100">
                →
              </span>
            </div>
            <p className="mt-1 pl-[42px] text-xs leading-relaxed text-muted-foreground">
              {w.summary}
            </p>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Journey() {
  return (
    <ol className="relative ml-1 border-l border-border">
      {profile.journey.map((j, i) => (
        <li key={j.period} className="relative pb-4 pl-5 last:pb-0">
          <span
            className={`absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full ${i === 0 ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-muted-foreground/50"}`}
          />
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {j.period}
          </p>
          <p className="mt-0.5 text-sm">
            <span className="text-foreground">{j.role}</span>{" "}
            <span className="text-muted-foreground">· {j.org}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}

function Contact() {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied("idle"), 1800);
  };
  return (
    <div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {profile.availability}
      </p>
      <button
        onClick={copy}
        className="group mt-5 flex w-full items-center justify-between rounded-xl border border-border bg-card/40 px-4 py-3 text-left transition-colors hover:bg-card/80"
      >
        <span className="font-display text-xl">{profile.email}</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground group-hover:text-foreground">
          {copied === "copied" ? "Copied ✓" : copied === "failed" ? "Copy failed" : "Copy"}
        </span>
      </button>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href={`mailto:${profile.email}`}
          className="rounded-full bg-primary px-6 py-2.5 text-xs font-medium uppercase tracking-widest text-primary-foreground"
        >
          Write to me
        </a>
        {profile.links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border px-5 py-2.5 text-xs uppercase tracking-widest hover:bg-accent"
          >
            {l.label}
          </a>
        ))}
      </div>
    </div>
  );
}
