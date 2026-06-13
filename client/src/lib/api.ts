export type MerchantGoal = "repeat_purchase" | "clear_inventory" | "increase_aov" | "reactivate_dormant";
export type RecommendationStatus = "draft" | "approved" | "rejected" | "edited";

export type Product = {
  id: string;
  name: string;
  category: string;
  price_vnd: number;
  margin_percent: number;
  stock: number;
  tags: string[];
  description: string;
};

export type SearchResult = {
  product: Product;
  score: number;
  match_reason: string;
};

export type Recommendation = {
  id: string;
  title: string;
  action_type: string;
  target_segment: string;
  products: Product[];
  timing: string;
  expected_metric: string;
  confidence: number;
  risk_flag: string;
  evidence: string[];
  campaign_copy: string;
  status: RecommendationStatus;
};

export type CampaignReport = {
  recommendation_id: string;
  conversion_lift_percent: number;
  aov_lift_percent: number;
  repeat_orders: number;
  inventory_units_moved: number;
  estimated_time_saved_hours: number;
};

export type PrivacyPreference = {
  signal: string;
  enabled: boolean;
  description: string;
};

export type DataStatus = {
  ready: boolean;
  data_dir: string;
  required_files: string[];
  missing_files: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers
    }
  });

  if (!response.ok) {
    let detail = `API request failed: ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // Keep the HTTP fallback when the server does not return JSON.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  dataStatus: () => request<DataStatus>("/api/data-status"),
  products: () => request<Product[]>("/api/products"),
  recommendations: () => request<Recommendation[]>("/api/recommendations"),
  reports: () => request<CampaignReport[]>("/api/reports"),
  privacy: () => request<PrivacyPreference[]>("/api/privacy"),
  updatePrivacy: (signal: string, enabled: boolean) =>
    request<PrivacyPreference>(`/api/privacy/${encodeURIComponent(signal)}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled })
    }),
  search: (query: string, goal: MerchantGoal) =>
    request<SearchResult[]>("/api/search", {
      method: "POST",
      body: JSON.stringify({ query, goal })
    }),
  updateRecommendation: (id: string, status: RecommendationStatus, edited_copy?: string, reason?: string) =>
    request<Recommendation>(`/api/recommendations/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, edited_copy, reason })
    })
};

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}
