# 二开新增功能说明（SECONDARY-DEV）

本文档记录本仓库相对上游 [QuantumNous/new-api](https://github.com/QuantumNous/new-api) 的全部二次开发功能，用于后续确认改动范围、追溯需求和与上游同步时快速定位敏感文件。

- **分支约定**：`origin` = 源项目（上游），`main-2` = 本仓库远端（二开主线），本地 `main` = 二开开发分支。
- **分叉基点**：上游 `49ec46966`（fix(relay): apply model-specific OpenAI chat capabilities），此后所有提交为本仓库二开内容。
- **验证约定**：数据库相关改动只需验证 SQLite（其余数据库按 AGENTS.md 要求，由维护者视情况补验）。

---

## 功能总览

| # | 功能 | 状态 | 主要提交 |
|---|------|------|----------|
| 1 | OpenAI 兼容视频查询返回视频直链 | ✅ | `6612da51` → 重做于 `d9697770` |
| 2 | 推广分成（充值返佣）+ 推广活动页 | ✅ | `6612da51`、`721ab881`、`1b39aa4c`、`3a58732b` |
| 3 | 充值"充多少送多少"（按金额赠送） | ✅ | `6612da51` |
| 4 | 兑换码按兑换时间范围筛选 | ✅ | `a9c08252`、`0edf297e`、`47eee7e8`、`ffd4c30b`、`eb687cc4` |
| 5 | 侧边栏推广菜单跟随活动开关 | ✅ | `99772e01`、`1b39aa4c` |

---

## 1. OpenAI 兼容视频查询返回视频直链

### 需求
`GET /v1/videos/{task_id}` 恢复旧版的 `video_url` 返回。上游直链（如第三方网关返回的 mp4）直接给客户端，客户端无需再带 key 访问站内 `/content` 代理；上游不给直链的渠道（Sora/Vertex 等）才回退站内代理地址。

### 实现（全部在宿主 Go 层，不改工厂插件）
- `relaykit/dto/openai_video.go`：`OpenAIVideo` 新增顶层 `url` 与 `video_url` 字段（`omitempty`），成功时同值。
- `relay/channel/task/jsplugin/adaptor.go`：
  - `extractUpstreamVideoURL(task.Data)`：从轮询保存的上游响应体提取直链。字段优先级：顶层 `video_url` → `url` → `metadata.video_url / final_video_url / origin_video_url / url` → `output.*`；**有 `.mp4` 后缀（忽略 `?` / `#` 后参数）的链接优先**。
  - `ConvertToOpenAIVideo`：成功任务注入 `url` / `video_url` / `metadata.url`；提取不到直链时回退 `ResultURL`（Sora/Vertex 为 `/content` 代理）。非成功任务不注入。
  - 插件 render 输出中的 `url` / `video_url` 字段不受信任，注入前统一清空（防渲染层伪造跳转链接）。

### 行为边界
- 历史任务同样生效（查询时实时从 `task.Data` 提取，非仅新任务）。
- Sora 官方上游不返回直链，保持 `/content` 代理（`buildContentRequest` 用渠道 key 拉取），这是预期行为。
- 回归测试：`relay/channel/task/jsplugin/adaptor_test.go`（`TestTaskAdaptorPrefersUpstreamDirectVideoURLFromTaskData` 等）。

---

## 2. 推广分成（充值返佣）+ 推广活动页

### 需求
被邀请人通过在线支付充值成功后，邀请人按比例获得佣金，**直接进入钱包余额**（不走 aff_quota 待划转），同时累加 `aff_history` 统计。仅限在线支付（兑换码、管理员补单、订阅订单不参与）。

### 配置（系统设置 → 额度设置）
- `PromotionCommissionEnabled`：总开关（默认关）。
- `PromotionCommissionRate`：分成比例 0–100（如 5 表示 5%）。
- 开启需管理员先确认支付合规（与邀请奖励同一门禁）。

### 后端
- `model/promotion_commission.go`：`PromotionCommissions` 表（`trade_no` 唯一索引幂等）；`grantPromotionCommission` 在充值事务内发放（佣金直接进上级 `quota` + `aff_history`）；**事务内不得写全局日志表**（SQLite 单连接自锁），日志与缓存同步在提交后由 `recordPromotionCommissionLog` / 缓存同步完成。
- `model/topup.go`：5 个在线支付结算函数（Epay/Stripe/Creem/Waffo/Pancake）全部接入；佣金基数 Stripe 用 `Money`、其余用 `Amount`（不含赠送金额）。
- `controller/promotion.go`：`GET /api/user/promotion`（self 路由），支持 `keyword`（下级用户名前缀或数字 ID）/ `start_timestamp` / `end_timestamp` 筛选；返回开关、比例、邀请码、累计/筛选期佣金、最近一笔、下级用户名、流水分页。`items` 空时序列化为 `[]`。
- `controller/misc.go`：`/api/status` 下发 `promotion_commission_enabled` / `promotion_commission_rate`。
- 回归测试：`model/topup_test.go`（发放/幂等/无上级跳过/流水查询与筛选）。

### 前端
- 侧边栏：钱包下方"推广活动"菜单，**跟随活动开关隐藏**（`use-sidebar-data.ts` 读 status 开关；`use-sidebar-config.ts` 默认模块表含 `personal.promotion: true`，缺失会导致老配置用户菜单被隐藏——已修）。
- `web/src/features/promotion/`：推广活动页。专属链接卡（渐变光斑+标签）、统计卡（累计分成/成员额度/最近一笔/比例/筛选期分成/好友数/成功次数）、下级用户+时间区间筛选、分成明细表、左下角"专属推广官"小卡（桌面端，复制链接并放礼炮）。活动关闭时顶部显示"活动已暂停"横幅。
- 动效组件（共享）：`web/src/components/confetti-cannons.tsx`（自绘 canvas 彩纸礼炮，屏幕两侧对射，尊重 `prefers-reduced-motion`）、`web/src/components/floating-mascot.tsx`（SVG 眨眼漂浮卡通脸）。吉祥物以独立方形卡放在链接卡右侧，不遮挡内容。
- 钱包页：`affiliate-rewards-card.tsx` 重排为"推广小彩蛋"banner（活动开启时显示，引导跳转）+ 推广分成卡（累计分成/比例/已邀请好友 + 自动入账徽标）；`aff_quota` 存量待划转的"转移到余额"按钮保留。

### 与项目自带邀请奖励的关系（重要口径）
- 自带 `QuotaForInviter`/`QuotaForInvitee` 是**注册时一次性奖励**（进 `aff_quota` 待划转 / 受邀者直接到账）；推广分成是**充值流水佣金**（直接进余额）。触发时机不同，代码无冲突，但可叠加：`aff_history` 会同时包含两块，推广活动页"累计推广分成"取自分佣流水表（纯分成），钱包卡用 `aff_history_quota`（含注册奖励）。
- 若只要分成模式：把额度设置里的邀请者/受邀者奖励额度设为 0。

---

## 3. 充值"充多少送多少"（按金额赠送）

### 需求
支付网关设置中按充值金额配置赠送美元数（如 `{"100":5,"200":12}`），可与按金额折扣并存；钱包 UI 展示赠送金额与实际到账。

### 实现
- `setting/operation_setting/payment_setting.go`：`AmountBonus map[int]float64`，option 键 `payment_setting.amount_bonus`；`GetAmountBonus(amount int64)`。
- `model/topup.go`：`TopUp.BonusAmount` **下单时快照**（改配置不影响已创建订单），结算到账 = `(基数 + BonusAmount) × QuotaPerUnit`（经 `WalletQuotaFromDecimalStrict` 饱和换算），容量预检计入赠送。`ManualCompleteTopUp` 同样加赠。
- `controller/topup.go` / `topup_stripe.go` / `topup_waffo.go` / `topup_waffo_pancake.go`：下单时计算赠送并快照；Stripe 到账基数为 `Money`，赠送平加其上。
- `GET /api/user/topup/info` 返回 `bonus` 映射。
- 前端：钱包预设金额按钮展示 `+赠送` 角标与到账金额；支付确认弹窗展示赠送/实际到账；管理端支付设置新增赠送可视化编辑器（`amount-bonus-visual-editor.tsx` / `amount-bonus-dialog.tsx`）。

---

## 4. 兑换码按兑换时间范围筛选

### 需求
兑换码列表支持按**兑换时间**区间筛选（如筛 9 月 15–20 日兑换的码），与状态筛选**独立叠加**、互不强制；默认不筛选。

### 行为口径（理解成本低的关键）
- 时间范围筛的是 `redeemed_time`，**只有已兑换的码有该值**，因此选了时间范围必然只命中已兑换的码——这是字段性质，不是强制状态。要看未使用的码：清空时间范围即可。
- 默认不套用任何区间（曾按需求默认当天，因会整体隐藏未使用码而撤销）。
- 三种状态：URL 无参数 = 默认（全部）；弹层清空两个时间确认 = 查看全部；工具栏"重置" = 同清除。
- 结束时间恰为整天 00:00:00 时自动延伸到当天 23:59:59。

### 实现
- `model/redemption.go`：`SearchRedemptions(keyword, status, startTimestamp, endTimestamp, ...)`；时间区间仅约束 `redeemed_time`（`> 0` 排除未兑换行，防止"只填结束时间"时 0 值误命中），与状态条件 AND 叠加，无强制状态。
- `controller/redemption.go`：接收 `start_timestamp` / `end_timestamp`。
- 前端：工具栏单个 `CompactDateTimeRangePicker`（起止 + 今天/7天/本周/30天/本月预设），`emptyLabel` 显示"兑换时间范围"；URL 参数 `redeemedFrom`/`redeemedTo`（秒级时间戳）可分享。
- 回归测试：`model/redemption_test.go`。

---

## 5. 侧边栏与共享组件改动清单

| 文件 | 改动 |
|------|------|
| `web/src/hooks/use-sidebar-config.ts` | 默认模块表 `personal.promotion: true`（缺失会让老配置用户菜单消失） |
| `web/src/hooks/use-sidebar-data.ts` | 推广菜单项 + `promotionEnabled` 开关联动 |
| `web/src/components/compact-date-time-range-picker.tsx` | 自 usage-logs 提升为共享组件，新增可选 `emptyLabel`（上游新页面如用相对路径引用旧位置，合并时需改回 `@/components/...`——审计页已踩过一次） |
| `web/src/components/confetti-cannons.tsx` / `floating-mascot.tsx` | 新增共享动效组件 |
| `web/src/features/promotion/`、`web/src/routes/_authenticated/promotion/` | 推广活动页 |
| `model/user.go` | 默认侧边栏配置 `personal.promotion: true` |

---

## 与上游同步（merge）注意事项

1. **敏感文件**（我们改过、上游也常改，合并后必查）：
   - `relay/channel/task/jsplugin/adaptor.go`、`relaykit/dto/openai_video.go`（视频直链逻辑）
   - `model/topup.go`、`controller/topup*.go`（赠送/佣金结算，上游若改结算结构需人工核对快照字段仍生效）
   - `web/src/hooks/use-sidebar-data.ts`、`use-sidebar-config.ts`（上游常加菜单项）
   - `web/src/i18n/locales/*.json`（合并策略：取上游版 → 脚本回填我们的键 → `bun run i18n:sync`）
   - `controller/misc.go`（status 下发字段）
2. **工厂插件（`plugins/tasks/*/plugin.js`）不改**：视频直链等定制一律在宿主 Go 层做，避免与上游插件更新冲突（wan3.0 等上游新模型直接吃上游更新）。
3. **locale 只能通过脚本写**：`web/scripts/` 下临时脚本 + `bun run i18n:sync`，键为英文源串，7 语言文件必须同步。
4. **合并后必做验证**：`go build ./...`；`go test ./model/ ./relay/... ./plugins/ ./controller/ ./service/`；`cd relaykit && GOWORK=off go build ./...`；前端 `bunx tsc --noEmit` + `bun run build`（tsc 有缓存，rspack 构建才能暴露相对路径断裂类问题）。
5. **数据库**：schema 变更仅在真实 SQLite 上验证（用户约定）；上游合入含迁移改动时，启动前备份 SQLite 库文件。

---

## 提交索引（分叉基点 49ec46966 之后）

| 提交 | 内容 |
|------|------|
| `6612da51` | 视频URL恢复(v1) / 推广分成+活动页(v1) / 充值赠送 |
| `a9c08252` | 兑换码兑换时间区间筛选 |
| `0edf297e` | 兑换码时间筛选改区间选择器 |
| `99772e01` | 侧边栏默认模块表补 promotion（修菜单不显示） |
| `721ab881` | 推广活动页升级：动效礼炮/卡通脸/筛选/明细/侧边小卡 |
| `3a58732b` | 修推广页响应体拆包 TypeError |
| `1b39aa4c` | 推广菜单跟随开关 / 活动暂停横幅 / 吉祥物独立卡 / 复制按钮去重图标 |
| `47eee7e8` | 兑换码时间与状态解耦 |
| `ffd4c30b` | 时间范围默认不筛选（撤销默认当天） |
| `eb687cc4` | 时间选择器标签改为"兑换时间范围" |
| `d9697770` | 视频查询优先返回上游 mp4 直链（重做任务1） |
| `78fdeee51` | 合并上游 main（19 提交，含审计日志/安全中心/wan3.0/模型管理重构） |
| `74bf18295` | 合并上游 v1.0.0-rc.36（26 提交）。关键冲突：`adaptor.go` 上游把视频渲染改为 map 化并保留 provider 字段，我方仅保留成功任务时宿主注入 mp4 直链（覆盖插件输出）；`model/topup.go` 保留 Stripe 充值后推广分成入账；`model/user.go` 侧边栏 personal 组保留 `promotion`；兑换码表格采纳上游 `createServerError` 但保留含时间筛选的 `isSearching` 条件 |
