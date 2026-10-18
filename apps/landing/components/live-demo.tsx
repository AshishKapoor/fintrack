"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  CalendarClock,
  Home,
  LineChart,
  PieChart,
  ReceiptText,
  Smartphone,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { preload } from "react-dom";

// Screens captured from a real FinTrack instance running `manage.py seed_demo`
// (a year of transactions, envelopes and recurring bills). Recapture them after
// a visible UI change so the tour never drifts from the shipped app.
const SCREENS = [
  {
    id: "home",
    label: "Home",
    icon: Home,
    image: "/demo/home.webp",
    title: "What's left to spend, at a glance",
    body: "Home leads with the one number that matters this month, then flags what needs you: an overspent envelope, money not yet assigned, and bills due this week.",
    alt: "FinTrack Home showing $213.66 left to spend in October, a Needs attention list with an overspent Shopping envelope and two upcoming bills, envelope progress bars, and recent entries.",
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: ReceiptText,
    image: "/demo/transactions.webp",
    title: "Fast entry, real ledger",
    body: "Add an expense inline without leaving the list. Every entry is a balanced double-entry posting underneath, so balances always reconcile.",
    alt: "FinTrack Transactions table with an inline entry row and a month of categorised expenses such as Housing, Food and a StreamBox subscription.",
  },
  {
    id: "budgets",
    label: "Budgets",
    icon: PieChart,
    image: "/demo/budgets.webp",
    title: "Envelope budgeting that adds up",
    body: "Give every dollar a job. See assigned, spent and available per envelope, and cover an overspend from another envelope in one click.",
    alt: "FinTrack October budget with ready-to-assign money and seven envelopes listing assigned, spent and available amounts, with Shopping $98.67 over.",
  },
  {
    id: "insights",
    label: "Insights",
    icon: LineChart,
    image: "/demo/insights.webp",
    title: "Where your money actually goes",
    body: "Net worth over twelve months across every account, money in versus out, and recurring charges FinTrack spots on its own.",
    alt: "FinTrack Insights with a net worth chart rising steadily from November 2025 to October 2026, and an income and expenses chart below.",
  },
  {
    id: "mobile",
    label: "On your phone",
    icon: Smartphone,
    image: "/demo/home-phone.webp",
    title: "Built for the phone in your pocket",
    body: "The same app, laid out for one thumb: a tab bar, a big add button, and nothing to install. Add it to your home screen as a PWA.",
    alt: "FinTrack Home on a phone, with the left-to-spend headline, the Needs attention list, envelopes and a bottom tab bar with a central add button.",
  },
] as const;

const AUTO_ADVANCE_MS = 6000;

type LiveDemoProps = {
  // A hosted instance running docker-compose.demo.yml. When unset the tour
  // still works; the "open the live demo" button is simply not shown.
  demoUrl?: string;
  demoEmail?: string;
  demoPassword?: string;
};

export function LiveDemo({ demoUrl, demoEmail, demoPassword }: LiveDemoProps) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  // Once someone picks a screen themselves, stop moving it under them.
  const [touched, setTouched] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const onChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Warm the cache so switching screens never flashes.
  useEffect(() => {
    for (const item of SCREENS) preload(item.image, { as: "image" });
  }, []);

  const autoplay = !paused && !touched && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setTimeout(
      () => setActive((index) => (index + 1) % SCREENS.length),
      AUTO_ADVANCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [active, autoplay]);

  const select = useCallback((index: number, focus = false) => {
    setTouched(true);
    setActive(index);
    if (focus) tabRefs.current[index]?.focus();
  }, []);

  const onKeyDown = (event: React.KeyboardEvent) => {
    const last = SCREENS.length - 1;
    const next =
      event.key === "ArrowRight"
        ? active === last
          ? 0
          : active + 1
        : event.key === "ArrowLeft"
          ? active === 0
            ? last
            : active - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    select(next, true);
  };

  const screen = SCREENS[active];
  const isPhone = screen.id === "mobile";

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        role="tablist"
        aria-label="FinTrack screens"
        onKeyDown={onKeyDown}
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:justify-center"
      >
        {SCREENS.map((item, index) => {
          const Icon = item.icon;
          const selected = index === active;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role="tab"
              id={`demo-tab-${item.id}`}
              aria-selected={selected}
              aria-controls="demo-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => select(index)}
              className={cn(
                "relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                selected
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:text-emerald-700",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
              {selected && autoplay && (
                <span
                  key={active}
                  aria-hidden="true"
                  className="demo-progress absolute bottom-0 left-0 h-0.5 bg-white/70"
                  style={{ animationDuration: `${AUTO_ADVANCE_MS}ms` }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        id="demo-panel"
        role="tabpanel"
        aria-labelledby={`demo-tab-${screen.id}`}
        className="mt-6 grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_320px]"
      >
        <div className="flex justify-center">
          <div className={cn("relative", isPhone ? "w-[260px]" : "w-full")}>
            <div
              aria-hidden="true"
              className="absolute -top-6 -left-6 h-28 w-28 rounded-full bg-emerald-100 opacity-80 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-6 -right-6 h-36 w-36 rounded-full bg-emerald-100 opacity-80 blur-2xl"
            />

            {isPhone ? (
              <div className="relative w-full rounded-[2.5rem] border-[10px] border-gray-900 bg-gray-900 shadow-2xl">
                <img
                  src={screen.image}
                  alt={screen.alt}
                  width={780}
                  height={1688}
                  className="block w-full rounded-[1.8rem]"
                />
              </div>
            ) : (
              <div className="relative w-full overflow-hidden rounded-xl border bg-white shadow-2xl">
                <div
                  className="flex items-center gap-2 border-b bg-gray-50 px-4 py-2.5"
                  aria-hidden="true"
                >
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-amber-400" />
                  <span className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 hidden truncate rounded-md bg-white px-3 py-1 text-xs text-gray-500 sm:block sm:w-64">
                    your-fintrack.example/
                    {screen.id === "home" ? "" : screen.id}
                  </span>
                </div>
                <img
                  src={screen.image}
                  alt={screen.alt}
                  width={1920}
                  height={1200}
                  className="block h-auto w-full"
                />
              </div>
            )}
          </div>
        </div>

        <div className="text-center lg:text-left" aria-live="polite">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {active + 1} / {SCREENS.length} · {screen.label}
          </p>
          <h3 className="mt-2 text-2xl font-bold">{screen.title}</h3>
          <p className="mt-3 text-gray-600">{screen.body}</p>

          {demoUrl && (
            <div className="mt-6 space-y-3">
              <a href={demoUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="w-full sm:w-auto">
                  Open the live demo
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Button>
              </a>
              {demoEmail && demoPassword && (
                <p className="text-sm text-gray-500">
                  Sign in with{" "}
                  <code className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">
                    {demoEmail}
                  </code>{" "}
                  /{" "}
                  <code className="whitespace-nowrap rounded bg-gray-100 px-1.5 py-0.5 text-gray-800">
                    {demoPassword}
                  </code>
                  . Read-only, reset every hour.
                </p>
              )}
            </div>
          )}

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500 lg:justify-start">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
            Real screens from FinTrack's seeded demo account.
          </p>
        </div>
      </div>
    </div>
  );
}
