# 账户与云同步配置（Supabase，约 5 分钟）

配置完成后：所有地图页面出现"☁️ 登录"按钮（邮箱魔法链接，无需密码）；登录后学习进度自动同步到账户；`/my/` 学习中心可查看、重命名、删除所有课程记录。**不配置则一切照旧走本地存储。**

## 第 1 步：创建 Supabase 项目（需本人操作）

1. 打开 [supabase.com](https://supabase.com) 注册（免费，可用 GitHub 账号直接登录）
2. New project → 取名（如 `agent-graph-learning`）→ 选离你近的区域 → 创建
3. 进入项目 → Settings → API，复制两个值：**Project URL** 和 **anon public** key

## 第 2 步：建数据表（SQL Editor 里粘贴运行）

```sql
create table public.map_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  map_id text not null,
  title text default '',
  url text default '',
  lit jsonb default '[]',
  total int default 0,
  updated_at timestamptz default now(),
  primary key (user_id, map_id)
);

alter table public.map_progress enable row level security;

create policy "users manage own rows" on public.map_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

行级安全策略（RLS）保证每个用户只能读写自己的行——所以前端用 anon key 是安全的。

## 第 3 步：关闭邮箱确认（关键）

登录用**邮箱 + 密码，注册即用**——不走邮箱验证链接（Supabase 自带邮件服务限流严重、投递不可靠，是常见坑）。

项目 → Authentication → Sign In / Providers → Email，把 **Confirm email（确认邮箱）** 开关**关掉**并保存。这样用户输入邮箱密码即注册即登录，全程不发任何邮件。

（可选）如果将来想要邮箱验证或找回密码，再配一个真实 SMTP（如 Resend），并把该开关打开。

## 第 4 步：填配置并发布

把第 1 步复制的两个值填进仓库根目录的 `account-config.json`：

```json
{
  "supabaseUrl": "https://xxxx.supabase.co",
  "supabaseAnonKey": "eyJhbGciOi..."
}
```

commit + push。Pages 生效后，打开任意地图 → 右上角出现"☁️ 登录"。

## 数据与隐私

- 云端只存：邮箱和密码哈希（Supabase Auth 管理）、每张地图的点亮列表和课程名——没有其它任何数据
- 本地 localStorage 始终是第一存储，云端是同步层；登录时两边**合并**（取并集），不会丢进度
- 免费额度（50000 月活跃用户 / 500MB 数据库）对个人和小规模分享远远够用
