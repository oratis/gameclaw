# GameClaw — 通用游戏代练任务系统 · Plan

> 文档版本：v0.1（2026-05-10）· 配套 [plan.md](plan.md) M2/M3 章节的深度展开。
> 范围：从「每日签到」延伸到「人类代练能做的全部任务」，含技术架构、风险分级、UX、商业化、路线图。

## 0. TL;DR

当前 GameClaw 只做 **T1 签到**（最轻量的一种代练）。本计划把它扩展到**完整代练谱系**——日常、周常、体力消耗、副本、上分、决策辅助。技术上引入：

- **Capability ontology**：把"代练能做的事"分成可枚举、可调度的 Task 类型
- **三层后端**：L1 Web API（已有）→ L2 客户端 API（新）→ L3 Vision Worker（新）
- **AI Brain**：LLM Planner 把自然语言意图变成任务图，Executor 跑，Verifier 验，Reporter 出报告
- **Worker 集群**：Android 模拟器 + ADB + CV + LLM Vision，K8s 弹性伸缩
- **Risk & Compliance 分级**：每个任务标 ban-risk（绿/黄/红），用户自选要不要冒险

**对标"人类代练（淘宝/代练通/5173）"**：他们手动接的活，我们用 AI 做，**便宜 5–10 倍、速度快 2–3 倍、不接触账号密码（仅 token/cookie 最小权限）、无人手延迟**。

**实施周期**：M2 完成 T1+T2（Web/客户端 API 层全谱代练），M3 进 T3（CV 副本代练 Beta），M4 上 T4（AI 决策与教练）。

---

## 1. 我们要替代谁

### 1.1 人类代练市场扫描（2026）

代练通、5173、淘宝代练、电竞猫等平台支撑着一个**百亿规模的中国市场**，主流任务类型与 GameClaw 目标对照：

| 人类代练做的事 | GameClaw Tier | 难度 | 我们能不能做 |
|---|---|---|---|
| **王者/英雄联盟/瓦罗兰特上分** | T5 PvP | ⭐⭐⭐⭐⭐ | ❌ 不做（强制违反 ToS，技术难度顶峰，封号高风险） |
| **MMO 等级代练**（魔兽、新世界） | T4 Account-leveling | ⭐⭐⭐⭐ | ⚠️ 仅 PvE，灰区 |
| **每日签到 / 福利领取** | T1 Web | ⭐ | ✅ 已做（M0/M1） |
| **日常委托 / 每日任务** | T2 Daily | ⭐⭐ | ✅ M2 做 |
| **周常 boss / 副本** | T3 Weekly | ⭐⭐⭐ | ✅ M3 做（CV worker） |
| **体力消耗 / 资源转换** | T2 Stamina | ⭐⭐ | ✅ M2 做 |
| **大秘境 / 团本通关** | T3+ | ⭐⭐⭐⭐ | ⚠️ 选择性做（合规友好的） |
| **抽卡 / 装备建议** | T4 Coaching | ⭐⭐⭐ | ✅ M2 做（不执行操作，仅给建议） |
| **社交陪玩** | T0 | n/a | ❌ 出范围 |

人类代练 20% 平台抽成 + 工时成本，我们 0% 中间人 + 计算成本。**单位经济上的 10x 才能撕开市场**。

### 1.2 OSS 自动化生态扫描（决定 vs 借力）

中国/全球已有相当成熟的**单游戏自动化项目**：

| 项目 | 游戏 | 技术栈 | 状态 |
|---|---|---|---|
| [MAA](https://github.com/MaaAssistantArknights/MaaAssistantArknights) | 明日方舟 | C++ + 图像识别，全日常一键 | ✅ 业界标杆 |
| [March7thAssistant](https://github.com/moesnow/March7thAssistant) | 崩铁 | Python + CV，含模拟宇宙 / 混沌回忆 | ✅ 完整 |
| [StarRailCopilot](https://github.com/LmeSzinc/StarRailCopilot) | 崩铁 | LmeSzinc 出品，技术力强 | ✅ |
| [ok-wuthering-waves](https://github.com/ok-oldking/ok-wuthering-waves) | 鸣潮 | Python + ok-script，自动战斗刷声骸 | ✅ |
| [Auto_Simulated_Universe](https://github.com/CHNZYX/Auto_Simulated_Universe) | 崩铁 | 模拟宇宙专精 | ✅ |
| [Fhoe-Rail](https://github.com/March7thAssistant 子模块) | 崩铁 | 大世界刷材料 | ✅ |
| [Skland_API](https://github.com/ProbiusOfficial/Skland_API) | 方舟 BBS | API doc | ⚠️ 2024-08 archived |
| 原神 类似 | 原神 | 各种零散 | ⚠️ 风控严格，少有靠谱的 |

**战略含义**：
- 不要 NIH（重新发明轮子）。每款游戏都有 1-2 个明星 OSS 项目 ——**包装它们**而不是从零写
- GameClaw 的差异是「**多游戏统一调度 + AI Brain + Cloud SaaS + OpenClaw Skill**」，不是写比 MAA 更牛的 CV
- 在 worker 层把这些项目接进来：Worker = "headless 浏览器 / Android 模拟器 + 这些 OSS 包装层"

---

## 2. 任务本体（Capability Ontology）

把「代练」拆成原子任务类型。每个 Capability 三个属性决定它的工程位置：**Tier**、**Backend**、**Risk**。

### 2.1 完整 Capability 表

| Capability | Tier | Backend | Risk | 描述 |
|---|---|---|---|---|
| `checkin` | T1 | L1 | 🟢 | 每日签到（已有） |
| `checkin_info` | T1 | L1 | 🟢 | 查签到状态（已有） |
| `mail_claim` | T1 | L1 | 🟢 | 邮件领取（HoYo BBS API 支持） |
| `redeem_code` | T1 | L1 | 🟢 | 兑换码（多数游戏有 web 兑换 API） |
| `event_reward_claim` | T1 | L1 | 🟢 | 活动奖励一键领 |
| `bbs_daily_task` | T1 | L1 | 🟢 | 论坛/社区签到、看帖、点赞、分享（米游社、库街区、森空岛皆有） |
| `bbs_coin_exchange` | T1 | L1 | 🟢 | 论坛币兑换游戏内奖励 |
| `account_summary` | T1 | L1 | 🟢 | 角色等级、大世界进度等只读查询 |
| --- | --- | --- | --- | --- |
| `stamina_spend_dispatch` | T2 | L1 | 🟢 | 派遣（HoYo expedition、方舟基建轮换） |
| `stamina_spend_commission` | T2 | L1/L2 | 🟢 | 每日委托 |
| `stamina_convert` | T2 | L2 | 🟡 | 体力转化（凝结树脂、压缩星琼） |
| `weekly_boss_simple` | T2 | L2 | 🟡 | 简单周本（如方舟剿灭） |
| `friend_visit_credit` | T2 | L1 | 🟢 | 访友拿信用 |
| `mission_collect` | T2 | L1/L2 | 🟢 | 任务奖励领取（已完成的任务） |
| --- | --- | --- | --- | --- |
| `daily_quests_full` | T3 | L3 | 🟡 | 完整日常委托（需进游戏点击） |
| `weekly_dungeon` | T3 | L3 | 🟡 | 周本副本（深渊、混沌回忆、宿舍） |
| `material_farm` | T3 | L3 | 🟡 | 材料 farming（指定关卡刷指定次数） |
| `auto_battle` | T3 | L3 | 🟡 | 自动战斗（PvE 关卡，按预设阵容） |
| `infrastructure_shift` | T3 | L3 | 🟢 | 方舟基建排班（MAA 强项） |
| `recruitment_smart` | T3 | L3 | 🟢 | 方舟智能公开招募 |
| `roguelike_clear` | T3 | L3 | 🟡 | 模拟宇宙、IS 一刀流 |
| --- | --- | --- | --- | --- |
| `pvp_rank_push` | T5 | L3+L4 | 🔴 | PvP 上分 — **不做** |
| `account_levelup` | T4 | L3 | 🟠 | 账号肝级 — **谨慎做（低等级、PvE only）** |
| --- | --- | --- | --- | --- |
| `coaching_pull_advice` | T4 | n/a | 🟢 | 抽卡建议（LLM 推理） |
| `coaching_team_build` | T4 | n/a | 🟢 | 阵容建议 |
| `coaching_post_match` | T4 | n/a | 🟢 | 战斗复盘（screenshot → LLM） |
| `coaching_resource_plan` | T4 | n/a | 🟢 | 长期养成规划 |

### 2.2 Tier 分层设计逻辑

| Tier | 名称 | 实现成本 | 商业价值 | M 阶段 |
|---|---|---|---|---|
| T1 | 信号级 | ⭐ | 流量、粘性 | M0–M1 ✅ |
| T2 | 资源级 | ⭐⭐ | 用户保留 | **M2** |
| T3 | 内容级 | ⭐⭐⭐⭐ | 付费转化主战场 | **M3** |
| T4 | 决策级 | ⭐⭐⭐ | 差异化护城河（AI brain）| **M2 起步、M3 完善** |
| T5 | 对抗级（PvP） | ⭐⭐⭐⭐⭐ | 单价最高但合规雷区 | **不做** |

T3 是分水岭——一旦要进游戏画面，模拟器、CV、设备指纹、风控规避全部要面对。

---

## 3. 三层后端架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         GameClaw Web/SaaS                       │
│  Next.js │ Cloud Run │ User → Task Template → Schedule → Run     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                ▼            ▼            ▼
┌──────────────────┐ ┌──────────────┐ ┌─────────────────────────┐
│  L1: Web API     │ │ L2: Client   │ │ L3: Vision Workers       │
│  Pool            │ │    API Pool  │ │ (K8s / Cloud Run jobs)   │
│                  │ │              │ │                          │
│  Direct fetch    │ │ Reverse-eng  │ │ Android Emulator         │
│  to BBS APIs     │ │ game APIs    │ │ + ADB                    │
│                  │ │              │ │ + ok-script / MAA / etc. │
│                  │ │              │ │ + Vision LLM (fallback)  │
│                  │ │              │ │                          │
│  HoYo / Kuro /   │ │ Skland       │ │ Per-game runners:        │
│  Miyoushe /      │ │ richer       │ │   - genshin-runner       │
│  ...             │ │ endpoints    │ │   - hsr-runner (m7a)     │
│                  │ │              │ │   - wuwa-runner (ok)     │
│                  │ │              │ │   - arknights-runner(MAA)│
│                  │ │              │ │                          │
│  Latency: 100ms  │ │ Latency: 1s  │ │ Latency: 30s–10min/task  │
│  Cost: $0.0001   │ │ Cost: $0.001 │ │ Cost: $0.05–0.50/task    │
│  Risk: 🟢       │ │ Risk: 🟡     │ │ Risk: 🟡–🟠              │
└──────────────────┘ └──────────────┘ └─────────────────────────┘
        │                  │                       │
        └──────────────────┴───────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Task Result DB  │
                  │ + Audit Logs    │
                  │ + Screenshots   │
                  └─────────────────┘
```

### 3.1 L1: Web API Pool（已有）

**已实现**：HoYo、Miyoushe、Kuro 三个 vendor。

**M2 还需加的 vendor**：
- Skland（明日方舟，CN）— sign + sanity 查询
- Yostar Passport（明日方舟海外、Blue Archive 等）
- 西山居（剑网三）— 公测
- 网易（阴阳师、第五人格）— 风控严，慎重

**特点**：调用厂商对外开放的 BBS / 米游社类 API。绿色风控。我们已经把抽象搭好（`GameAdapter`）。

### 3.2 L2: Client API Pool（M2 引入）

游戏客户端通过 HTTPS 与服务器通信，**部分接口不在公开 BBS API 范围**。逆向社区抓包出来的，举例：

- 原神：树脂量、角色养成、大世界进度（部分接口存在但 mihoyo 风控严）
- 崩铁：开拓力查询、角色配队（部分接口可读不可写）
- 鸣潮：声骸库存、角色 build（库洛 community APIs 比 HoYo 多）
- 方舟：基建产出预估（Skland 已经覆盖大部分）

**特点**：比 L1 信息更细，但**风控敏感**——直接命中游戏服务器流量需要小心。Worker 实现：
- `node-fetch` 加正确的 device-id / sign 算法
- 单 IP 单账号低频调用
- 每次调用前 sleep 随机时间

**风险**：🟡 中等。腾讯/网易系几乎所有 L2 都是封号高危。HoYo 系 L2 多数是只读查询，相对安全。

### 3.3 L3: Vision Workers（M3 引入）

无法用 API 解决的 → 进画面。

**Worker 单元**：
```yaml
worker:
  image: gameclaw/runner-genshin:1.0   # per-game image
  resources:
    cpu: 4
    memory: 8Gi
    gpu: optional   # 部分游戏要 H/W 加速
  android: waydroid 1.4 (genymotion fallback)
  game_client: pre-installed
  scripts:
    - ok-genshin / yagb / etc.
  controller:
    - openadb client
    - opencv2 + paddleocr + template-match library
    - claude vision client (fallback for unrecognized states)
```

**Worker 模型**：
- **Stateless**：每次任务从干净快照启动（避免状态污染）
- **Per-account session**：用户的游戏账号登录态复用同一个 worker（避免重复登录的风控）
- **Wait/queue**：用户购买"代练时间"，worker 池按时段调度

**自动化栈选型**：
- **Tier 1（直接借力）**：每款游戏挑一个明星 OSS（MAA/M7A/ok-wuwa）作为底层 actor，包装成 GameClaw runner
- **Tier 2（自研补漏）**：明星 OSS 没覆盖的小众游戏，用 OpenCV 模板匹配 + PaddleOCR + 编排脚本
- **Tier 3（LLM 兜底）**：完全无法用规则识别的状态（弹窗、新版本 UI 变化），调 Claude vision 让它"读屏 → 决定下一步"

**LLM Vision 角色**：
- **不是**主控（每帧都调 LLM 太贵太慢）
- **是**fallback —— 当 OpenCV template match 找不到锚点 / OK-script 卡住 → 截屏喂 Claude vision → "你看到的是什么界面？应该点哪？"
- 也用于 task verification：跑完任务后，截屏让 LLM 确认目标达成

---

## 4. AI Brain

### 4.1 Planner

输入：用户自然语言意图 + 当前账号状态 + 当前时间/事件窗口

输出：**Task DAG**

```
User: "帮我把今晚之前能做的都做了，晚上 11 点之前要睡"
         ↓
Planner (Claude Sonnet 4.6 + tool calling):
  steps:
    - id: 1, capability: checkin,        game: genshin,    deps: []
    - id: 2, capability: checkin,        game: starrail,   deps: []
    - id: 3, capability: checkin,        game: wuwa,       deps: []
    - id: 4, capability: mail_claim,     game: genshin,    deps: [1]
    - id: 5, capability: stamina_spend_dispatch,
                                         game: genshin,    deps: [1], when: ">8 stamina"
    - id: 6, capability: weekly_dungeon,
                                         game: starrail,   deps: [2], when: "weekday=sunday"
                                                                       constraint: time<=21:00
    - id: 7, capability: roguelike_clear,
                                         game: starrail,   deps: [6], constraint: time<=22:30
  estimated_total_time: 47min
  estimated_cost: $0.12
```

**Planner 设计要点**：
- 用 Claude Haiku 4.5 做基本编排（便宜、够用）
- 复杂决策（避开维护时间窗、平衡多账号资源）升级到 Sonnet 4.6
- 全部走 prompt cache —— task ontology + 用户账号状态作为 cached prefix
- 输出是结构化 JSON（function-calling 强制 schema）

### 4.2 Executor

按 DAG 顺序/并行执行 task，路由到正确的后端层。

```
Task → 选 backend (L1/L2/L3) → 选 worker → 执行 → 取 result
```

每个 task 的 status machine：
```
pending → scheduled → running → [success | already_done | failed | skipped]
                                     ↓
                            (failed) → retry once → fail-final
```

### 4.3 Verifier

执行完每个 T3 task 后调用，确认目标达成。模式：
- L1/L2 task：response code = success → 直接 done
- L3 task：worker 返回前/后截屏 → Claude vision 对比 → "进度条从 0→100，已通关副本" → confirm

Verifier 非常重要：T3 模拟器代练经常因为弹窗/网络中断导致**看似完成实则没完成**。LLM verifier 是最后一道防线。

### 4.4 Reporter

每天/每周生成"代练日报"：

```
今日代练报告 — 2026-05-10

✅ 9 款游戏，共 23 个任务
   - 签到 9/9
   - 邮件 4/4
   - 派遣 5/5（合计回收 480 体力）
   - 委托 3/3
   - 周本 1/1（崩铁混沌回忆 ★36）
   - 失败 1/23（鸣潮签到，token 过期，请重新登录）

预计节省时间：47 分钟
账号危险信号：无
本月累计代练时间：22h31m
本月使用费用：¥38（订阅基础费 + ¥3 vision API 用量）
```

由 Claude Haiku 出，文风可个性化（"小学生"/"管家"/"赛博正经")。

---

## 5. 数据模型扩展

```prisma
// 新增/演进
model TaskTemplate {
  id          String   @id @default(cuid())
  userId      String
  name        String                       // "我的日常套餐"
  schedule    String?                      // cron: "0 4 * * *"
  steps       Json                         // ordered array of TaskStep
  isActive    Boolean  @default(true)
  preferences Json?                        // {staminaThreshold:8, doWeeklyOnSundayBefore:21:00, ...}
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Task {
  id              String   @id @default(cuid())
  userId          String
  gameAccountId   String?                  // null for cross-account meta-tasks
  templateRunId   String?                  // groups tasks from one template fire
  templateStepIdx Int?
  capability      String                   // 'checkin' | 'mail_claim' | ...
  gameSlug        String                   // 'genshin' | 'wuwa' | ...
  status          String                   // pending|scheduled|running|success|already_done|failed|skipped
  backendTier     String?                  // 'L1' | 'L2' | 'L3'
  workerId        String?                  // FK to Worker (L3 only)
  scheduledFor    DateTime?
  startedAt       DateTime?
  finishedAt      DateTime?
  retryOf         String?                  // self-FK for retry chain
  triggeredBy     String                   // 'cron' | 'manual' | 'skill' | 'agent'
  payload         Json?                    // capability-specific input
  result          Json?                    // capability-specific output
  cost            Json?                    // {tokensIn, tokensOut, ms, usd, gpuSeconds?}
  errorCode       String?
  errorMessage    String?
  screenshotUrls  String[]                 // GCS / S3 URLs (L3 only)
  createdAt       DateTime @default(now())

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  gameAccount GameAccount? @relation(fields: [gameAccountId], references: [id], onDelete: SetNull)

  @@index([userId, createdAt])
  @@index([status, scheduledFor])
  @@index([templateRunId])
}

model Worker {
  id              String   @id @default(cuid())
  pool            String                   // 'l3-genshin' | 'l3-wuwa' | ...
  status          String                   // idle | busy | quarantined | dead
  currentTaskId   String?
  ipAddress       String?
  region          String?                  // gcp region
  imageVersion    String?                  // 'gameclaw/runner-genshin:1.4'
  ownerUserId     String?                  // null = shared pool; set = dedicated for Pro+
  totalTasksRun   Int      @default(0)
  successRate     Float?                   // rolling
  lastHeartbeatAt DateTime?
  createdAt       DateTime @default(now())

  @@index([pool, status])
}

model Subscription {
  id          String   @id @default(cuid())
  userId      String   @unique
  tier        String                       // 'free' | 'pro' | 'proplus' | 'enterprise'
  monthlyTaskQuota Int                     // -1 for unlimited
  monthlyAiBudgetCents Int                 // claude API budget
  startedAt   DateTime
  renewsAt    DateTime?
  status      String                       // active | past_due | canceled
}
```

---

## 6. Risk & Compliance 模型

### 6.1 风险标签

每个 capability × game 组合标一个风险等级：

| 等级 | 含义 | 示例 |
|---|---|---|
| 🟢 绿 | 厂商默许（公开 BBS API） | HoYo signin、米游社签到 |
| 🟡 黄 | 灰区，无大规模封号案例 | 体力派遣、L3 限时副本 |
| 🟠 橙 | 灰区，小规模观察到封号 | 长时间无人监督 L3、账号肝级 |
| 🔴 红 | 明确违反 ToS | PvP 上分、资源外挂 |

红色不做，橙色需要用户**双重确认 + 风险知情**才能启用。

### 6.2 风控规避

- **设备指纹一致性**：同一账号永远走同一 worker（直到该 worker 退役）
- **真人化时序**：每个动作随机 ±20% 延迟
- **每日上限**：任意账号 24h 内 task 总数封顶（防自动化检测）
- **网络区域**：用户 IP 区域决定 worker pool（国服走 cn 节点）
- **维护窗口避让**：Planner 知道每款游戏每周维护时间，自动避让
- **异常熔断**：单 vendor 失败率 >20% 自动暂停该 vendor 全部任务并告警（厂商可能在调风控）

### 6.3 合规态度

- **不接 PvP 代打** —— 出明确公告
- **明确告知用户**：每个 task 启用前展示风险等级；用户必须 opt-in 而非 opt-out 高风险
- **数据最小化**：cookie/token 加密存储；不存账号密码
- **审计可追溯**：每个 task 留 log+截屏，用户可随时回看
- **赔付政策**：T3+ 任务承诺合理范围内的封号赔付（订阅条款）
- **用户终止**：任何时刻一键删除所有数据 + 解绑

---

## 7. UX 设计

### 7.1 三种入口

1. **Web Dashboard**（最详细控制）
   - 「我的日常套餐」编辑器：拖拽 capability × game 组合任务流
   - 实时任务面板（running tasks + queue + history）
   - 每个 task 的详情（log + screenshots）
   - 风险标签清晰展示

2. **OpenClaw Skill**（最便捷）
   - `/gameclaw run-template my-daily`
   - `/gameclaw run "今天周日，把所有周本都打了"`
   - 自然语言一切

3. **API**（开发者）
   - `POST /api/tasks` body 是 task 数组或自然语言意图
   - 第三方 agent 可调用

### 7.2 配置粒度

```
my-daily-template:
  scope: all linked accounts
  enabled_capabilities:
    - checkin               ← 永远开
    - mail_claim            ← 默认开
    - stamina_dispatch      ← 默认开
    - daily_quests_full     ← Pro+ 用户才能选（T3）
    - weekly_dungeon        ← 单独勾选
  preferences:
    stamina_threshold: 8     # 体力低于 8 不刷
    weekly_only_on:
      - sunday
    avoid_maintenance: true
    notify_on:
      - any_failure
      - weekly_summary
  risk_acceptance:
    accept_yellow: true
    accept_orange: false
    accept_red: false
```

### 7.3 可视化

每个 T3 task 跑完后给用户：
- 关键节点截屏（开始 / 完成 / 异常）
- 执行用时
- 战斗细节（如刷副本，每局阵容、伤害、掉落）
- 类比 MAA 的"今日产出统计"风格

---

## 8. 单位经济（Unit Economics）

### 8.1 成本拆解（典型 Pro 用户每月）

| 项目 | 数量 | 单价 | 月成本 |
|---|---|---|---|
| LLM Planner 调用 | 30 次/月 × 2 模型 | Haiku $0.001 + Sonnet $0.01 | $0.33 |
| LLM Verifier 调用 | 100 次/月 (vision) | Sonnet vision $0.02 | $2.00 |
| LLM Reporter | 30 次 | Haiku $0.005 | $0.15 |
| L1 任务 | ~270 次/月（9 游戏 × 30 天） | $0 | $0 |
| L2 任务 | ~150 次/月 | $0 | $0 |
| L3 任务（Pro+ 才有） | ~60 次/月 | GPU/CPU $0.20/task | $12.00 |
| 存储（截屏） | 1GB / 月 | $0.02/GB | $0.02 |
| **合计** | | | **L3 用户 ≈ $14.50** |
| **Pro 用户（无 L3）** | | | **≈ $2.50** |

### 8.2 定价（草）

| 档位 | 月费 | 含 L3? | 月任务上限 | 毛利 |
|---|---|---|---|---|
| Free | $0 | ❌ | 90 | -$1（接受亏损做获客） |
| Pro | $5 | ❌ | 1500 | $2.50 / mo |
| Pro+ | $15 | ✅ 60 任务 | 3000 | $0.50 / mo（前期低毛利换市场） |
| Enterprise | $50+ | 私有 worker | unlimited | 50%+ |

L3 毛利薄是因为 GPU/计算成本是真实变动成本。当我们能把 worker 共享给同游戏多用户、把 ok-script 调优到秒级 → 边际成本压到 $0.05，毛利 80%。这是 M3 后期的工程目标。

### 8.3 LLM 成本优化

- **Prompt cache**：Planner 的 task ontology 5k tokens 长 → cache 让重复调用 90% off
- **Haiku 优先**：Planner 默认 Haiku 4.5，仅复杂场景升级 Sonnet
- **Vision 节流**：Verifier 不是每个 task 都跑，只对 T3 / 失败重试时跑
- **Batching**：同账号多任务的 Reporter 合一篇报告一次出

---

## 9. Roadmap（接续 plan.md）

### M2 · T1 + T2 全开 + T4 起步（6 周）

> 对应 plan.md M2

- [ ] 数据模型：`Task / TaskTemplate / Subscription` 落地
- [ ] L1 capabilities：`mail_claim`, `redeem_code`, `bbs_daily_task`, `account_summary`（HoYo + Miyoushe + Kuro 各自实现）
- [ ] L2 起步：Skland 完整接入（含 sanity 查询）；HoYoLab `/event/calculate/...` 等只读 API
- [ ] AI Planner v0：基本 capability 编排
- [ ] AI Reporter v0：日报模板
- [ ] T4 决策类：抽卡建议 / 资源规划（独立功能页面，无需 worker）
- [ ] `/api/tasks` 通用入口（替代 `/api/checkin` 的多个变体）
- [ ] Skill v3：自然语言驱动 task DAG
- [ ] Stripe + 支付宝订阅，3 档定价
- [ ] 用量计费（task 计数 + LLM tokens 计数）
- **退出标准**：≥10 款游戏；≥6 个 capability；100 付费用户

### M3 · L3 Worker 集群 + T3 副本代练（10 周）

> 对应 plan.md M3

- [ ] Worker pool 管理服务（K8s）
- [ ] 单 worker 镜像架构（base = ubuntu+waydroid+adb；layer = 单游戏 OSS 包装）
- [ ] 第一个标杆 runner：**明日方舟（包装 MAA）** —— 用户群成熟，OSS 现成，效果最好
- [ ] 第二个标杆：**崩铁（包装 March7thAssistant）**
- [ ] 第三个标杆：**鸣潮（包装 ok-wuthering-waves）**
- [ ] AI Verifier：Claude vision 跑后置截屏验证
- [ ] AI Vision Fallback：runner 卡死 → 截屏喂 Claude vision 找下一步
- [ ] 风险熔断器（按 vendor + capability 失败率自动暂停）
- [ ] Pro+ 订阅档上线
- **退出标准**：标杆 3 款游戏 T3 任务完成率 ≥95%；封号率 0；30 个 Pro+ 付费用户

### M4 · ClawHub Marketplace + T4 教练 + 持续扩展（持续）

- [ ] Adapter SDK + 模板仓库 → 第三方 contributor 提交新游戏 adapter，平台抽成
- [ ] T4 完整：post-match 复盘、长期养成 AI 教练、推队伍配队
- [ ] 私有部署版（公会 / 工作室）
- [ ] 法务体系：用户协议 v2、保险、赔付池

---

## 10. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| 厂商封号 | 中 | 高 | 风险分级 + 真人化 + 用户知情 + 赔付池 |
| 厂商关闭 / 改 API | 高 | 中 | adapter 解耦、监控失败率、社区共建 |
| 上游 OSS 项目停更（MAA 等） | 中 | 中 | fork 自维护 + 雇核心 contributor 兼职 |
| LLM API 涨价或限流 | 中 | 中 | 多供应商兜底（Anthropic + DeepSeek backup）；prompt cache；本地 Haiku 蒸馏 |
| Worker 资源成本失控 | 中 | 中 | per-tier task quota；GPU 预算硬上限；空闲 worker 回收 |
| 法律风险（PvP 代练在某些地区违法） | 低 | 高 | 不做 PvP；ToS 明确限定 PvE only |
| 隐私事故（cookie 泄露） | 低 | 严重 | KMS / Cloud HSM；最小权限；定期审计；Bug Bounty |
| 用户 cookie 被厂商 invalidate（强制重登） | 高 | 低 | 友好通知 + 一键 re-link |
| 单 game 用户基数小到 worker 池利用率低 | 中 | 中 | M3 优先做 top-3 游戏；长尾游戏走 L1+L2 即可 |

---

## 11. 待你拍板的开放问题

1. **L3 全做还是只做合规友好的几款？**
   - 全做：单价高，但封号风险都摊在我们身上
   - 选择性：明日方舟 / 崩铁 / 鸣潮 / 方舟 国服 — 这四款 T3 可控；原神 / WoW PvE 谨慎；PvP / 网易系不做

2. **Worker 开源还是闭源？**
   - 开源（runner 镜像）：社区共建，但我们的护城河变浅
   - 闭源 + 公开 adapter：核心调度算法是商业秘密

3. **T4 教练定价**
   - 包含在 Pro 里？还是单独按 token 计费？
   - 我的倾向：基础教练（抽卡建议）包含；深度（post-match 复盘）按次计费

4. **赔付池规模**
   - 把订阅收入的多少 % 放进保险池？业内类似产品（保号服务）通常是 10–15%

5. **本计划如何更新 plan.md**
   - 把 plan.md 的 Section 5/6 折叠收编进 plan-tasks.md 引用？还是保留两份？
   - 我的倾向：plan.md 是宏观蓝图，plan-tasks.md 是任务系统的工程深挖；两者并存。

6. **我们能不能先收集"代练 demand"数据再决定优先级？**
   - 投入工程前，先放一个表单收集"如果你能让 AI 帮你刷 X，你愿意付 ¥Y 吗" → 用真实需求驱动 M3 标杆游戏选择。

---

*Path: `plan-tasks.md`（仓库根目录）· 配套 `plan.md`*
*Sources: [MAA](https://github.com/MaaAssistantArknights/MaaAssistantArknights) · [March7thAssistant](https://github.com/moesnow/March7thAssistant) · [ok-wuthering-waves](https://github.com/ok-oldking/ok-wuthering-waves) · [Skland_API](https://github.com/ProbiusOfficial/Skland_API) · [代练通](https://m.dailiantong.com/)*
