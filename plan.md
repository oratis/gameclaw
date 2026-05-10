# GameClaw — 游戏代练 AI 平台 · Plan

> 文档版本：v0.1（2026-05-10）· 作者：codename oratis · 状态：草案，待评审

## 0. TL;DR

GameClaw 从「**HoYoLAB 每日签到工具**」转型为「**通用游戏代练 AI 平台 + OpenClaw Skill 生态**」。

- **定位**：在 OpenClaw 体系里，做游戏代练这个垂直方向的旗舰 skill / skill 集合 —— "**游戏代练界的 OpenClaw**"。
- **形态**：一个 SaaS 平台（gogameclaw.com）+ 一组开源 OpenClaw skill（`gameclaw_skill` → `gameclaw-*`）+ 一个游戏适配器仓库（任何游戏都能写 adapter 接入）。
- **AI 角色**：从"按钮自动化"升级到"AI agent 决策代练"——agent 读懂任务、选时机、选动作、报告产出。
- **路径**：渐进式 4 个 milestone，M0 是当前已经有的（HoYo 签到），M3 之后形成 marketplace。

---

## 1. 现状盘点（M0 已有）

来源：本仓库 `src/`、`gameclaw_skill/`、`prisma/schema.prisma`、`README.md`、`CLAUDE.md`。

| 维度 | 现状 |
|---|---|
| 产品形态 | Next.js 16 web + 一颗 OpenClaw skill |
| 支持游戏 | 5 款 HoYoverse 系：原神 / 星铁 / ZZZ / 崩 3 / 未定事件簿 |
| 代练能力 | **仅每日签到**（最轻量的代练形态） |
| 接入方式 | HoYoLAB 网页 cookie（`ltoken_v2` / `ltuid_v2`） |
| 技术栈 | Next.js 16 + NextAuth v5 + Prisma + PostgreSQL + Tailwind v4 |
| 部署 | GCP Cloud Run（`gameclaw-492005`）+ Cloud Scheduler 定时签到 |
| 安全 | Cookie AES-256-GCM at rest，已有结构化日志、cookie 校验、test suite、CI |
| Skill | `/gameclaw checkin|status|games`，双模式（API 模式 + standalone Python 脚本模式） |

**Gap 评估**：当前覆盖的代练能力 ≈ 全谱代练的 **5%**。游戏面只是 HoYo 一家厂商。是个非常窄的 MVP，但**底盘干净**（auth、加密、日志、定时、skill 协议都到位），具备扩展的基础。

---

## 2. 重新定位

### 2.1 一句话定位

**GameClaw is the AI agent that plays the boring parts of every game for you.**

中文版："你不想自己肝的游戏内容，让 AI 替你肝"。

### 2.2 价值层

| 层 | 给谁 | 给什么 |
|---|---|---|
| 终端玩家 | 多游戏多账号玩家 | 一键完成所有游戏的日常/周常，从签到到刷副本 |
| AI 用户（Claude/ChatGPT/Codex） | 通过自然语言操作游戏 | `"帮我把今天三个号的体力都用掉"` 即可 |
| 第三方开发者 | 想接入新游戏的 contributor | 写 adapter → 提交到 ClawHub，拿到自己游戏的代练 skill |
| 厂商 / 公会 | 中重度玩家社群 | 私有部署，给公会成员批量管理游戏资源 |

### 2.3 vs 对标

| 对标对象 | GameClaw 的差异点 |
|---|---|
| **OpenClaw / ClawHub**（横向通用 skill 生态） | 同生态、垂直深耕。GameClaw 不和 OpenClaw 竞争，而是**在 OpenClaw 之上**做"游戏代练"垂类的聚合层 |
| **传统人工代练**（淘宝/电竞猫/代练通） | AI 全自动 + 不接触账号密码（仅 cookie/token，最小权限），价格更低、风控更安全、无人工延迟 |
| **现有游戏脚本 / 按键精灵 / 模拟器宏** | 不要求用户安装/配置，云端跑；多游戏统一接口；AI 决策（不是死循环宏） |
| **HoYoLAB 现成的网页签到工具** | 不止签到，且 AI agent 可调度；多平台多游戏，不局限 HoYo |

### 2.4 不做（边界）

- ❌ **不做 PvP 上分类代练**：直接操作游戏客户端、模拟操作角色 = 严重违反几乎所有游戏 ToS 且需重 GUI 自动化栈。法律和合规风险过高，留给 v2+ 谨慎评估。
- ❌ **不做账号密码托管**：只用游戏方公开/半公开的网页凭证（cookie/token/OAuth）。
- ❌ **不做外挂/内存修改**：与代练服务无关。
- ❌ **不卖游戏内货币 / 不接成品号交易**。

---

## 3. 用户与场景

### 3.1 Persona

1. **多账号 HoYo 党**（已有用户）—— 每天打开 5 款游戏点签到很烦
2. **多游戏氪佬** —— 同时玩 原神 + 鸣潮 + 绝区零 + 三国志战略版 + 明日方舟，日常合计 1 小时纯肝
3. **上班族碎片玩家** —— 没时间日活但又不想脱坑，要保持账号"不衰"
4. **AI 重度用户** —— 已经把生活托管给 Claude/ChatGPT，希望游戏也是
5. **游戏公会管理者** —— 帮一群人维护账号活跃度

### 3.2 高价值任务清单（按优先级）

| Tier | 任务类型 | 复杂度 | 示例 | 实现路径 |
|---|---|---|---|---|
| **T1 信号级** | 每日签到 | ⭐ | HoYoLAB 5 款（已有） | Web API |
| **T1** | 跨厂商每日签到 | ⭐ | 鸣潮、明日方舟、阴阳师、王者赛季签到 | Web API（每游戏单独 adapter） |
| **T2 资源级** | 邮件领取 / 活动奖励领取 | ⭐⭐ | 原神邮件、星铁活动 | Web API（多数厂商有） |
| **T2** | 体力 / 树脂消耗（自动派遣 / 自动委托） | ⭐⭐ | 原神派遣、星铁委托 | Web API（HoYoLAB BBS 提供） |
| **T3 内容级** | 周常 boss / 副本 | ⭐⭐⭐⭐ | 周本、深渊、混沌回忆 | 模拟器 + CV + 触屏脚本（M3+） |
| **T3** | 自动刷材料 | ⭐⭐⭐⭐ | 原神世界材料 farming | 模拟器 + CV |
| **T4 决策级** | 抽卡决策 / 角色培养建议 | ⭐⭐⭐ | "这个池子要不要抽" | LLM + 数据库（无需自动化执行，仅建议） |
| **T4** | 后期复盘 | ⭐⭐⭐ | "我今天打的深渊哪步可以优化" | LLM + 战斗 log 分析 |

**M1-M3 重点：T1-T2**。T3 留 M3+，T4 中的"建议类"可以早做。

---

## 4. 产品形态

```
┌────────────────────────────────────────────────────────────┐
│                      gogameclaw.com                        │
│  Web Dashboard (登录 / 链账号 / 看任务 / 看历史 / 订阅)        │
└─────────────────────────┬──────────────────────────────────┘
                          │ REST / Server Action
┌─────────────────────────┴──────────────────────────────────┐
│                     Core API (Next.js)                     │
│  /api/agent     ← OpenClaw skill 调用入口                    │
│  /api/tasks     ← 通用任务调度（新）                          │
│  /api/cron/*    ← Cloud Scheduler 触发                       │
└─────────┬───────────────┬──────────────────────┬───────────┘
          │               │                      │
   ┌──────┴──────┐  ┌─────┴──────┐       ┌──────┴───────┐
   │  Adapters   │  │ AI Brain   │       │  Automation  │
   │  (per game) │  │ (LLM)      │       │  Workers     │
   │  hoyolab    │  │ planning   │       │  (M3+)       │
   │  kuro       │  │ reporting  │       │  emulator    │
   │  bilibili   │  │ advice     │       │  + CV        │
   │  ...        │  │            │       │              │
   └─────────────┘  └────────────┘       └──────────────┘

External skills:  ~/.claude/skills/gameclaw-*  ← 安装入 Claude/Codex
```

### 4.1 三个产品面

1. **Web 平台 `gogameclaw.com`**：账号、订阅、任务模板、历史、可视化。商业化主入口。
2. **OpenClaw Skill 集合**：每款游戏一颗 skill（`gameclaw-genshin`、`gameclaw-wuwa`...），统一从 ClawHub 安装。
3. **API**：让其他 agent / app / 第三方能调用单次代练任务。

### 4.2 商业模式（草）

- **免费层**：每天每账号 1 次签到，最多 3 个游戏账号
- **Pro（$5/月）**：无限账号、所有 T1-T2 任务、邮件领取、体力消耗
- **Pro+（$15/月）**：T3 自动副本（M3 上线后）、AI 决策建议、私有 worker
- **企业 / 公会**：SLA、自部署 license

（数字是草，需要 cohort 数据才能定）

---

## 5. 技术架构演进

### 5.1 核心抽象：Game Adapter

每款游戏 = 一个 adapter，**统一接口**：

```ts
// src/adapters/types.ts (新)
interface GameAdapter {
  slug: string;                    // 'genshin' | 'wuwa' | 'arknights' ...
  vendor: string;                  // 'hoyoverse' | 'kuro' | 'yostar' ...
  displayName: string;
  authMethods: AuthMethod[];       // ['cookie', 'oauth', 'token']

  // 能力清单
  capabilities: Capability[];      // ['checkin', 'mail', 'stamina', 'commission']

  // 链账号验证
  verify(creds: Credentials): Promise<AccountInfo>;

  // 执行任务
  execute(task: Task, creds: Credentials): Promise<TaskResult>;
}
```

每个 adapter 实现一组 capability。**新游戏接入 = 新建一个 adapter 文件 + 注册**，无需碰核心代码。

### 5.2 AI Brain 层

中央调度器，输入用户意图（自然语言或结构化），输出**任务计划**：

```
User: "把我所有游戏的日常都做了，节省体力"
        ↓
Planner (LLM):
  [
    {game: genshin, task: checkin},
    {game: genshin, task: claim_mail},
    {game: genshin, task: spend_resin, mode: 'expedition'}, // 不浪费
    {game: starrail, task: checkin},
    {game: wuwa, task: checkin},
    ...
  ]
        ↓
Executor → Adapters → Results → Reporter (LLM 生成报告)
```

LLM 选型：默认 Claude Haiku 4.5（成本低、调用快），高级任务 Sonnet 4.6。所有调用走 prompt cache。

### 5.3 自动化后端的三层

| 层 | 适用 | 状态 |
|---|---|---|
| **L1 Web API** | 厂商提供的 BBS / 米游社 / 库洛社区类 API | M0 已有 (HoYoLAB)；M1 扩展 |
| **L2 Mobile API** | 抓包/逆向出来的游戏 client API（仅查询/低风险操作） | M2 引入，每个 adapter 自己决定要不要用 |
| **L3 Emulator + CV** | 安卓模拟器（Waydroid / Genymotion / 云手机）+ OCR + 触屏脚本 | M3 引入，仅 Pro+ 用户，独立 worker pool |

L3 是高复杂度高风险层，单独抽到 worker 服务，不污染 web app。

### 5.4 数据模型演进

当前：`User`, `GameAccount`, `CheckInLog`, `SupportedGame`。

需要新增：

```prisma
model Task {
  id          String     @id @default(cuid())
  userId      String
  gameAccountId String
  capability  String     // 'checkin' | 'mail' | 'stamina_spend' | ...
  status      String     // 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  scheduledFor DateTime?
  startedAt   DateTime?
  finishedAt  DateTime?
  triggeredBy String     // 'cron' | 'user' | 'skill' | 'agent'
  payload     Json?      // capability-specific 输入
  result      Json?      // capability-specific 输出
  cost        Json?      // {tokens, ms, $}
  errorCode   String?
  errorMsg    String?
  createdAt   DateTime   @default(now())

  @@index([userId, createdAt])
  @@index([status, scheduledFor])
}

model TaskTemplate {
  // 用户自定义"每日套餐"：选游戏×能力×顺序×条件
  id          String   @id @default(cuid())
  userId      String
  name        String
  cron        String?
  steps       Json     // ordered list of {gameSlug, capability, params}
  isActive    Boolean  @default(true)
}

model Subscription {
  // 商业化 (M2+)
  id          String   @id @default(cuid())
  userId      String   @unique
  tier        String   // 'free' | 'pro' | 'proplus' | 'enterprise'
  ...
}
```

`CheckInLog` 是 `Task` 的特例——可以保留做兼容，或迁移并废弃。

### 5.5 Skill 生态

当前 `gameclaw_skill/` 是单一 skill。演进为 **skill 集合**：

```
~/.claude/skills/
  gameclaw/                    ← 主 skill（聚合 + 路由）
  gameclaw-genshin/            ← per-game skill（可选独立装）
  gameclaw-wuwa/
  gameclaw-arknights/
  ...
```

主 skill 提供 `/gameclaw <自然语言>` 入口；per-game skill 提供 `/gameclaw-<game> <command>` 精细操作。统一在 ClawHub 上发布。

---

## 6. 路线图（Milestones）

> 时间是粗估，假设 1 名全栈 + AI 协作。括号里是核心 deliverable。

### M0 · 已完成（基线）

- HoYoLAB 5 款签到、Cron 定时、Skill v1、Cloud Run 部署、AES-256 cookie 加密、CI/test、结构化日志。

### M1 · 多厂商签到 + 任务抽象（4 周）

**目标**：跑通 GameAdapter 抽象，支持 ≥3 个新厂商，仅用 L1 web API。

- [ ] 抽出 `src/adapters/` 目录与 `GameAdapter` 接口；HoYo 5 款迁移为 `adapters/hoyolab.ts`
- [ ] 新增 adapter：**鸣潮（Kuro）**、**明日方舟（Yostar / 森空岛）**、**米游社/B 服**变体
- [ ] DB schema 加 `Task` / `TaskTemplate`，`CheckInLog` 数据迁移到 `Task`
- [ ] `/api/tasks` 通用入口替代 `/api/checkin`（保留旧路由 alias）
- [ ] Skill v2：用自然语言 → 调用 `/api/tasks`
- [ ] 文档：「如何为 GameClaw 写一个新游戏 adapter」
- **退出标准**：8 款游戏每日签到 + 邮件领取（任意 3 款）跑通 7 天稳定。

### M2 · AI 决策层 + 商业化（6 周）

**目标**：从"自动化"升级到"AI 代练"，上线订阅。

- [ ] AI Planner：LLM 把自然语言 → 任务列表，落库后由 Executor 执行
- [ ] 任务模板（"我的日常套餐"），用户在 Web 配置
- [ ] AI Reporter：每天/每周自动生成"代练日报"
- [ ] 体力消耗类能力（HoYo 派遣、星铁委托）
- [ ] Stripe / 支付宝订阅，3 档定价
- [ ] 用量计费（LLM token / 任务次数）
- [ ] 多语言扩 ja/ko/zh-TW（已有 en/zh/ja/ko）
- **退出标准**：≥10 款游戏；≥4 类 capability；付费转化率有数据可看。

### M3 · 模拟器 worker + 副本代练（10 周，Pro+ Beta）

**目标**：突破 web API 边界，进 L3 自动化。

- [ ] Worker 服务：独立部署（K8s / Cloud Run job），跑 Waydroid + ADB
- [ ] CV 框架：OCR（PaddleOCR / Tesseract）+ 模板匹配 + LLM 视觉推理（Claude vision API）
- [ ] 一款标杆游戏的副本代练（候选：明日方舟自动刷理智、原神自动派遣 UI 兜底）
- [ ] 任务中断/恢复、画面截图归档（用户自查证据）
- [ ] 风控：随机延迟、人类化操作、单账号速率限制
- **退出标准**：标杆游戏副本代练成功率 ≥95%，封号率 0。

### M4 · ClawHub Marketplace + 社区（持续）

- [ ] 把每款游戏 adapter 拆为独立 OpenClaw skill 包，发布到 ClawHub
- [ ] Adapter SDK + 模板仓库 + 提交/审核流程
- [ ] 公开收益分成（contributor 写的 adapter 用户付费 → 分成）
- [ ] 私有部署版（企业/公会）

---

## 7. 风险 / 合规

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| **厂商封号** | 中 | 高（用户资产损失） | 仅用网页 cookie/token；模拟操作走人类化策略；ToS 出条款让用户知情；提供"风险等级标签"，用户自选 |
| **厂商关闭 API** | 高 | 中（adapter 失效） | adapter 解耦；监控接口失败率；社区共建快速修复 |
| **法律风险（代练服务）** | 中 | 中 | 国内代练服务处在灰色地带但成熟；明确不做"账号委托"，只做"用户自己账号上的自动化"；ToS 写清 |
| **LLM 成本不可控** | 中 | 中 | 默认 Haiku；prompt cache；用量计费传导给 Pro 用户 |
| **依赖 OpenClaw / ClawHub** | 低 | 中 | Skill 协议是开放的，本质是 SKILL.md 文件，可独立分发 |
| **支付/合规（订阅）** | 低 | 高 | 用 Stripe（成熟）；国内单独走支付宝 |
| **隐私（cookie 是高敏感凭据）** | 中 | 高 | 已有 AES-256-GCM at rest；M2 加 KMS / Cloud HSM；定期审计；ToS / 隐私政策上线 |

---

## 8. 可观测性 / 运维

- **指标**（OpenTelemetry → GCP Cloud Monitoring）：
  - 任务成功率（按 game × capability）
  - LLM token / $ 消耗（按 user × tier）
  - Adapter 失败率（用于发现 API 变化）
  - Cron 调度准时性
- **告警**：单 adapter 失败率 >20% 持续 1h → PagerDuty
- **审计日志**：每次任务执行写不可变日志（含截图 hash for L3）
- **状态页**：`status.gogameclaw.com`（M2）

---

## 9. 立即行动 / Next Steps（本周）

1. **修复线上证书** ← 已识别（DNS 已修，等证书签发）
2. **把当前 README 改为新定位**（保留向下兼容描述）
3. **新建 `src/adapters/` 目录**，把 HoYo 代码迁过去（不破坏现有功能，先做骨架）
4. **新增一个 adapter 试水**：建议从**鸣潮（Wuthering Waves）**开始，库洛社区有公开签到 API，且用户重叠度高
5. **plan.md 评审**：你过一遍这份文档，砍掉/改掉不对的方向，再开 issue 拆 M1 任务

---

## 10. 待你确认的开放问题

1. **代练边界**：是否接受未来引入 L3（模拟器代练副本）？这是从"工具"变"代练服务"的关键一跃，但合规和工程量都加倍。
2. **目标地区**：主打中国大陆 / 海外华人 / 全球？决定支付方案、语言优先级、ToS 起草地。
3. **盈利节奏**：M2 就上订阅，还是先免费做用户量到 M3 再收费？
4. **Adapter 政策**：第三方 contributor 写的 adapter 怎么审核？要不要做"官方认证"和"社区"两档？
5. **品牌**：保留 GameClaw 还是出中文双品牌（如"游戏代练侠/爪")？
6. **AI 模型预算**：每用户每月 LLM 成本上限多少 USD（决定 free 层是否含 AI planner）？

---

*Path: `plan.md` （仓库根目录）·  下一步：你逐节过一遍，标 ✅ / ✏️ / ❌，我据此切 issue。*
