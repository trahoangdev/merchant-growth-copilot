"use client";

import {
  AlertTriangle,
  BarChart3,
  Check,
  ChevronRight,
  Database,
  Eye,
  LineChart,
  Lock,
  PackageSearch,
  RefreshCw,
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

  const recommendationsQuery = useQuery({
    queryKey: ["recommendations"],
    queryFn: api.recommendations
  });
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
  const selected = recommendations.find((item) => item.id === selectedId) ?? recommendations[0];
  const reports = reportsQuery.data ?? [];
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
    <main className="min-h-screen">
      <Header activeApproved={activeApproved} />

      <div className="mx-auto grid w-full max-w-[1500px] gap-5 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="technical-frame reveal h-fit bg-surface/88 p-4 backdrop-blur">
          <MerchantSetup goal={goal} setGoal={setGoal} />
          <PrivacyControls preferences={privacyQuery.data ?? []} isLoading={privacyQuery.isLoading} />
        </aside>

        <section className="grid gap-5">
          <TopMetrics recommendations={recommendations} reports={reports} isLoading={recommendationsQuery.isLoading} />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
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

          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
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
        </section>
      </div>
    </main>
  );
}

function Header({ activeApproved }: { activeApproved: number }) {
  return (
    <header className="border-b border-line bg-bg/84 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase text-primary">
            <span className="inline-flex items-center gap-2">
              <Sparkles size={16} />
              Merchant Growth Copilot
            </span>
            <span className="h-px w-10 bg-primary" />
            <span>AI commerce control room</span>
          </div>
          <h1 className="mt-2 max-w-4xl font-display text-[clamp(2.1rem,5vw,5.6rem)] uppercase leading-[0.95] tracking-normal">
            Turn messy shop context into approved growth actions.
          </h1>
        </div>
        <div className="grid min-w-[260px] grid-cols-2 gap-2 text-sm">
          <StatusTile label="Data mode" value="Mock CSV" icon={<Database size={18} />} />
          <StatusTile label="Approved" value={String(activeApproved)} icon={<Check size={18} />} />
        </div>
      </div>
    </header>
  );
}

function StatusTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="technical-frame bg-surface px-4 py-3">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs uppercase">{label}</span>
        {icon}
      </div>
      <strong className="mt-2 block font-display text-2xl uppercase">{value}</strong>
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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Settings2 size={18} className="text-primary" />
        <h2 className="font-display text-2xl uppercase">Growth setup</h2>
      </div>
      <div className="scanline border border-line bg-bg/70 p-3">
        <p className="text-xs uppercase text-muted">Merchant</p>
        <p className="mt-1 font-semibold">Linh Cosmetics</p>
        <p className="text-sm text-muted">Cosmetics, personal care, accessories</p>
      </div>
      <label className="block text-xs font-semibold uppercase text-muted" htmlFor="goal">
        Primary goal
      </label>
      <select
        id="goal"
        value={goal}
        onChange={(event) => setGoal(event.target.value as MerchantGoal)}
        className="w-full border border-line bg-bg px-3 py-3 text-sm text-text outline-none transition focus:border-primary"
      >
        {Object.entries(goalLabels).map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <button className="flex items-center justify-center gap-2 border border-line bg-bg px-3 py-2 uppercase text-muted transition hover:border-primary hover:text-primary">
          <Upload size={15} />
          CSV ready
        </button>
        <button className="flex items-center justify-center gap-2 border border-line bg-bg px-3 py-2 uppercase text-muted transition hover:border-accent hover:text-accent">
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
    <section className="mt-8 space-y-3">
      <div className="flex items-center gap-2">
        <Lock size={18} className="text-accent" />
        <h2 className="font-display text-xl uppercase">Signal control</h2>
      </div>
      {isLoading ? (
        <SkeletonLines count={4} />
      ) : (
        preferences.map((item) => (
          <div className="border border-line bg-bg/70 p-3" key={item.signal}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold uppercase">{item.signal.replace("_", " ")}</span>
              <span className={item.enabled ? "text-xs text-accent" : "text-xs text-muted"}>
                {item.enabled ? "Enabled" : "Paused"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
          </div>
        ))
      )}
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
      <Metric label="Planning time saved" value={`${totalTime.toFixed(1)}h`} icon={<RefreshCw size={20} />} />
      <Metric label="Approval mode" value="Human" icon={<ShieldCheck size={20} />} />
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <article className="technical-frame reveal bg-panel p-4 text-[var(--ink)]">
      <div className="flex items-center justify-between text-[var(--ink)]/70">
        <span className="text-xs font-bold uppercase">{label}</span>
        {icon}
      </div>
      <strong className="mt-4 block font-display text-4xl uppercase leading-none">{value}</strong>
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
    <section className="technical-frame bg-surface p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Ranked by expected value</p>
          <h2 className="font-display text-3xl uppercase">Action queue</h2>
        </div>
        <BarChart3 className="text-muted" />
      </div>
      <div className="space-y-3">
        {isLoading ? (
          <SkeletonLines count={3} />
        ) : (
          recommendations.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={`group w-full border p-4 text-left transition ${
                selectedId === item.id
                  ? "border-primary bg-primary text-[var(--ink)]"
                  : "border-line bg-bg/70 text-text hover:border-accent"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-4xl leading-none">{String(index + 1).padStart(2, "0")}</span>
                <ChevronRight className="mt-1 shrink-0 transition group-hover:translate-x-1" size={18} />
              </div>
              <h3 className="mt-3 text-xl font-semibold leading-tight">{item.title}</h3>
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
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
      <section className="technical-frame min-h-[420px] bg-surface p-5">
        <SkeletonLines count={8} />
      </section>
    );
  }

  return (
    <section className="technical-frame bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-accent">
            <Eye size={16} />
            Why this, why now
          </p>
          <h2 className="mt-2 font-display text-4xl uppercase leading-none">{recommendation.action_type}</h2>
        </div>
        <span className="border border-line px-3 py-2 text-xs uppercase text-muted">{recommendation.status}</span>
      </div>

      <p className="mt-5 text-xl font-semibold leading-snug">{recommendation.title}</p>
      <p className="mt-3 text-muted">{recommendation.target_segment}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {recommendation.products.map((product) => (
          <article className="border border-line bg-bg/72 p-3" key={product.id}>
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="mt-2 text-xs uppercase text-muted">{formatVnd(product.price_vnd)}</p>
            <p className="mt-1 text-xs text-accent">{product.stock} in stock</p>
          </article>
        ))}
      </div>

      <div className="mt-5 border border-line bg-bg/72 p-4">
        <div className="flex items-center gap-2 text-primary">
          <AlertTriangle size={17} />
          <span className="text-sm font-semibold uppercase">Risk flag</span>
        </div>
        <p className="mt-2 text-sm text-muted">{recommendation.risk_flag}</p>
      </div>

      <div className="mt-5 space-y-2">
        {recommendation.evidence.map((item) => (
          <div className="flex gap-3 border-b border-line pb-2 text-sm text-muted" key={item}>
            <span className="mt-1 h-2 w-2 shrink-0 bg-primary" />
            <span>{item}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 border border-line bg-panel p-4 text-[var(--ink)]">
        <p className="text-xs font-bold uppercase">Editable campaign copy</p>
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
          className="flex items-center justify-center gap-2 bg-accent px-4 py-3 font-bold uppercase text-[var(--ink)] transition hover:brightness-110 disabled:opacity-55"
        >
          <Check size={18} />
          Approve export
        </button>
        <button
          onClick={onReject}
          disabled={isPending}
          className="flex items-center justify-center gap-2 border border-line px-4 py-3 font-bold uppercase text-muted transition hover:border-danger hover:text-danger disabled:opacity-55"
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
    <section className="technical-frame bg-surface p-5">
      <div className="mb-4">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-primary">
          <Search size={16} />
          Staff semantic search
        </p>
        <h2 className="mt-2 font-display text-3xl uppercase">Buyer intent lookup</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_190px]">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="border border-line bg-bg px-4 py-3 text-text outline-none transition placeholder:text-muted focus:border-primary"
          placeholder="Search by customer need, budget, occasion..."
        />
        <select
          value={goal}
          onChange={(event) => onGoalChange(event.target.value as MerchantGoal)}
          className="border border-line bg-bg px-3 py-3 text-text outline-none transition focus:border-primary"
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
          <button
            key={item}
            onClick={() => onQueryChange(item)}
            className="border border-line px-3 py-2 text-xs uppercase text-muted transition hover:border-accent hover:text-accent"
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <SkeletonLines count={4} />
        ) : (
          results.map((result) => (
            <article className="border border-line bg-bg/72 p-4" key={result.product.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{result.product.name}</h3>
                  <p className="mt-1 text-sm text-muted">{result.match_reason}</p>
                </div>
                <span className="bg-primary px-2 py-1 text-xs font-bold text-[var(--ink)]">{result.score.toFixed(1)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.product.tags.slice(0, 4).map((tag) => (
                  <span className="border border-line px-2 py-1 text-xs text-muted" key={tag}>
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
    <section className="technical-frame bg-surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-accent">Personalized vs generic</p>
          <h2 className="font-display text-3xl uppercase">Campaign lift</h2>
        </div>
        <BarChart3 className="text-muted" />
      </div>
      <div className="h-[280px] min-h-[280px] min-w-0 w-full">
        {mounted ? (
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={260}>
            <BarChart data={chartData} margin={{ top: 16, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(244,239,228,0.14)" vertical={false} />
              <XAxis dataKey="id" stroke="#9d9a90" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#9d9a90" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(228,167,42,0.08)" }}
                contentStyle={{
                  background: "#191b17",
                  border: "1px solid #34362f",
                  color: "#f5f1e8"
                }}
              />
              <Bar dataKey="conversion" fill="#e4a72a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="aov" fill="#36c6a8" radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full animate-pulse border border-line bg-bg/70" />
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MiniStat label="Inventory units moved" value={String(moved)} />
        <MiniStat label="Repeat orders influenced" value={String(repeat)} />
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line bg-bg/70 p-3">
      <p className="text-xs uppercase text-muted">{label}</p>
      <strong className="mt-1 block font-display text-3xl uppercase">{value}</strong>
    </div>
  );
}

function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div className="h-12 animate-pulse bg-line/60" key={index} />
      ))}
    </div>
  );
}
