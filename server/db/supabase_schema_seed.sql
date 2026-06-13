create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  price_vnd integer not null,
  margin_percent numeric(5, 2) not null,
  stock integer not null,
  tags text[] not null default '{}',
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.recommendations (
  id text primary key,
  title text not null,
  action_type text not null,
  target_segment text not null,
  timing text not null,
  expected_metric text not null,
  confidence numeric(4, 3) not null,
  risk_flag text not null,
  evidence jsonb not null default '[]'::jsonb,
  campaign_copy text not null,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists public.recommendation_products (
  recommendation_id text not null references public.recommendations(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  primary key (recommendation_id, product_id)
);

create table if not exists public.reports (
  recommendation_id text primary key references public.recommendations(id) on delete cascade,
  conversion_lift_percent numeric(6, 2) not null,
  aov_lift_percent numeric(6, 2) not null,
  repeat_orders integer not null,
  inventory_units_moved integer not null,
  estimated_time_saved_hours numeric(6, 2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.privacy (
  signal text primary key,
  enabled boolean not null default true,
  description text not null
);

alter table public.products enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_products enable row level security;
alter table public.reports enable row level security;
alter table public.privacy enable row level security;

drop policy if exists "public read products" on public.products;
drop policy if exists "public read recommendations" on public.recommendations;
drop policy if exists "public read recommendation products" on public.recommendation_products;
drop policy if exists "public read reports" on public.reports;
drop policy if exists "public read privacy" on public.privacy;
drop policy if exists "public seed products" on public.products;
drop policy if exists "public seed recommendations" on public.recommendations;
drop policy if exists "public seed recommendation products" on public.recommendation_products;
drop policy if exists "public seed reports" on public.reports;
drop policy if exists "public seed privacy" on public.privacy;
drop policy if exists "public update products" on public.products;
drop policy if exists "public update recommendations" on public.recommendations;
drop policy if exists "public update recommendation products" on public.recommendation_products;
drop policy if exists "public update reports" on public.reports;
drop policy if exists "public update privacy" on public.privacy;

create policy "public read products" on public.products for select using (true);
create policy "public read recommendations" on public.recommendations for select using (true);
create policy "public read recommendation products" on public.recommendation_products for select using (true);
create policy "public read reports" on public.reports for select using (true);
create policy "public read privacy" on public.privacy for select using (true);

create policy "public seed products" on public.products for insert with check (true);
create policy "public seed recommendations" on public.recommendations for insert with check (true);
create policy "public seed recommendation products" on public.recommendation_products for insert with check (true);
create policy "public seed reports" on public.reports for insert with check (true);
create policy "public seed privacy" on public.privacy for insert with check (true);
create policy "public update products" on public.products for update using (true) with check (true);
create policy "public update recommendations" on public.recommendations for update using (true) with check (true);
create policy "public update recommendation products" on public.recommendation_products for update using (true) with check (true);
create policy "public update reports" on public.reports for update using (true) with check (true);
create policy "public update privacy" on public.privacy for update using (true) with check (true);

insert into public.products (id, name, category, price_vnd, margin_percent, stock, tags, description)
values
  ('p-toner-01', 'Lotus Balance Toner', 'Skincare', 185000, 42, 86, array['oily skin', 'toner', 'lightweight', 'daily care'], 'Alcohol-free toner for oily and combination skin after cleansing.'),
  ('p-sun-02', 'Urban Shield Sunscreen SPF50', 'Skincare', 265000, 47, 124, array['sunscreen', 'oily skin', 'office worker', 'daily care'], 'Non-sticky SPF50 sunscreen for commuters and office workers.'),
  ('p-serum-03', 'Cica Repair Serum', 'Skincare', 320000, 51, 34, array['sensitive skin', 'serum', 'repair', 'night routine'], 'Calming serum for redness and damaged skin barrier.'),
  ('p-mask-04', 'Hydra Sheet Mask Set', 'Skincare', 99000, 38, 210, array['gift', 'under 100k', 'hydration', 'bundle'], 'Five-piece hydration sheet mask set for gifting and add-ons.'),
  ('p-case-05', 'Soft Grip Phone Case', 'Accessories', 145000, 55, 178, array['student budget', 'phone case', 'gift', 'durable'], 'Durable phone case with matte texture for students.'),
  ('p-pouch-06', 'Mini Travel Cosmetic Pouch', 'Accessories', 125000, 49, 92, array['travel', 'gift', 'office worker', 'organizer'], 'Compact pouch for travel skincare and daily office carry.')
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  price_vnd = excluded.price_vnd,
  margin_percent = excluded.margin_percent,
  stock = excluded.stock,
  tags = excluded.tags,
  description = excluded.description;

insert into public.recommendations (
  id, title, action_type, target_segment, timing, expected_metric, confidence, risk_flag, evidence, campaign_copy, status
)
values
  (
    'rec-repeat-skincare',
    'Bundle toner + sunscreen for repeat skincare buyers',
    'Repeat purchase',
    'Customers who bought cleanser 25-45 days ago',
    'Before this weekend livestream',
    '+16% repeat purchase conversion',
    0.82,
    'Low: uses recent purchase behavior and high-stock products',
    to_jsonb(array['1,248 buyers purchased cleanser in the last 45 days.', 'Sunscreen stock is high and margin is above category average.', 'Similar routine bundles raised AOV in the last salary-day campaign.']),
    'Your daily skincare routine is almost complete. Pair Lotus Balance Toner with Urban Shield Sunscreen this weekend and save 12%.',
    'draft'
  ),
  (
    'rec-clear-masks',
    'Move hydration mask inventory through add-on offer',
    'Inventory clearance',
    'Buyers adding skincare items above 250k',
    'Next 7 days',
    'Sell through 80-110 extra units',
    0.76,
    'Medium: discount depth should stay below 15%',
    to_jsonb(array['Hydra Sheet Mask stock is 2.3x higher than weekly average demand.', 'Mask sets convert well as cart add-ons under 100k.', 'Discounts above 15% reduced perceived value in prior campaigns.']),
    'Add a Hydra Sheet Mask Set to any skincare order over 250k for a limited add-on price.',
    'draft'
  ),
  (
    'rec-office-gift',
    'Create office-worker gift bundle under 300k',
    'Bundle upsell',
    'Chat buyers asking for affordable gifts',
    'Salary week',
    '+11% AOV on gift-intent chats',
    0.79,
    'Low: aggregate segment only, no sensitive attributes',
    to_jsonb(array['Gift queries under 300k increased in staff search history.', 'Pouch and sunscreen share strong office-worker intent tags.', 'Combined bundle remains under the most common stated budget.']),
    'A practical office gift under 300k: Urban Shield Sunscreen plus a Mini Travel Cosmetic Pouch.',
    'draft'
  )
on conflict (id) do update set
  title = excluded.title,
  action_type = excluded.action_type,
  target_segment = excluded.target_segment,
  timing = excluded.timing,
  expected_metric = excluded.expected_metric,
  confidence = excluded.confidence,
  risk_flag = excluded.risk_flag,
  evidence = excluded.evidence,
  campaign_copy = excluded.campaign_copy,
  status = excluded.status;

insert into public.recommendation_products (recommendation_id, product_id)
values
  ('rec-repeat-skincare', 'p-toner-01'),
  ('rec-repeat-skincare', 'p-sun-02'),
  ('rec-clear-masks', 'p-mask-04'),
  ('rec-office-gift', 'p-sun-02'),
  ('rec-office-gift', 'p-pouch-06')
on conflict (recommendation_id, product_id) do nothing;

insert into public.reports (
  recommendation_id, conversion_lift_percent, aov_lift_percent, repeat_orders, inventory_units_moved, estimated_time_saved_hours
)
values
  ('rec-repeat-skincare', 18.4, 9.2, 146, 212, 4.5),
  ('rec-clear-masks', 10.8, 5.6, 62, 94, 3.0),
  ('rec-office-gift', 14.1, 12.7, 88, 131, 3.8)
on conflict (recommendation_id) do update set
  conversion_lift_percent = excluded.conversion_lift_percent,
  aov_lift_percent = excluded.aov_lift_percent,
  repeat_orders = excluded.repeat_orders,
  inventory_units_moved = excluded.inventory_units_moved,
  estimated_time_saved_hours = excluded.estimated_time_saved_hours;

insert into public.privacy (signal, enabled, description)
values
  ('order_history', true, 'Use prior purchases and order timing for segment recommendations.'),
  ('inventory', true, 'Use stock and sell-through pressure to prioritize products.'),
  ('margin', true, 'Use product margin to avoid low-profit recommendations.'),
  ('chat_intent', false, 'Use aggregated customer chat intent without exposing individual messages.')
on conflict (signal) do update set
  enabled = excluded.enabled,
  description = excluded.description;
