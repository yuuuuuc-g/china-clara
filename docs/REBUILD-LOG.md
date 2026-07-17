# China Clara 重建记录（Rebuild Log）

> 本文档是「由 knowledge-galaxy 原地重建为 China Clara」全过程的权威记录。
> 目的：任何人（包括未来的你和 AI 代理）打开这一篇，就能搞清项目是什么、做到哪了、下一步做什么。
> 最后更新：2026-07-18。

---

## 1. 项目是什么

China, clara（西语「清晰的中国」）。
定位：**拉美人理解中国、找到可信中国供应商的第一站**。
内容驱动的 B2B 信息与采购沟通平台。
护城河是「读懂中国」内容 + 信任中介；商品展示只是变现出口。
**平台不介入支付，只做询盘（RFQ），没有订单系统。**

完整方案见对话里的 `China-Clara-平台方案.html`（11 节：定位/市场/模块/前端/后端/API/权限/路线图/商业化/工具链/风险）。

---

## 2. 架构铁律（来自 AGENTS.md，违反即返工）

1. **API-first**：主站前端也只是 `/api/v1` 的消费者，不得绕过网关直接暴露 PostgREST。
2. **四域 schema**：单个 Postgres（**新建 Supabase 项目，不要连旧 knowledge-galaxy**），分 `content` / `catalog` / `crm` / `community` 四个域。
3. **没有订单**：只有 `crm.inquiries → inquiry_messages → deal_outcomes`，不要建 orders 表。
4. **双轨 UI**：根路径 `/` 是 3D 星系门户；`/es` `/en` `/zh` 是 SSR 内容页（SEO 生命线）。任何页面在无 3D 时必须完整可用。
5. **三语**：`/es`（拉美买家，优先）、`/en`（国际买家）、`/zh`（中国供应商）。

六大模块（唯一真源在 `src/lib/modules.ts`）：
读懂中国 `understand` / 情报雷达 `intelligence` / 供应商目录 `suppliers` / 询盘中心 `inquiries` / 社区 `community` / 开放接口 `developers`。

---

## 3. 本次会话做了什么（按提交顺序）

重建成果都在分支 `claude/china-latam-b2b-platform-1c5240` 上，共 4 个提交（在 P0 `72f9ba0` 之上）：

| 提交 | 内容 |
|------|------|
| `a119cef` | **3D 门户重映射 + 双轨 SSR 外壳**。根路径 `/` 从旧 Knowledge Galaxy 重映射到六大模块；桌面/WebGL 显示 3D 星系，移动/窄屏/低配/无 WebGL 自动降级为 `ModuleGrid`；顶栏文字导航 + 语言切换始终在 DOM（无 3D 也可用）。新增 `[locale]` 布局（SiteHeader + 语言切换）、落地页、通用 `[module]` 占位页（3×6）。 |
| `a8aeff3` | **Batch 2：删除 legacy 前端/API 连通块**。删掉 archive/exocortex/knowledge-graph/analytical-pipeline 页面、12 条旧 API 路由、modules(archive/refinery/social-signals/prompts)、遗留组件与脚本。保留 intelligence/ai/rag/retrieval/canvas 与 admin.ts+database.types.ts（types 重生成前过渡）。 |
| `88277b4` | GitNexus 索引名改指 china-clara（doc）。 |
| `d116699` | **P1：读懂中国内容纵切**。共用查询层 `src/lib/content/queries.ts`（API 路由与 SSR 页共用，API-first）；列表页 `/[locale]/understand`（SSG+5m ISR）、详情页 `/[locale]/understand/[slug]`（react-markdown 正文 + AI 初翻提示 + 无数据 404）。Supabase 未配置时优雅返回空。 |

> 注：Batch 1（删除旧 3D 门户独占的 galaxy-shell + HUD 组件）已包含在 `a119cef` 里。

每一步都通过质量门禁：`npm test && npx tsc --noEmit && npm run lint && npm run build` 全绿。

另外处理过的两件事（不在提交里）：
- **文件夹改名修复**：`knowledge-galaxy` → `china-clara` 打断了 git worktree 的绝对路径链接，已用 `git worktree repair` 修复，并 prune 掉失效的旧 worktree 登记。
- **GitNexus 重建索引**：用 `--name china-clara` 重建（1,322 节点 / 2,200 边 / 89 flows）。

---

## 4. 当前状态（务必看清，这是「搞不清」的根源）

**存在两条线，尚未合并：**

- `main`（主目录 `/Users/eve/ai-projects/china-clara`）：停在 **P0 `72f9ba0`**，**仍带着全部 legacy 文件**（app/ 里还有 archive、exocortex、analytical-pipeline、knowledge-graph）。
- `claude/china-latam-b2b-platform-1c5240`（worktree `.claude/worktrees/...`）：**完整重建成果**，比 main 多 4 个提交，legacy 已清干净。

**该分支还没推到 GitHub**（origin 上目前只有 `main` 和 `claude/frontend-ui-only`）。
**`legacy-knowledge-galaxy` 旧版快照分支只在本地，也没推。**

`.env` / `.env.local`（含 Supabase 凭据）目前在**主目录**，worktree 里没有。

> 直白结论：所有新东西都在一个「本地、未合并、未推送」的分支上。
> 想「合到一处、不再割裂」，见第 7 节的一键动作。

---

## 5. 目录结构现状（重建分支视角）

```
app/
  page.tsx                       # 3D 门户（双轨降级）
  layout.tsx                     # 根 metadata = China Clara
  [locale]/
    layout.tsx                   # SiteHeader + 语言切换 + footer
    page.tsx                     # 三语落地页（六模块卡片）
    [module]/page.tsx            # 5 个模块的通用占位（understand 除外）
    understand/page.tsx          # 读懂中国 列表（真实纵切）
    understand/[slug]/page.tsx   # 文章详情（markdown）
  api/
    v1/{content/articles,catalog/products,inquiries,openapi}   # 对外网关
    cron/intelligence-ingest, intelligence-ingest-status       # 保留的情报管线
src/
  lib/modules.ts                 # 六模块唯一真源
  lib/content/queries.ts         # content 查询层（API+SSR 共用）
  lib/{portal-runtime,format}.ts
  components/{portal,site,canvas,ui}/
  i18n/{config,get-dictionary,portal-dictionary,dictionaries/*}
  modules/{intelligence,ai,rag,retrieval,canvas}/   # 保留复用
supabase/migrations/0001..0005   # 四域 schema + RLS
```

保留但仍绑旧类型的过渡件：`src/lib/supabase/admin.ts` + `src/lib/database.types.ts`（待新项目 types 生成后替换）。
Python 侧（`ingest.py` / `rag-pipeline/`）按 AGENTS.md「按需保留」，未动。

---

## 6. 还没做的（待办）

**基础设施（阻塞真实内容渲染）：**
- [ ] 新建 Supabase 项目（铁律 #2，**别连旧的**）。当前 `supabase/.temp` 还残留着旧项目 `bhfqzjnhsdietkzjejvu`（"knowledge galaxy"）的 link，直接 `db push` 会推错库。
- [ ] `supabase link --project-ref <新ref>` → `supabase db push`（一次推全部 0001–0005，**不接编号参数**）。
- [ ] Dashboard → Settings → API 暴露四个 schema。
- [ ] `.env` 配 `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → `npm run supabase:types`。
- [ ] （可选）灌样例文章，读懂中国页面即从空状态变真实内容（无需改代码）。

**产品纵切（P1–P3）：**
- [ ] 供应商目录 `/suppliers`（catalog 域，仿 understand 做法）。
- [ ] 询盘中心 `/inquiries`（crm 域）。
- [ ] 社区 `/community`。
- [ ] 情报管线改造：信息源换中拉贸易源，落表到 content 域，喂「情报雷达」。
- [ ] 用户认证（Supabase Auth）+ profiles 角色 + RLS 联调。
- [ ] AI 翻译管线（改造 `ai/provider-adapter`）：中→西/英，`human_reviewed` 标记。

**决策待定：**
- [ ] GitHub 仓库：**建议改名旧仓库**（knowledge-galaxy → china-clara），保留历史/Vercel/secrets，GitHub 自动重定向。不建议新建。
- [ ] `supabase/.temp` 被 git 跟踪了（应忽略），需要 untrack + 加 .gitignore。

---

## 7. 消除「割裂感」的一键动作（推荐先做）

把重建分支合进 main，并把分支和旧快照都推到 GitHub：

```bash
cd /Users/eve/ai-projects/china-clara

# 1) 把重建成果合进 main（可 fast-forward，因为 main 是该分支的祖先）
git checkout main
git merge --ff-only claude/china-latam-b2b-platform-1c5240

# 2) 把旧版快照推上去保底（目前只在本地！）
git push origin legacy-knowledge-galaxy

# 3) 推 main
git push origin main
```

做完后主目录 `main` 就等于完整重建版，不再有两条线。
（注意：合并后主目录会变成新结构，旧的 archive/exocortex 等文件消失——这是预期的，旧版仍在 `legacy-knowledge-galaxy` 分支里。）

---

## 8. 怎么跑 / 怎么验证

```bash
# 开发（在有代码的目录，目前是 worktree）
npm run dev            # http://localhost:3000

# 质量门禁（提交前必须全绿）
npm test && npx tsc --noEmit && npm run lint && npm run build
```

无 Supabase 时的预期表现（已验证）：
- `/` 桌面显示 3D 星系，窄屏显示模块网格；
- `/es` `/en` `/zh` 三语落地页正常；
- `/es/understand` 等显示「暂无文章」空状态；文章详情 404；
- `/api/v1/content/articles` 返回 `{"data":[],"meta":{...total:0},"error":null}`。

---

## 9. 进展更新（2026-07-18）

上面 7、8 节描述的是「main 还没合并、Supabase 还没建」的时点，现已全部推进。

### Git 已理顺（不再有两条线）
- 完整重建已成为 `main` 并强推 origin（`git push --force-with-lease`）。
- 旧「只剩 UI 外壳」(PR #11) 保留在 `claude/frontend-ui-only`；旧 KG 完整快照在 `legacy-knowledge-galaxy`（均在 origin）。
- 项目文件夹由 `knowledge-galaxy` 改名为 `china-clara`；GitHub 仓库同名，remote 已是 `china-clara.git`。
- 清理了嵌套在 `.claude/worktrees/` 里的 git worktree（否则 vitest/eslint/tsc 会递归扫进去导致误报）。

### Supabase 已上线，内容纵切跑真实数据
- 新项目 `ozqkirgebujkcvdezjet`（us-east-1）：已 link、迁移 **0001-0006** 全应用、四 schema 已在 Data API 设置里暴露、样例数据已灌（`supabase/seed.sql`）。
- 读懂中国 `/es|/en|/zh/understand` 列表 + 详情已渲染真实三语内容、markdown 正文、本地化日期、以及 `human_reviewed=false` 时的「AI 初翻待校订」提示。

### 本轮踩的坑与固化的解
- **自定义 schema 授权**：0005 只开了 RLS 没授表权限，连 service_role 都报 `permission denied for schema content`（42501）。补 `0006_grants.sql`：给四域授 anon/authenticated/service_role 权限，RLS 仍管行级。
- **直连库 IPv6-only**：`db.<ref>.supabase.co:5432` 直连 `tls error (EOF)`。改用 session pooler：`--db-url "postgresql://postgres.<ref>:<pwd>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"`。
- **新版 API key 格式**：项目用 `sb_publishable_/sb_secret_`；代码兼容旧版 `service_role` JWT，`.env.local` 用后者最稳。
- **查询层吞错**：`src/lib/content/queries.ts` 原本把 DB 错误当空状态返回，掩盖了授权问题；已改为 `console.error` 暴露真实错误。

### 待办（下一步）
- **全站 Basic Auth 中间件 `proxy.ts`**（`SITE_PASSWORD`）仍拦住公开内容与 API——建设期保留，**上线前必须放开公开内容与只读 API**（写接口有 PAT 自保护）。
- **`.env.local` 旧项目残留**：`SUPABASE_URL`/`SUPABASE_KEY` 仍指向旧项目 `bhfqzjnhsdietkzjejvu`；`getSupabaseAdminEnv()` 里 `SUPABASE_URL` 优先级高于 `NEXT_PUBLIC_SUPABASE_URL`，会让保留的 `admin.ts`（intelligence 路由用）连错项目。删这两行或改成新项目值。
- 下一个内容纵切：供应商目录 `/suppliers`（消费 catalog 域）。
