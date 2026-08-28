import { FaqAccordion } from "@/components/faq-accordion";
import { FeatureCard } from "@/components/feature-card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Code2,
  Coins,
  CreditCard,
  Landmark,
  PieChart,
  PiggyBank,
  Shield,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

// Where the running FinTrack app lives. Self-hosters can point this page at
// their own instance with NEXT_PUBLIC_APP_URL.
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://fintrack.sannty.in";

const GITHUB_URL = "https://github.com/AshishKapoor/fintrack";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <img
              src="/apple-touch-icon.png"
              alt="FinTrack Logo"
              className="h-8 w-8"
            />
            <span className="text-xl font-bold">FinTrack</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="#features"
              className="text-sm font-medium hover:text-emerald-600 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#comparison"
              className="text-sm font-medium hover:text-emerald-600 transition-colors"
            >
              Compare
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm font-medium hover:text-emerald-600 transition-colors"
            >
              How It Works
            </Link>
            {/* <Link
              href="#testimonials"
              className="text-sm font-medium hover:text-emerald-600 transition-colors"
            >
              Testimonials
            </Link> */}
            <Link
              href="#faq"
              className="text-sm font-medium hover:text-emerald-600 transition-colors"
            >
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/AshishKapoor/fintrack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="GitHub Repository"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
            <Link href={APP_URL}>
              <Button variant="ghost" className="hidden md:inline-flex">
                Log in
              </Button>
            </Link>
            <Link href={`${APP_URL}/register`}>
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 md:pt-32 pb-16 md:pb-24 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
                Your Financial Success{" "}
                <span className="text-emerald-600">Starts Here</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-[600px]">
                FinTrack is a free, open source, self-hosted personal finance
                tracker built on a real double-entry ledger — with bank sync,
                multi-currency, and insights that show you where your money
                actually goes. No subscriptions, no third party holding your
                data.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 justify-center md:justify-start">
                <Link href={`${APP_URL}/register`}>
                  <Button size="lg" className="w-full sm:w-auto">
                    Start for Free
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    See How It Works
                  </Button>
                </Link>
              </div>

              <div className="pt-4">
                <a
                  href="https://www.producthunt.com/posts/fintrack-by-sannty?embed=true&utm_source=badge-featured&utm_medium=badge&utm_source=badge-fintrack&#0045;by&#0045;sannty"
                  target="_blank"
                >
                  <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=969284&theme=light&t=1748012863579"
                    alt="Fintrack By Sannty - You Financial Success Starts Here | Product Hunt"
                    style={{ width: 250, height: 54 }}
                    width="250"
                    height="54"
                  />
                </a>
              </div>

              <div className="pt-4 text-sm text-gray-500">
                100% Free & Open Source • No hidden costs, ever!
              </div>
            </div>
            <div className="flex-1 w-full max-w-[600px]">
              <div className="relative">
                <div className="absolute -top-6 -left-6 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-80"></div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-emerald-100 rounded-full blur-2xl opacity-80"></div>
                <div className="relative bg-white border rounded-2xl shadow-xl overflow-hidden">
                  <img
                    src="/dashboard.png"
                    alt="FinTrack dashboard showing accounts, budgets, and net worth"
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-16 md:py-24 bg-gray-100">
        <div className="container mx-auto px-4 md:px-6 flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-6 text-center">
            Watch FinTrack in Action
          </h2>
          <div className="w-full flex justify-center">
            <div
              className="w-full max-w-3xl rounded-xl overflow-hidden shadow-lg border"
              style={{ aspectRatio: "16/9", minHeight: 360 }}
            >
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube-nocookie.com/embed/U6PLu4QR9xw?si=uEdOUB4oO8yWFqM3"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                style={{ minHeight: 360 }}
              ></iframe>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Powerful Features for Your Finances
            </h2>
            <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
              Everything you need to manage your money effectively in one place
            </p>

            <div className="flex justify-center md:justify-center mt-8">
              <svg
                width="900"
                height="400"
                viewBox="0 0 900 400"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-auto max-w-4xl"
              >
                <style>
                  {`.circle {
                    fill: white;
                    stroke-width: 8;
                    filter: drop-shadow(0px 4px 8px rgba(0,0,0,0.15));
                  }
                  .arrow {
                    fill: none;
                    stroke-width: 48;
                    stroke-linecap: round;
                  }
                  .label {
                    font-family: 'Segoe UI', sans-serif;
                    text-anchor: middle;
                  }
                  @media (max-width: 768px) {
                    .arrow {
                      stroke-width: 32;
                    }
                    .circle {
                      stroke-width: 6;
                    }
                  }`}
                </style>

                {/* Step 1: Category */}
                <path
                  d="M200 220 A80 80 0 0 1 280 140"
                  stroke="#e74c3c"
                  className="arrow"
                />
                <polygon points="280,140 270,120 290,120" fill="#e74c3c" />
                <circle
                  cx="200"
                  cy="220"
                  r="80"
                  stroke="#e74c3c"
                  className="circle"
                />
                <text
                  x="200"
                  y="215"
                  fontSize="18"
                  className="label"
                  fill="#e74c3c"
                  fontWeight="700"
                >
                  Category
                </text>
                <text
                  x="200"
                  y="235"
                  fontSize="12"
                  className="label"
                  fill="#7f8c8d"
                >
                  Food, Bills
                </text>

                {/* Step 2: Budget */}
                <path
                  d="M450 280 A80 80 0 0 1 370 200"
                  stroke="#1abc9c"
                  className="arrow"
                />
                <polygon points="370,200 360,180 380,180" fill="#1abc9c" />
                <circle
                  cx="450"
                  cy="280"
                  r="60"
                  stroke="#1abc9c"
                  className="circle"
                />
                <text
                  x="450"
                  y="275"
                  fontSize="18"
                  className="label"
                  fill="#1abc9c"
                  fontWeight="700"
                >
                  Budget
                </text>
                <text
                  x="450"
                  y="295"
                  fontSize="12"
                  className="label"
                  fill="#7f8c8d"
                >
                  Plan & Limits
                </text>

                {/* Step 3: Transactions */}
                <path
                  d="M700 220 A80 80 0 0 0 620 140"
                  stroke="#f39c12"
                  className="arrow"
                />
                <polygon points="620,140 610,120 630,120" fill="#f39c12" />
                <circle
                  cx="700"
                  cy="220"
                  r="80"
                  stroke="#f39c12"
                  className="circle"
                />
                <text
                  x="700"
                  y="215"
                  fontSize="18"
                  className="label"
                  fill="#f39c12"
                  fontWeight="700"
                >
                  Transactions
                </text>
                <text
                  x="700"
                  y="235"
                  fontSize="12"
                  className="label"
                  fill="#7f8c8d"
                >
                  Track Spend
                </text>
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<CreditCard className="h-10 w-10 text-emerald-600" />}
              title="Double-Entry Ledger"
              description="A real accounting model, not a list of amounts: every transaction is a set of postings, and the database itself refuses to save them unless they sum to zero."
            />
            <FeatureCard
              icon={<PieChart className="h-10 w-10 text-emerald-600" />}
              title="Envelope Budgeting"
              description="Set monthly budgets by category with envelope assignments, and track progress live instead of finding out you overspent at month's end."
            />
            <FeatureCard
              icon={<Landmark className="h-10 w-10 text-emerald-600" />}
              title="Get Your Data In"
              description="Connect your bank through GoCardless (EU/UK) or SimpleFIN (US/CA), or import CSV, OFX, QIF, YNAB, Actual Budget, and Firefly III exports — all through the same dedup and rules engine."
            />
            <FeatureCard
              icon={<Coins className="h-10 w-10 text-emerald-600" />}
              title="Real Multi-Currency"
              description="Every account has its own currency, with daily exchange rates fetched automatically. Balances and net worth actually convert — it's not just a label."
            />
            <FeatureCard
              icon={<BarChart3 className="h-10 w-10 text-emerald-600" />}
              title="Insights Dashboard"
              description="A cash-flow Sankey diagram, net worth over time, and month-over-month category comparisons show you where your money really goes."
            />
            <FeatureCard
              icon={<PiggyBank className="h-10 w-10 text-emerald-600" />}
              title="Goals & Debt Payoff"
              description="Savings goals track progress live from your balance. Snowball and avalanche debt projections show exactly when you'll be debt-free."
            />
            <FeatureCard
              icon={<Sparkles className="h-10 w-10 text-emerald-600" />}
              title="Subscriptions & Smart Categorization"
              description="Recurring charges are surfaced automatically from your transaction history, and optional AI categorization suggests categories for new payees — off by default, never required."
            />
            <FeatureCard
              icon={<Users className="h-10 w-10 text-emerald-600" />}
              title="Shared Workspaces"
              description="Owner, admin, member, and viewer roles with invitations and a manager-visible audit log — built in, no external identity provider needed."
            />
            <FeatureCard
              icon={<Smartphone className="h-10 w-10 text-emerald-600" />}
              title="Mobile & Keyboard-First Entry"
              description="A one-tap Quick Add screen for your phone that works offline, plus an always-on inline row and command palette (⌘K) for fast entry on desktop."
            />
            <FeatureCard
              icon={<Bell className="h-10 w-10 text-emerald-600" />}
              title="Notifications"
              description="Budget threshold alerts, bill reminders, and a weekly digest by email, ntfy, or webhook — all opt-in and off by default."
            />
            <FeatureCard
              icon={<Code2 className="h-10 w-10 text-emerald-600" />}
              title="API-First, For Real"
              description="An OpenAPI schema is the contract CI enforces, driving official TypeScript and Python SDKs published from this repo — not community afterthoughts."
            />
            <FeatureCard
              icon={<Shield className="h-10 w-10 text-emerald-600" />}
              title="Secure & Private"
              description="You host it, so there is no third party to share it with. Bank credentials are encrypted at rest, backups are encrypted in your browser, and there is no telemetry."
            />
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section id="comparison" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How FinTrack Compares</h2>
            <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
              Every open-source finance tracker trades off something. Here's
              the honest comparison, not the flattering one.
            </p>
          </div>

          <div className="max-w-4xl mx-auto overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm md:text-base border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left font-semibold p-4 whitespace-nowrap">
                    &nbsp;
                  </th>
                  <th className="text-left font-semibold p-4 whitespace-nowrap text-emerald-700 bg-emerald-50">
                    FinTrack
                  </th>
                  <th className="text-left font-semibold p-4 whitespace-nowrap">
                    Actual Budget
                  </th>
                  <th className="text-left font-semibold p-4 whitespace-nowrap">
                    Firefly III
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">License</td>
                  <td className="p-4 bg-emerald-50/60">MIT</td>
                  <td className="p-4">MIT</td>
                  <td className="p-4">AGPL-3.0</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">
                    Ledger model
                  </td>
                  <td className="p-4 bg-emerald-50/60">
                    Double-entry, DB-enforced
                  </td>
                  <td className="p-4">Envelope budgeting (not double-entry)</td>
                  <td className="p-4">Double-entry</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">
                    Shared budgets
                  </td>
                  <td className="p-4 bg-emerald-50/60">
                    Owner/admin/member/viewer roles, built in
                  </td>
                  <td className="p-4">
                    Basic/Admin roles, needs an external OIDC provider first
                  </td>
                  <td className="p-4">
                    Isolated single-user accounts, not a shared budget
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">Bank sync</td>
                  <td className="p-4 bg-emerald-50/60">
                    GoCardless (EU/UK, free), SimpleFIN (US/CA)
                  </td>
                  <td className="p-4">
                    GoCardless, SimpleFIN (paid), Akahu, more
                  </td>
                  <td className="p-4">Via a companion Data Importer</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">
                    Multi-currency
                  </td>
                  <td className="p-4 bg-emerald-50/60">
                    Per-account, daily rates fetched automatically
                  </td>
                  <td className="p-4">Per-account currency</td>
                  <td className="p-4">Per-account currency</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium text-gray-900">
                    REST API &amp; SDKs
                  </td>
                  <td className="p-4 bg-emerald-50/60">
                    OpenAPI + official TypeScript/Python SDKs
                  </td>
                  <td className="p-4">None (Node.js scripting library only)</td>
                  <td className="p-4">OpenAPI, community SDKs</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-gray-900">Audit log</td>
                  <td className="p-4 bg-emerald-50/60">
                    Yes, manager-visible per workspace
                  </td>
                  <td className="p-4">No</td>
                  <td className="p-4">No</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-center text-gray-500 max-w-2xl mx-auto mt-6 text-sm">
            If you value ledger correctness, real shared workspaces, and an
            exchange rate that actually updates, FinTrack is worth trying.
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How FinTrack Works</h2>
            <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
              Getting started is easy - be up and running in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-emerald-600">1</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Create an Account</h3>
              <p className="text-gray-600">
                Sign up for free and set up your profile in just a few clicks.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-emerald-600">2</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Track Your Finances</h3>
              <p className="text-gray-600">
                Log your transactions and categorize your spending habits.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-emerald-600">3</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Gain Insights</h3>
              <p className="text-gray-600">
                Get personalized reports and recommendations to improve your
                finances.
              </p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <Link href={`${APP_URL}/register`}>
              <Button size="lg" className="gap-2">
                Get Started Now <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-20 max-w-2xl mx-auto">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold mb-2">
                Prefer to run it yourself?
              </h3>
              <p className="text-gray-600">
                FinTrack is self-hosted software. Spin up the whole stack —
                web, API, Postgres, Redis — with one command.
              </p>
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-xl p-4 text-sm overflow-x-auto">
              <code>{`git clone https://github.com/AshishKapoor/fintrack.git
cd fintrack
./setup.sh start`}</code>
            </pre>
            <div className="flex flex-col items-center gap-3 mt-6">
              <a
                href="https://render.com/deploy?repo=https://github.com/AshishKapoor/fintrack"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  src="https://render.com/images/deploy-to-render-button.svg"
                  alt="Deploy to Render"
                  width={170}
                  height={38}
                />
              </a>
              <a
                href={`${GITHUB_URL}#-quick-start`}
                className="text-sm text-emerald-700 hover:text-emerald-800 underline underline-offset-4"
              >
                More deploy options (Railway, PikaPods, Unraid, TrueNAS)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600 max-w-[800px] mx-auto">
              Find answers to common questions about FinTrack
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <FaqAccordion />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-emerald-50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Start Your Financial Journey Today
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Self-host FinTrack in a few minutes and keep your financial data on your own server.
              Completely free, open source, and always will be.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={`${APP_URL}/register`}>
                <Button size="lg" className="w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link href="https://github.com/AshishKapoor/fintrack">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  View on GitHub
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 md:py-16 bg-gray-900 text-gray-300">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img
                  src="/apple-touch-icon.png"
                  alt="FinTrack Logo"
                  className="h-8 w-8"
                />
                <span className="text-xl font-bold text-white">FinTrack</span>
              </div>
              <p className="text-gray-400 mb-4">
                Your personal finance tracker for better money management and
                financial freedom.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://twitter.com/ashshkapoor"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a
                  href="https://github.com/AshishKapoor/fintrack"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">GitHub</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/ashshkapoor/"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="h-6 w-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#comparison"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Compare
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}#-api`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    API
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}/blob/main/ROADMAP.md`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Roadmap
                  </a>
                </li>
                <li>
                  <a
                    href={`${GITHUB_URL}/releases`}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Releases
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://sannty.in/"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:ashish@sannty.in"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                {/* <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Community
                  </a>
                </li> */}
                <li>
                  <a
                    href="https://zero1byzerodha.com/home"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Financial Guides
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="https://sannty.in/about"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                {/* <li>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Careers
                  </a>
                </li> */}
                <li>
                  <a
                    href="mailto:ashish@sannty.in"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.termsfeed.com/live/da7607f6-24a2-4b13-bc67-f966752e5e59"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 mt-8 border-t border-gray-800 text-center text-gray-400 text-sm">
            <p>
              &copy; {new Date().getFullYear()} FinTrack by Sannty. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
