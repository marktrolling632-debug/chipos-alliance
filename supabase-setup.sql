-- ============================================================
-- 奇普托斯聯盟 · Supabase 資料庫建表腳本
-- 用法：Supabase 後台 → SQL Editor → New query → 貼上 → Run
-- ============================================================

-- 1. 建立名錄表（只存一列，內容為 JSON 陣列）
create table if not exists members (
  id          int primary key,
  data        jsonb       default '[]'::jsonb,
  updated_at  timestamptz default now()
);

-- 2. 塞入初始列（id = 1）
insert into members (id, data)
values (1, '[]'::jsonb)
on conflict (id) do nothing;

-- 3. 啟用列級安全（RLS）
alter table members enable row level security;

-- 4. 開放 anon 讀取（前台顯示名錄需要）
drop policy if exists "public read" on members;
create policy "public read" on members
  for select using (true);

-- 5. 開放 anon 寫入／更新（後台上傳名錄需要）
drop policy if exists "public insert" on members;
create policy "public insert" on members
  for insert with check (true);

drop policy if exists "public update" on members;
create policy "public update" on members
  for update using (true) with check (true);

-- 6. 即時刷新（可選，已改為可重複執行，不會報錯）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'members'
  ) then
    alter publication supabase_realtime add table members;
  end if;
end $$;

-- ============================================================
-- 安全提醒（重要）
-- ============================================================
-- 上面第 5 步開放了 anon 寫入，代表任何人拿到你的
-- Project URL + anon key 就能改名錄。
--
-- 由於靜態網站無法隱藏金鑰，這是「便利性 vs 安全性」的取捨。
-- 若你希望只有自己能改，請改用以下更嚴格的做法：
--
--   A) 刪除第 5 步的 insert/update 政策，改為只開放 SELECT
--   B) 上傳時改用 Supabase 後台「Table Editor」手動貼 JSON
--      （或改用 service_role key，但那必須放伺服器，不能放前端）
--
-- 對虛擬聯盟官網而言，開放 anon 寫入通常可接受；
-- 若遭惡意竄改，隨時可在後台 Table Editor 還原。
-- ============================================================
