"use client";

import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Database,
  Eye,
  LineChart,
  Lock,
  Mail,
  PackageSearch,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  Upload
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api, CampaignReport, formatVnd, MerchantGoal, Recommendation, SearchResult } from "@/lib/api";

const goalLabels: Record<MerchantGoal, string> = {
  repeat_purchase: "Repeat purchase",
  clear_inventory: "Clear inventory",
  increase_aov: "Increase AOV",
  reactivate_dormant: "Reactivate dormant"
};

const quickQueries = [
  "gift under 300k for office worker",
  "oily skin sunscreen",
  "phone case for student budget",
  "add-on item for skincare order"
];

export default function Home() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("rec-repeat-skincare");
  const [goal, setGoal] = useState<MerchantGoal>("repeat_purchase");
  const [searchQuery, setSearchQuery] = useState(quickQueries[0]);

  const recommendationsQuery = useQuery({ queryKey: ["recommendations"], queryFn: api.recommendations });
  const reportsQuery = useQuery({ queryKey: ["reports"], queryFn: api.reports });
  const privacyQuery = useQuery({ queryKey: ["privacy"], queryFn: api.privacy });
  const searchQueryResult = useQuery({
    queryKey: ["search", searchQuery, goal],
    queryFn: () => api.search(searchQuery, goal),
    enabled: searchQuery.length > 1
  });

  const updateRecommendation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: "approved" | "rejected"; reason?: string }) =>
      api.updateRecommendation(id, status, undefined, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recommendations"] })
  });

  const recommendations = recommendationsQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const selected = recommendations.find((item) => item.id === selectedId) ?? recommendations[0];
  const report = selected ? reports.find((item) => item.recommendation_id === selected.id) : undefined;
  const activeApproved = recommendations.filter((item) => item.status === "approved").length;

  const chartData = useMemo(
    () =>
      reports.map((item) => ({
        id: item.recommendation_id.replace("rec-", "").replaceAll("-", " "),
        conversion: item.conversion_lift_percent,
        aov: item.aov_lift_percent
      })),
    [reports]
  );

  return (
    <main>
      <Announcement />
      <Hero
        activeApproved={activeApproved}
        recommendations={recommendations}
        reports={reports}
        selected={selected}
        isLoading={recommendationsQuery.isLoading}
      />

      <section id="cockpit" className="bg-[var(--color-parchment-canvas)] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-full max-w-[1200px] gap-8">
          <SectionIntro />

          <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="grid h-fit gap-5">
              <MerchantSetup goal={goal} setGoal={setGoal} />
              <PrivacyControls preferences={privacyQuery.data ?? []} isLoading={privacyQuery.isLoading} />
            </aside>

            <div className="grid gap-5">
              <TopMetrics recommendations={recommendations} reports={reports} isLoading={recommendationsQuery.isLoading} />

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(390px,0.9fr)]">
                <RecommendationQueue
                  recommendations={recommendations}
                  selectedId={selected?.id}
                  onSelect={setSelectedId}
                  isLoading={recommendationsQuery.isLoading}
                />
                <ExplainabilityPanel
                  recommendation={selected}
                  report={report}
                  isPending={updateRecommendation.isPending}
                  onApprove={() => selected && updateRecommendation.mutate({ id: selected.id, status: "approved" })}
                  onReject={() =>
                    selected &&
                    updateRecommendation.mutate({
                      id: selected.id,
                      status: "rejected",
                      reason: "Merchant marked this as too aggressive for brand tone."
                    })
                  }
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(390px,1.05fr)]">
                <SemanticSearch
                  query={searchQuery}
                  goal={goal}
                  results={searchQueryResult.data ?? []}
                  isLoading={searchQueryResult.isFetching}
                  onQueryChange={setSearchQuery}
                  onGoalChange={setGoal}
                />
                <PerformancePanel chartData={chartData} reports={reports} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function Announcement() {
  return (
    <div className="bg-[var(--color-aubergine)] px-4 py-3 text-[var(--color-bone)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2 text-sm font-medium sm:flex-row sm:items-center sm:justify-between">
        <span>Merchant Growth Copilot is running in mock CSV pilot mode.</span>
        <a className="rounded-2xl text-sm text-[var(--color-bone)] underline-offset-4 hover:underline" href="#cockpit">
          Open cockpit
        </a>
      </div>
    </div>
  );
}

function Hero({
  activeApproved,
  recommendations,
  reports,
  selected,
  isLoading
}: {
  activeApproved: number;
  recommendations: Recommendation[];
  reports: CampaignReport[];
  selected?: Recommendation;
  isLoading: boolean;
}) {
  const averageConversion = reports.length
    ? reports.reduce((sum, item) => sum + item.conversion_lift_percent, 0) / reports.length
    : 0;

  return (
    <section className="hero-photography relative min-h-screen overflow-hidden text-[var(--color-bone)]">
      <nav className="sticky top-0 z-20 border-b border-white/10 bg-white/8 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <a className="flex items-center gap-2 text-sm font-semibold" href="#">
            <Sparkles size={18} />
            Merchant Growth
          </a>
          <div className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a href="#cockpit">Dashboard</a>
            <a href="#search">Search</a>
            <a href="#reports">Reports</a>
          </div>
          <a className="rounded-lg bg-[var(--color-lavender-chip)] px-3 py-2 text-sm font-medium text-[var(--color-ink)]" href="#cockpit">
            Sign up
          </a>
        </div>
      </nav>

      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-[1200px] items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,0.94fr)_minmax(360px,0.76fr)] lg:px-8">
        <div className="reveal">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full glass-panel px-4 py-3 text-sm font-medium">
            <ShieldCheck size={16} />
            Human-approved AI commerce actions
          </div>
          <h1 className="max-w-4xl text-[48px] font-semibold leading-[0.96] tracking-normal sm:text-[64px]">
            Turn messy shop context into approved growth actions.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-7 text-white/88 sm:text-xl">
            A cinematic control room for semantic product search, explainable recommendations, privacy controls, and campaign lift reporting.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="hero-cta iris-focus inline-flex items-center gap-2 px-6 py-3 text-base font-medium" href="#cockpit">
              Get the cockpit
              <ArrowRight size={18} className="text-[var(--color-iris)]" />
            </a>
            <a className="glass-panel inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-medium" href="#search">
              Try search
            </a>
          </div>
        </div>

        <div className="relative grid gap-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">Today</span>
              <Database size={18} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <HeroStat label="Actions" value={isLoading ? "--" : String(recommendations.length)} />
              <HeroStat label="Lift" value={`${averageConversion.toFixed(1)}%`} />
              <HeroStat label="Approved" value={String(activeApproved)} />
            </div>
          </div>

          <div className="glass-panel ml-0 rounded-3xl p-5 shadow-none lg:ml-10">
            <div className="flex items-center gap-2 text-sm font-medium text-white/70">
              <Eye size={16} />
              Why this, why now
            </div>
            <h2 className="mt-3 text-2xl font-semibold leading-tight">{selected?.title ?? "Loading recommendation"}</h2>
            <p className="mt-3 text-sm leading-6 text-white/72">{selected?.risk_flag ?? "Preparing context from mock commerce data."}</p>
          </div>

          <div className="glass-panel mr-0 rounded-full px-5 py-4 text-sm font-medium text-white/86 lg:mr-16">
            Staff query: gift under 300k for office worker
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/12 p-3">
      <p className="text-xs text-white/65">{label}</p>
      <strong className="mt-1 block text-2xl font-semibold">{value}</strong>
    </div>
  );
}

function SectionIntro() {
  return (
    <div className="grid gap-5 border-b border-[var(--color-driftwood)] pb-8 lg:grid-cols-[0.9fr_0.6fr] lg:items-end">
      <div>
        <p className="mb-3 text-sm font-medium text-[var(--color-iris)]">AI commerce suite</p>
        <h2 className="max-w-3xl text-5xl font-semibold leading-none tracking-normal text-[var(--color-ink)]">
          All merchant decisions in one warm, explainable cockpit.
        </h2>
      </div>
      <p className="text-base leading-7 text-[var(--color-graphite)]">
        The panels below keep the original MVP workflow intact: configure data signals, rank recommendations, inspect evidence, approve exports, search products, and read lift.
      </p>
    </div>
  );
}

function MerchantSetup({
  goal,
  setGoal
}: {
  goal: MerchantGoal;
  setGoal: (goal: MerchantGoal) => void;
}) {
  return (
    <section className="bone-card p-4">
      <div className="flex items-center gap-2 text-[var(--color-iris)]">
        <Settings2 size={18} />
        <h2 className="text-2xl font-semibold tracking-normal text-[var(--color-ink)]">Growth setup</h2>
      </div>
      <div className="mt-5 rounded-2xl border border-[var(--color-fog)] bg-[var(--color-parchment-canvas)] p-4">
        <p className="text-xs font-medium text-[var(--color-graphite)]">Merchant</p>
        <p className="mt-1 font-semibold">Linh Cosmetics</p>
        <p className="text-sm leading-6 text-[var(--color-graphite)]">Cosmetics, personal care, accessories</p>
      </div>
      <label className="mt-5 block text-xs font-medium text-[var(--color-graphite)]" htmlFor="goal">
        Primary goal
      </label>
      <select
        id="goal"
        value={goal}
        onChange={(event) => setGoal(event.target.value as MerchantGoal)}
        className="iris-focus mt-2 w-full rounded-lg border border-[var(--color-fog)] bg-white px-3 py-3 text-sm text-[var(--color-ink)]"
      >
        {Object.entries(goalLabels).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <button className="ghost-iris flex items-center justify-center gap-2 px-3 py-2 font-medium">
          <Upload size={15} />
          CSV ready
        </button>
        <button className="ghost-iris flex items-center justify-center gap-2 px-3 py-2 font-medium">
          <ShieldCheck size={15} />
          Approval on
        </button>
      </div>
    </section>
  );
}

function PrivacyControls({
  preferences,
  isLoading
}: {
  preferences: { signal: string; enabled: boolean; description: string }[];
  isLoading: boolean;
}) {
  return (
    <section className="bone-card p-4">
      <div className="flex items-center gap-2 text-[var(--color-iris)]">
        <Lock size={18} />
        <h2 className="text-2xl font-semibold tracking-normal text-[var(--color-ink)]">Signal control</h2>
      </div>
      <div className="mt-5 space-y-3">
        {isLoading ? (
          <SkeletonLines count={4} />
        ) : (
          preferences.map((item) => (
            <div className="rounded-2xl border border-[var(--color-fog)] bg-white p-4" key={item.signal}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{item.signal.replace("_", " ")}</span>
                <span className={item.enabled ? "text-xs font-medium text-[var(--color-iris)]" : "text-xs text-[var(--color-graphite)]"}>
                  {item.enabled ? "Enabled" : "Paused"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-graphite)]">{item.description}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function TopMetrics({
  recommendations,
  reports,
  isLoading
}: {
  recommendations: Recommendation[];
  reports: CampaignReport[];
  isLoading: boolean;
}) {
  const averageConversion = reports.length
    ? reports.reduce((sum, item) => sum + item.conversion_lift_percent, 0) / reports.length
    : 0;
  const totalTime = reports.reduce((sum, item) => sum + item.estimated_time_saved_hours, 0);

  return (
    <section className="grid gap-3 md:grid-cols-4">
      <Metric label="Growth actions" value={isLoading ? "--" : String(recommendations.length)} icon={<PackageSearch size={20} />} />
      <Metric label="Avg conversion lift" value={`${averageConversion.toFixed(1)}%`} icon={<LineChart size={20} />} />
      <Metric label="Planning time saved" value={`${totalTime.toFixed(1)}h`} icon={<Mail size={20} />} />
      <Metric label="Approval mode" value="Human" icon={<ShieldCheck size={20} />} />
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="bone-card p-4">
      <div className="flex items-center justify-between text-[var(--color-graphite)]">
        <span className="text-xs font-medium">{label}</span>
        {icon}
      </div>
      <strong className="mt-4 block text-4xl font-semibold leading-none tracking-normal">{value}</strong>
    </article>
  );
}

function RecommendationQueue({
  recommendations,
  selectedId,
  onSelect,
  isLoading
}: {
  recommendations: Recommendation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <section className="bone-card p-4">
      <PanelTitle eyebrow="Ranked by expected value" title="Action queue" icon={<BarChart3 size={20} />} />
      <div className="mt-5 space-y-3">
        {isLoading ? (
          <SkeletonLines count={3} />
        ) : (
          recommendations.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`iris-focus group w-full rounded-2xl border p-4 text-left transition ${
                selectedId === item.id
                  ? "border-[var(--color-iris)] bg-[var(--color-fog)]"
                  : "border-[var(--color-fog)] bg-white hover:border-[var(--color-iris)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-3xl font-semibold leading-none text-[var(--color-iris)]">{String(index + 1).padStart(2, "0")}</span>
                <ChevronRight className="mt-1 shrink-0 text-[var(--color-iris)] transition group-hover:translate-x-1" size={18} />
              </div>
              <h3 className="mt-3 text-xl font-semibold leading-tight tracking-normal">{item.title}</h3>
              <div className="mt-4 grid gap-2 text-sm text-[var(--color-graphite)] sm:grid-cols-2">
                <span>{item.action_type}</span>
                <span>{Math.round(item.confidence * 100)}% confidence</span>
                <span>{item.timing}</span>
                <span className="capitalize">{item.status}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function ExplainabilityPanel({
  recommendation,
  report,
  isPending,
  onApprove,
  onReject
}: {
  recommendation?: Recommendation;
  report?: CampaignReport;
  isPending: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  if (!recommendation) {
    return (
      <section className="bone-card min-h-[420px] p-5">
        <SkeletonLines count={8} />
      </section>
    );
  }

  return (
    <section className="bone-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--color-iris)]">
            <Eye size={16} />
            Why this, why now
          </p>
          <h2 className="mt-2 text-4xl font-semibold leading-none tracking-normal">{recommendation.action_type}</h2>
        </div>
        <span className="rounded-lg border border-[var(--color-fog)] px-3 py-2 text-xs text-[var(--color-graphite)]">{recommendation.status}</span>
      </div>

      <p className="mt-5 text-xl font-semibold leading-snug">{recommendation.title}</p>
      <p className="mt-3 text-[var(--color-graphite)]">{recommendation.target_segment}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {recommendation.products.map((product) => (
          <article className="rounded-2xl border border-[var(--color-fog)] bg-[var(--color-parchment-canvas)] p-4" key={product.id}>
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="mt-2 text-xs text-[var(--color-graphite)]">{formatVnd(product.price_vnd)}</p>
            <p className="mt-1 text-xs font-medium text-[var(--color-iris)]">{product.stock} in stock</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--color-fog)] bg-[var(--color-parchment-canvas)] p-4">
        <div className="flex items-center gap-2 text-[var(--color-iris)]">
          <ShieldCheck size={17} />
          <span className="text-sm font-medium">Risk flag</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--color-graphite)]">{recommendation.risk_flag}</p>
      </div>

      <div className="mt-5 space-y-2">
        {recommendation.evidence.map((item) => (
          <div className="flex gap-3 border-b border-[var(--color-fog)] pb-2 text-sm leading-6 text-[var(--color-graphite)]" key={item}>
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-iris)]" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-[var(--color-fog)] bg-[var(--color-parchment-canvas)] p-4">
        <p className="text-xs font-medium text-[var(--color-iris)]">Editable campaign copy</p>
        <p className="mt-2 text-lg font-semibold leading-snug">{recommendation.campaign_copy}</p>
      </div>

      {report && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MiniStat label="Expected conversion lift" value={`${report.conversion_lift_percent}%`} />
          <MiniStat label="Estimated time saved" value={`${report.estimated_time_saved_hours}h`} />
        </div>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onApprove}
          disabled={isPending}
          className="iris-focus flex items-center justify-center gap-2 rounded-lg bg-[var(--color-aubergine)] px-4 py-3 font-medium text-white transition hover:bg-[var(--color-aubergine-deep)] disabled:opacity-55"
        >
          <Check size={18} />
          Approve export
        </button>
        <button
          onClick={onReject}
          disabled={isPending}
          className="ghost-iris flex items-center justify-center gap-2 px-4 py-3 font-medium disabled:opacity-55"
        >
          <ThumbsDown size={18} />
          Reject
        </button>
      </div>
    </section>
  );
}

function SemanticSearch({
  query,
  goal,
  results,
  isLoading,
  onQueryChange,
  onGoalChange
}: {
  query: string;
  goal: MerchantGoal;
  results: SearchResult[];
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onGoalChange: (goal: MerchantGoal) => void;
}) {
  return (
    <section id="search" className="bone-card p-5">
      <PanelTitle eyebrow="Staff semantic search" title="Buyer intent lookup" icon={<Search size={20} />} />
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_190px]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="iris-focus w-full rounded-lg border border-[var(--color-fog)] bg-white px-4 py-3 text-[var(--color-ink)] placeholder:text-[var(--color-graphite)]"
          placeholder="Search by customer need, budget, occasion..."
        />
        <select
          value={goal}
          onChange={(event) => onGoalChange(event.target.value as MerchantGoal)}
          className="iris-focus rounded-lg border border-[var(--color-fog)] bg-white px-3 py-3 text-[var(--color-ink)]"
        >
          {Object.entries(goalLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickQueries.map((item) => (
          <button key={item} onClick={() => onQueryChange(item)} className="ghost-iris px-3 py-2 text-xs font-medium">
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <SkeletonLines count={4} />
        ) : (
          results.map((result) => (
            <article className="rounded-2xl border border-[var(--color-fog)] bg-white p-4" key={result.product.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{result.product.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-graphite)]">{result.match_reason}</p>
                </div>
                <span className="rounded-lg border border-[var(--color-iris)] px-2 py-1 text-xs font-medium text-[var(--color-iris)]">
                  {result.score.toFixed(1)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.product.tags.slice(0, 4).map((tag) => (
                  <span className="rounded-full bg-[var(--color-fog)] px-3 py-1 text-xs text-[var(--color-graphite)]" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function PerformancePanel({ chartData, reports }: { chartData: { id: string; conversion: number; aov: number }[]; reports: CampaignReport[] }) {
  const [mounted, setMounted] = useState(false);
  const moved = reports.reduce((sum, item) => sum + item.inventory_units_moved, 0);
  const repeat = reports.reduce((sum, item) => sum + item.repeat_orders, 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section id="reports" className="bone-card p-5">
      <PanelTitle eyebrow="Personalized vs generic" title="Campaign lift" icon={<BarChart3 size={20} />} />
      <div className="mt-5 h-[280px] min-h-[280px] min-w-0 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
            <BarChart data={chartData} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e3e3e2" vertical={false} />
              <XAxis dataKey="id" stroke="#666666" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#666666" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(113,76,182,0.08)" }}
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid #e3e3e2",
                  borderRadius: "16px",
                  color: "#292827"
                }}
              />
              <Bar dataKey="conversion" fill="#714cb6" radius={[8, 8, 0, 0]} />
              <Bar dataKey="aov" fill="#d4c7ff" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse rounded-2xl border border-[var(--color-fog)] bg-[var(--color-parchment-canvas)]" />
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniStat label="Inventory units moved" value={String(moved)} />
        <MiniStat label="Repeat orders influenced" value={String(repeat)} />
      </div>
    </section>
  );
}

function PanelTitle({ eyebrow, title, icon }: { eyebrow: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium text-[var(--color-iris)]">{eyebrow}</p>
        <h2 className="mt-1 text-3xl font-semibold leading-tight tracking-normal">{title}</h2>
      </div>
      <span className="text-[var(--color-iris)]">{icon}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-fog)] bg-white p-4">
      <p className="text-xs text-[var(--color-graphite)]">{label}</p>
      <strong className="mt-1 block text-3xl font-semibold leading-none tracking-normal">{value}</strong>
    </div>
  );
}

function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-12 animate-pulse rounded-2xl bg-[var(--color-fog)]" key={index} />
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-[var(--color-aubergine)] px-4 py-10 text-[var(--color-bone)] sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Sparkles size={18} />
            Merchant Growth
          </div>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
            Explainable AI recommendations for merchants who want speed without losing control.
          </p>
        </div>
        <div className="grid gap-5 text-sm sm:grid-cols-3">
          <a href="#cockpit">Dashboard</a>
          <a href="#search">Product search</a>
          <a href="#reports">Campaign reports</a>
        </div>
      </div>
    </footer>
  );
}
