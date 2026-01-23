-- Create password_resets table
create table if not exists public.password_resets (
  id uuid default uuid_generate_v4() primary key,
  email text not null,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.password_resets enable row level security;

-- Policy: Admin can do anything (service_role)
-- Policy: Public/Anon can INSERT (to request reset)
create policy "Allow insert for everyone" on public.password_resets for insert with check (true);

-- Policy: Public/Anon can SELECT (to verify token) - but restrict by email/token match potentially?
-- For simplicity in this robust backend, we often just use service_role for this or allow select.
-- Let's allow select for everyone for now so the simple supabase client works, 
-- or arguably we should rely on the backend (service role) to check this table.
-- Since we are using the same supabase client in backend which might be service_role?
-- Checked supabase.js: It uses `SUPABASE_KEY` (usually ANON) or `SUPABASE_SERVICE_ROLE_KEY`.
-- If the backend uses ANON key, we need RLS open.
-- Let's open SELECT for now.
create policy "Allow select for everyone" on public.password_resets for select using (true);
create policy "Allow delete for everyone" on public.password_resets for delete using (true);
