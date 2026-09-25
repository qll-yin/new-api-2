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
| 6 | 公告弹窗提醒（未读公告自动弹出） | ✅ | `72782a1ee`、`d9834b590` |
| 7 | 推广分成管理员视图（全员明细+筛选） | ✅ | `6ac00e511` |
| 8 | 默认首页双主题（经典/7Code）+ 首页彩蛋 | ✅ | `4ba4328bf` |
| 9 | 首页顶部活动通知栏 + 顶部导航自定义链接（角标/背景色） | ✅ | `bdda11d3a`、`42d963258`、`014aec7de` |
| 10 | SEO/GEO 基础整改 + llms.txt | ✅ | `47f0e1639`、`8c194bdb6`、`33a9b7325` |
| 11 | 子用户管理（虚拟用户=令牌打标，含分组管理） | ✅ | 见提交索引 |

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
| `web/src/components/announcement-popup.tsx` | 公告弹窗（纯前端，挂载于 `AuthenticatedLayout`） |
| `web/src/hooks/use-notifications.ts` | 导出 `getAnnouncementKey`、新增 `unreadAnnouncementItems`（弹窗消费） |
| `web/src/features/promotion/`、`web/src/routes/_authenticated/promotion/` | 推广活动页 + 管理员明细页（`records.tsx`） |
| `model/user.go` | 默认侧边栏配置 `personal.promotion: true` |

---

## 6. 公告弹窗提醒

### 需求
消息中心在右上角不够显眼，希望已登录用户进入后台时，有未读公告就直接弹出消息框（新模型上线等公告能第一时间触达），且弹窗动效强、可多条公告间切换。

### 行为口径
- **弹出条件**：数据加载完成 && 未读总数 > 0 && 非当日"今日不再提醒" && 本次进入后台未弹过（刷新页面重新判断）。未读 = 未读 Notice 计 1 + 每条未读 Announcement 计 1。
- **"我知道了"**：把弹窗展示的全部未读项标记已读（`notification-store`，localStorage 持久化）→ 下次不再弹、红点消失。
- **"今日不再提醒"**：写 `closedUntilDate`（当天不再自动弹）但**不标已读**（红点保留）。该字段为 store 原生既有能力的首次接线。
- 关闭弹窗（Esc / 点遮罩）不标已读，本次会话不再弹。
- **纯前端实现，零后端改动**（公告已读状态本就存前端 localStorage）。

### 实现
- `web/src/components/announcement-popup.tsx`：面板三段式 flex 布局（头部/底部 `shrink-0`，正文 `min-h-0 flex-1` 原生 `overflow-y-auto`），限高 `min(92vh, 56rem)`、宽 `max-w-3xl`——长公告可滚动、按钮永不遮挡（`d9834b590` 修复 ScrollArea 视口不滚动 + 溢出盖按钮的问题）。
- 动效：面板 spring 缩放+模糊入场、公告间带方向的左右滑动切换（`AnimatePresence mode='wait'`）、脉冲喇叭、未读公告含 `success` 类型时自动放一发彩纸礼炮；全部尊重 `prefers-reduced-motion`；支持 ←/→/Esc 键盘操作。
- 复用：`useNotifications()`（React Query 去重，零额外请求）、`RichContent` 渲染 markdown、`getAnnouncementColorClass` 类型色点、`ConfettiCannons`。
- i18n：`New Announcement` / `{{count}} unread announcements` / `Don't remind me today` / `I understand` 等 key 已同步 7 语言文件。

---

## 7. 推广分成管理员视图

### 需求
管理员查看**全部用户**的推广分成明细，支持按推广人筛选（独立"推广管理"菜单项，仅管理员可见）。

### 后端
- `GET /api/user/promotion/records`（`adminRoute` + `middleware.AdminAuth()`）：全站分成流水分页 + 汇总（全站累计佣金 / 总笔数 / 当前筛选期合计，`summary` 字段）。
- 筛选参数：`username`（**推广人**，纯数字按 `inviter_id` 精确、否则用户名前缀子查询）、`keyword`（下级，同用户端口径）、`start_timestamp` / `end_timestamp`。
- `model/promotion_commission.go`：`inviterId <= 0` 语义为"不限上级"（管理员视图）；`PromotionRecordFilter` 新增 `Username`；`fillInviteeNames` 泛化为 `fillUserNames`（一次查询同时回填上级/下级用户名）；`PromotionCommission` 新增 `InviterName`（`gorm:"-"` 展示字段，**无 schema 变更**）。
- 测试：`model/topup_test.go` `TestPromotionAdminRecords`（全员查询 / 上级筛选两形态 / 汇总口径）。

### 前端
- `web/src/routes/_authenticated/promotion/records.tsx`：`beforeLoad` 角色守卫（非管理员跳 403）+ zod `validateSearch`（`page`/`pageSize`/`username`/`keyword`/时间戳，筛选同步 URL）。
- `web/src/features/promotion/admin-records.tsx`：汇总卡 + 推广人/下级/时间三重筛选 + 明细表（推广人、下级、订单号带复制、充值金额、佣金、时间），分页沿用推广页同款。
- 侧边栏 Admin 组 "Users" 下新增"推广管理"（`Megaphone` 图标），**受 `promotion_commission_enabled` 开关控制**（关闭时隐藏，同用户端菜单口径）。

---

## 8. 默认首页双主题（经典 / 7Code）+ 首页彩蛋

### 需求
默认首页（管理员未配置自定义内容时）不再只有原版一套：后台可选"经典"或"7Code"两套主题；另加首页彩蛋——用户在首页连续快速点击 5 次后弹窗提示并新标签页打开后台配置的 URL（留空关闭）。

### 行为口径
- 优先级不变：管理员配置了 `HomePageContent`（URL/HTML/Markdown）→ 按配置渲染；**未配置** → 按 `HomePageTheme` 渲染 classic / 7code。
- 7code 主题渲染在 `PublicLayout` 内：顶栏（消息通知/语言切换/登录）与页脚用站内的，7code 原版 Navbar/Footer 不搬。
- 7code 主题跟随站内明暗模式（暗色 = 原版近黑宝蓝，亮色 = 同布局浅色版）与 7 语言切换。
- 彩蛋：2.5s 窗口内点击 5 次（链接/按钮等交互元素上的点击不计数）→ 弹窗 → 1.2s 后 `window.open(url, '_blank', 'noopener')`；弹窗被浏览器拦截时降级为"立即前往"按钮；点击遮罩取消。**classic 与 7code 都生效**。

### 后端（无 schema 变更）
- `model/option.go`：注册 `HomePageTheme`（默认 `classic`，合法值 `classic`/`7code`）与 `HomePageEasterEggUrl`（默认空）。走通用 option 持久化。
- `controller/misc.go`：`/api/status` 下发 `home_page_theme`、`home_page_easter_egg_url`（公开字段，游客可读）。

### 前端
- 新目录 `web/src/features/home/homepage/`：7code 主题全套。
  - **配置层（手动改这几个文件即可）**：`site.ts`（链接/视频地址/base_url 展示）、`data.ts`（画廊条目/统计/定价卡/FAQ 结构）、`models.json`（跑马灯模型列表，图标名映射在 `brand-icons.tsx`）。
  - 区块：`sections/`（hero 打字机+终端演示、brand-marquee 模型跑马灯、flow-gallery 作品画廊、capabilities 四大能力、stats-band 数字滚动、pricing 定价、faq）；动效库 `lib/`（AuroraBackground 粒子、Terminal、TiltCard、Reveal）。
  - `homepage.css`：`.hp-theme` 作用域变量（亮色默认 + `.dark-theme` 暗色），特效类 `hp-glass/hp-shine/hp-glow-border` 等；keyframes 带 `hp-` 前缀避免与上游冲突。
  - 站内链接走 TanStack Router `<Link>` SPA 跳转（`lib/link.ts` 的 `configLinkProps`：相对路径 → Link，完整 URL → 新标签 a 标签）。
  - i18n：homepage 独立命名空间（`useTranslation('homepage')`），7 语言文件根级 `"homepage"` 字典各 87 keys；`sync-i18n.mjs` 只扫 `translation`，homepage 字典需手工保持 7 语言同构。
- `web/src/features/home/index.tsx`：默认分支按 `config.homePageTheme` 二选一；`<HomeEasterEgg />` 挂在两套主题之外（PublicLayout 内）。
- 状态链路：`system-config-store.ts`（+`homePageTheme`/`homePageEasterEggUrl`）← `status-query.ts` map（+`home_page_theme`/`home_page_easter_egg_url`）。
- 后台设置：站点设置 → 系统信息（`system-info-section.tsx`）新增"默认首页主题"下拉（Classic/7Code）与"首页彩蛋链接"输入框（URL 校验、可空）。
- 资源：`web/public/images/homepage/`（画廊 11 张 WebP，原图 16MB → 1.3MB）、`web/public/videos/homepage/video-1.mp4`（2.8MB，能力卡悬停播放；`site.ts` 的 `videos.demoUrl` 可改为外链）。
- 旧 classic 首页组件（`web/src/features/home/components/`）**保留未动**，仅不再默认渲染。

## 9. 首页顶部活动通知栏

### 需求
首页最顶部一条高 35px 的滚动通知栏，用于活动期展示。**独立于系统公告/公告弹窗**，后台单独开关 + 内容配置。

### 行为口径
- 通知栏 `fixed` 固定在视口最顶部（z-60，压过公共头部 z-50），开启时公共头部整体下移 35px（`top-[35px]`）、移动端全屏抽屉顶部内边距加到 115px、首页主题内容前置 35px 占位。
- 仅在首页路径 `/` 展示（含管理员配置了自定义首页内容的情况）；经典与 7code 主题都生效。
- 内容**每行一条**，多条以分隔符相连成一条无缝跑马灯（两份拷贝 + translateX(-50%)，与首页模型跑马灯同款手法）；滚动时长随内容长度自适应（12s–60s）；`prefers-reduced-motion` 停止滚动。
- 内容为纯文本渲染（React 转义），无 XSS 面。

### 后端（无 schema 变更）
- `setting/console_setting/config.go`：`TopNoticeBarEnabled`（默认 false）/ `TopNoticeBarText`（默认空）。
- `setting/console_setting/validation.go`：`ValidateConsoleSettings` 增加 `TopNoticeBarText` 用例（≤2000 字符）。
- `controller/option.go`：保存时校验 `console_setting.top_notice_bar_text`；`controller/misc.go`：`/api/status` 下发 `top_notice_bar_enabled` / `top_notice_bar_text`。

### 前端
- 组件 `web/src/components/layout/components/top-notice-bar.tsx`，由 `PublicHeader` 统一渲染（自己算可见性：`pathname === '/' && enabled && text 非空`），动画 keyframes 在 `web/src/styles/index.css`（`.top-notice-marquee*`）。
- 首页占位：`web/src/features/home/index.tsx` 在主题分支前渲染 `h-[35px]` 占位（自定义内容分支不占位，通知栏覆盖其顶部，与 fixed 头部行为一致）。
- 状态链路：`status-query.ts` / `system-config-store.ts` 新增 `topNoticeBarEnabled` / `topNoticeBarText`；`use-update-option.ts` 的 `STATUS_RELATED_KEYS` 收录两个 key（保存后失效 status 缓存）。
- 后台设置：站点与品牌 → 新分区「顶部通知栏」（`maintenance/top-notice-bar-section.tsx`：开关 + 多行 Textarea）。

## 10. 顶部导航自定义链接（含角标 tag 与角标背景色）

### 需求
在"站点与品牌 → 顶部导航"分区内新增自定义导航：管理员可添加多条（名称 + URL + 可选角标 tag），例如跳转自己开发的画布应用；tag 在导航文字右上角显示发光圆角徽标（如 NEW / 最新）。**角标背景色可单独配置（hex，如 `#2b2b2b`）**，不配置时用主题色。

### 行为口径
- 追加在内置导航（Home/Console/模型广场/排行榜/文档/关于）之后，最多 10 条。
- URL 以 `/` 开头按站内路由用 `<Link>` 打开，其余按外链 `<a target='_blank' rel='noopener noreferrer'>`；tag≤10 字符、名称≤30 字符、URL≤500 字符，`javascript:` 等危险内容被后端校验拦截。
- 角标样式：primary 底色圆角小徽标 + `animate-pulse` + primary 色辉光阴影，desktop（文字右侧 -top-1.5 -right-3）与 mobile 抽屉（文字右上 left-full）各自定位。
- 角标背景色：`tag_color` 支持 `#RGB` / `#RRGGBB`（后端正则 + 前端 zod 双重校验，非法值直接拒绝保存）；配了自定义色时辉光阴影同色，文字颜色按相对亮度自动选黑/白以保证可读性；留空/清空则回到主题色。该字段只在有 tag 时才写入。
- 已登录用户与游客同样可见（公共头部导航）。

### 后端（无 schema 变更）
- `setting/console_setting/config.go`：`CustomNavLinks`（JSON 数组字符串，默认空）。
- `setting/console_setting/validation.go`：`CustomNavLink` 结构体（`title`/`url`/`tag`/`tag_color`）+ `hexColorRegex` + `validateCustomNavLinks`（≤10 条、字段长度、URL 正则或 `/` 前缀、tag_color hex 校验、危险内容）+ `GetCustomNavLinks()`（去空白、跳过空条目）。
- `setting/console_setting/validation_test.go`：`TestValidateCustomNavLinksTagColor`（合法 `#2b2b2b`/`#abc`/带空格、非法 `red`/`#12345`/`#gggggg`/CSS 注入串）。
- `controller/option.go`：保存时校验 `console_setting.custom_nav_links`；`controller/misc.go`：`/api/status` 下发 `custom_nav_links`（解析后的数组）。

### 前端
- `system-config-store.ts`：`CustomNavConfigLink` 类型（`tag_color` 与后端 JSON 同名）+ `parseCustomNavLinks`（status 链路共用，非法颜色丢弃）；`use-top-nav-links.ts` 合并自定义导航进返回数组（`TopNavLink` 增加 `tag?` 与 `tagColor?`，`components/layout/types.ts` 的同名类型需同步——**两份 TopNavLink 定义必须一起改**）。
- `public-header.tsx`：desktop/mobile 四处渲染 `navTag(tag, color?, position?)` 角标（外层改 flex、截断移到内层 span，避免 overflow 裁掉角标；自定义色走 inline style）。
- 后台设置：`maintenance/custom-nav-links-section.tsx`（表格 + 弹窗编辑器），内嵌在「顶部导航」分区（`site/section-registry.tsx` 组合渲染），保存 key 为 `console_setting.custom_nav_links`；编辑器含「角标背景色（可选）」hex 输入，表格用色块预览已配置颜色。
- i18n：本功能累计新增 24 个 flat key ×7 语言（`homepage` 嵌套命名空间不受影响）。

## 11. SEO 第一阶段基础整改

### 需求
推广前补齐搜索引擎基础：meta/分享卡、canonical、robots/sitemap、每页独立标题、html lang 同步。**主推海外，静态 SEO 文案全英文**（title/description/keywords/OG/Twitter 均 en，`html lang="en"`；运行时界面切语言仍会同步 `<html lang>`）。对外主域名 `https://ai.7code.cc`（集中在 `web/src/lib/constants.ts` 的 `SITE_URL`，域名变更需同步 index.html / robots.txt / sitemap.xml 三处静态文件）。

### 实现（纯前端，无后端改动）
- `web/index.html`：英文 description/keywords、OG + Twitter 分享卡（og:image 暂用 /logo.png，后续可换 1200×630 专用图；`og:locale=en_US` + `alternate zh_CN`）、`<link rel="canonical">`。运行时 `initSystemBranding()` 仍会把 title/meta[name=title] 覆盖为后台系统名。
- `web/public/robots.txt` + `sitemap.xml`：embed 后由后端 `static.Serve` 伺服；Disallow `/dashboard`、`/system-settings`、`/wallet`、`/api/`；sitemap 含 `/`、`/pricing`、`/rankings`、`/about`。
- `web/src/hooks/use-document-title.ts`：公开内容页（Pricing/Rankings/About 已接）设 `「页面名 · 系统名」` 标题 + 按路径更新 canonical，卸载还原；页面标题文案走 t()，随界面语言变化。
- `web/src/i18n/config.ts`：初始化与 `languageChanged` 时把 `document.documentElement.lang` 同步为 BCP-47 标签（经 `toIntlLocale`）。
- 遗留（第二阶段再做）：JSON-LD 结构化数据、FAQ 富摘要、brotli、预渲染/SSG。

## 12. GEO：llms.txt / llms-full.txt（面向 AI 助手的站点说明）

### 需求
推广渠道里 AI 助手/Agent 占比越来越高，需要一个机器可读、能体现平台特性的入口，让模型在回答「7Code AI 是什么 / 有哪些模型 / 怎么调用 / 怎么计费」时能拿到准确事实，而不是猜。

### 实现（纯静态文件，随 `web/dist` embed 由后端 `static.Serve` 伺服）
- `web/public/llms.txt`：符合 [llmstxt.org](https://llmstxt.org) 规范的索引版——H1 + 摘要 blockquote + 分节链接列表（核心页面 / 公共 JSON 端点 / API 端点 / 详版文档 / Optional）。含三个 base URL、鉴权头形态、以及「模型清单与价格以 `/api/pricing` 为准」的指引。
- `web/public/llms-full.txt`：详版长文（15 节）——定位与工作原理、平台特性（单 key 三协议 / 多渠道路由与故障转移 / 用量计费与表达式定价 / 多模态与异步任务 / 可审计 / 多语言后台）、完整协议与端点表、鉴权、可复制 curl 快速开始（含流式、Messages、Gemini、图像、异步视频轮询）、计费与额度规则、账号与充值/推广、可靠性与限流、前台/后台功能、自托管部署矩阵、安全姿态、机器可读端点表、FAQ、开源署名与许可、链接。
- `web/index.html`：`<head>` 增加两个 `<link rel="alternate" type="text/markdown">` 指向两个文件，便于抓取方发现（canonical 之后）。

### 文案事实来源（改动时照此核对，勿凭空写数字）
- 端点：`router/relay-router.go`、`router/video-router.go`、`router/task-router.go`、`router/api-router.go`（公共 JSON 端点与 `HeaderNavModuleAuth` 的公开/需登录语义）。
- 鉴权头：`middleware/auth.go`（`Authorization: Bearer`、`x-api-key`、`x-goog-api-key`、`?key=`）。
- 模型字段与计费维度：`model/pricing.go` 的 `Pricing` 结构（ratio / fixed price / `billing_expr` / cache / image / audio 比例 / `supported_endpoint_types`）。
- 额度换算：`common/constants.go` 的 `QuotaPerUnit = 500 * 1000`（500,000 额度 = 1 美元，ratio 1 ≈ $0.002 / 1K tokens）。
- 部署矩阵（SQLite / MySQL ≥ 5.7.8 / PostgreSQL ≥ 9.6 / 独立日志库含 ClickHouse / Redis / amd64+arm64 / Electron）：`README.en.md`。
- 语言数量与代码：`web/src/i18n/locales/*.json`（en、zh、zh-TW、fr、ru、ja、vi）。
- **避免写死的数字**：模型数量、具体价格、上下线厂商一律不写死，统一指向 `GET /api/pricing`（活配置生成）。

### 维护约定
- 新增协议端点、新增计费维度、或调整公开模块策略时，同步更新 `llms-full.txt` 第 3 节（协议与端点）/ 第 6 节（计费）/ 第 12 节（机器可读端点）。
- 域名变更除 `index.html` / `robots.txt` / `sitemap.xml` 外，还需同步 `llms.txt` 与 `llms-full.txt`（两文件内 URL 为绝对地址）。
- 两文件为英文（主推海外，与 `html lang="en"`、静态 SEO 文案一致）。


## 13. 子用户管理（虚拟用户 = 令牌打标）

### 需求
企业用户要给员工每人一个"账号"来管理与观察用量：普通用户可在「子用户管理」创建虚拟子用户（用户名称、令牌分组、额度（无限或固定）、过期时间、高级设置（auto 分组编辑/模型限制/IP 白名单）、备注），并把令牌直接复制给员工调用，员工无需注册。子用户与令牌强绑定：停用/删除子用户即停用/删除令牌，反之亦然。子用户绑定的令牌在「API 密钥」列表隐藏，避免与自己常用密钥混淆。子用户可归入自建分组（建组/重命名/删除）。

### 设计（关键决策）
**虚拟子用户 = `is_sub_user=true` 的令牌（同一行数据）**，不建第二套实体、不建真实用户。停用/删除/状态（过期/耗尽）全部天然双向一致；消费日志以令牌名（=子用户名，如"张三"）呈现，用户在「使用日志」页自行按令牌名筛选即可查看员工用量（**不做日志页跳转/改动**，用户明确要求）。

### 后端
- `model/token.go`：`Token` 新增 `IsSubUser bool`（裸 bool，无 default tag，跟随 UnlimitedQuota 模式）、`SubNote string(text)`、`SubGroupId int(default:0,index)`；`GetAllUserTokens` 改名 `GetUserApiTokens` 并排除子用户令牌（keys 列表与总数 `CountUserApiTokens` 同步排除）；`SearchUserTokens` 排除子用户；`CountUserTokens` 保持**包含**子用户（上限校验用，防绕过 MaxUserTokens）。
- `model/sub_user.go`（新）：`SubUserGroup` 模型（user_id/name/created_time）；分组 CRUD（同名唯一在模型层校验、删除分组事务内把成员 `sub_group_id` 归 0）；`GetUserSubUsers/CountUserSubUsers/SearchUserSubUsers`（含 keyword LIKE 复用 sanitizeLikePattern、subGroupId 过滤）；`GetSubUserById`（带 `is_sub_user=true` 条件，普通令牌无法经子用户接口操作）；`SubUserNameExists`（同 owner 唯一）；`(*Token).UpdateSubUserFields`（**独立 Select 白名单**：name/group/quota/expired/model_limits/allow_ips/cross_group_retry/auto_groups/sub_note/sub_group_id，不动 `Token.Update()` 白名单以免影响普通令牌编辑路径）。
- `controller/sub_user.go`（新）：`GET/POST/PUT /api/sub_user/`、`GET /api/sub_user/search`、`DELETE /api/sub_user/:id`、分组 `GET /api/sub_user/groups`、`POST/PUT /api/sub_user/group`、`DELETE /api/sub_user/group/:id`。创建校验完全对齐 AddToken（名称≤50、额度上限 maxTokenQuota、auto 走 setTokenAutoGroups+IsUserSelectableGroup、数量上限）；创建响应**一次性返回明文 key**（之后列表只显示掩码，揭示复用 `POST /api/token/:id/key`，有限流+审计）；状态切换走 `SelectUpdate`（Redis 缓存即时失效），沿用"过期/耗尽不可重新启用"拦截。
- `router/api-router.go`：`/api/sub_user` 组挂 `UserAuth()` + `TokenOperationAudit()`；`middleware/audit.go` 审计动作新增 `sub_user.create/update/status_update/delete/group_*`。
- `model/main.go`：`AutoMigrate` 注册 `&SubUserGroup{}`。
- 计费边界：子用户额度是令牌级独立额度（与钱包解耦，与现有令牌语义一致），不触碰任何计费计算路径；额度上限复用 `maxTokenQuota()`，未新造转换。

### 前端
- `web/src/features/sub-users/`（新）：Provider 照抄 api-keys-provider（去掉批量/CC-Switch/聊天预设）；创建/编辑抽屉**完整迁移 keys 的 ApiKeysMutateDrawer**（令牌分组 Combobox 含 auto 特效、AutoGroupOrderEditor、cross_group_retry、过期快捷键、额度美元输入、高级设置模型限制/IP 白名单），另加「子用户分组」NativeSelect（未分组=0）与「备注」；无批量创建（子用户是人，一人一条）。列表列：名称/状态/令牌/额度/分组/子用户分组/备注/模型/IP/时间/过期/操作。行操作：启用停用、编辑、复制令牌、删除（危险确认，注明员工调用立即失效）。分组管理弹窗：建组/重命名/删除（ConfirmDialog，显示每组人数）。
- **跨 feature 复用**：`ApiKeyGroupCombobox`、`AutoGroupOrderEditor`、`ApiKeyGroupCell`、`ApiKeyQuotaCell`、`ApiKeyActivityCell/TimestampCell`、`ModelLimitsCell/IpRestrictionsCell`、状态常量直接从 `@/features/keys/*` 导入（`SubUser` 类型是 `ApiKey` 的 zod extend 超集，结构化兼容）；仅 Provider 耦合的 `ApiKeyCell` 复制为 `sub-user-key-cell.tsx`。
- 菜单：`use-sidebar-data.ts` general 组「Task Logs」之后加「Sub Users」（UsersRound）；4 处模块表同步（`use-sidebar-config.ts` DEFAULT+URL 映射、maintenance `config.ts`、`sidebar-modules-section.tsx` 元数据、profile `sidebar-modules-card.tsx`，模块 key=`sub_user`）。
- i18n：+33 flat key ×7 语言（走脚本 + `bun run i18n:sync`）。
- 测试：`model/sub_user_test.go`（分组 CRUD/唯一/删除迁移成员、查询过滤、UpdateSubUserFields 不碰状态）；`features/sub-users/lib/__tests__/sub-user-form.test.ts`（schema 校验 + 双向转换 6 用例）。

### 验证记录
- `go build ./...`；`go test ./model/ ./controller/` 全过（controller 223s）。
- `cd web && bun run typecheck`、`bun run build`、`oxlint`（新增文件 0 警告 0 错误）、`bun run test src/features/sub-users` 6/6 过、`bun run i18n:sync` 0 缺失 0 多余。
- **SQLite 迁移实测**：临时目录启动两次（fresh DB）——首启建出 `sub_user_groups` 表与 `tokens.is_sub_user/sub_note/sub_group_id` 列（python sqlite3 核对），二启零错误、无重复 ALTER（幂等）；`/api/sub_user/` 未登录返回 401（路由已注册）。
- 已知取舍：改名后历史消费日志保留旧令牌名（日志存名称快照；Log.TokenId 仍精确关联）——编辑抽屉内有说明文案。

---

## 与上游同步（merge）注意事项

1. **敏感文件**（我们改过、上游也常改，合并后必查）：
   - `relay/channel/task/jsplugin/adaptor.go`、`relaykit/dto/openai_video.go`（视频直链逻辑）
   - `model/topup.go`、`controller/topup*.go`（赠送/佣金结算，上游若改结算结构需人工核对快照字段仍生效）
   - `web/src/hooks/use-sidebar-data.ts`、`use-sidebar-config.ts`（上游常加菜单项）
   - `web/src/hooks/use-notifications.ts`、`web/src/components/layout/components/authenticated-layout.tsx`（上游若重写消息中心/布局，需核对 `getAnnouncementKey` 导出与弹窗挂载点）
   - `router/api-router.go`（上游也常改路由表，核对 adminRoute 下 `/promotion/records` 仍在）
   - `web/src/i18n/locales/*.json`（合并策略：取上游版 → 脚本回填我们的键 → `bun run i18n:sync`；注意 `homepage` 命名空间是我们整块新增，冲突时整体保留我方）
   - `controller/misc.go`（status 下发字段：`home_page_theme` / `home_page_easter_egg_url`、`top_notice_bar_*` / `custom_nav_links` 与上游新字段共存即可；上游也常改此文件）
   - `setting/console_setting/`、`controller/option.go`（通知栏/自定义导航三个配置的校验用例，上游若改 `ValidateConsoleSettings` 分发结构需人工合并）
   - `web/src/hooks/use-top-nav-links.ts`、`web/src/components/layout/components/public-header.tsx`（自定义导航合并、角标渲染与通知栏头部偏移；上游若重构公共头部需保留 `navTag` / `TopNoticeBar` 挂载）
   - `web/src/features/home/index.tsx`（上游若改默认首页结构，需保留 classic/7code 分支与彩蛋挂载）
   - `web/src/stores/system-config-store.ts`、`web/src/lib/status-query.ts`（上游加 status 字段时保留我方两字段映射）
   - `web/src/features/system-settings/general/system-info-section.tsx`（上游若改站点设置表单，需回填主题下拉与彩蛋 URL 两字段）
   - `web/index.html`、`web/public/{robots.txt,sitemap.xml,llms.txt,llms-full.txt}`（上游极少改动这两个文件；合并时保留我方 SEO/GEO 文案与 canonical/OG/llms 链接，favicon 与 og:image 已改指 `img.7code.cc`）
   - `relay/channel/task/jsplugin/adaptor.go`（rc.39/rc.40 起上游改为 `applyUpstreamCredentials` + 可变参数 `applyCompletionUsageFacts` + `pluginruntime.ParseFileReference` + 渠道多插件绑定 `ChannelTypeNewAPI`；我方视频直链注入在 `ConvertToOpenAIVideo`，只依赖 `task.Data`，与这些重构不重叠）
   - `model/task.go`、`service/task_polling.go`（上游新增 `ResultDiscarded`/`ResultRetrievable` 与列表接口 `Omit("data")`；**必须确认 `GetByTaskId` 仍未 `Omit("data")`**，否则视频直链提取会退化为站内 /content 代理地址）
   - `web/src/features/system-settings/general/quota-settings-section.tsx`（上游删 `PreConsumedQuota`、加 `quota_setting.trust_quota_usd` / `pre_consume_multiplier`，我方在同一 schema 与表单里加推广分成两项，合并取并集）
2. **工厂插件（`plugins/tasks/*/plugin.js`）不改**：视频直链等定制一律在宿主 Go 层做，避免与上游插件更新冲突（wan3.0 等上游新模型直接吃上游更新）。
3. **locale 只能通过脚本写**：`web/scripts/` 下临时脚本 + `bun run i18n:sync`，键为英文源串，7 语言文件必须同步。
   - 合并时语言文件必冲突，按「冲突块内并集」解：块内先我方后上游、仅在同一冲突块内部按整行文本去重。**不要跨块按同名键去重**——语言文件是 `{translation, homepage}` 双命名空间，顶层键与 `homepage` 内键同名同缩进（如 `Models`），跨块去重会误删 homepage 的键并导致 TS 报「Property 'Models' does not exist」。
4. **上游新增测试的 fixture 要补我方字段**：`web/src/features/system-settings/general/__tests__/pre-consume-settings.test.tsx` 构造 `QuotaSettingsSection` 的 props 时需带 `PromotionCommissionEnabled: false` / `PromotionCommissionRate: 0`，否则 `bun run typecheck` 报缺属性（上游每次改这个测试都要顺手补）。
5. **合并后必做验证**：`go build ./...`；`go test ./model/ ./relay/... ./plugins/ ./controller/ ./service/`；`cd relaykit && GOWORK=off go build ./...`；前端 `bun run typecheck` + `bun run build`（构建才能暴露相对路径断裂类问题）。
6. **数据库**：schema 变更仅在真实 SQLite 上验证（用户约定）；上游合入含迁移改动时，启动前备份 SQLite 库文件。

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
| `72782a1ee` | 公告弹窗提醒（弹窗组件 + 挂载 + useNotifications 扩展 + i18n 7 语言） |
| `6ac00e511` | 推广分成管理员视图（全员明细 API /promotion/records 页面/菜单/测试；顺带修复 promotion/index.tsx 既有类型错误与 mobile-filter 测试导入路径） |
| `d9834b590` | 公告弹窗修复：长内容滚动 + 按钮遮挡，整体加大宽高 |
| `9e420be3c` | docs: SECONDARY-DEV 补录公告弹窗与推广分成管理员视图 |
| `2f18e6dec` | 合并上游 main（65 提交，冲突仅 7 个 i18n locale，两边 key 并集解决） |
| `4ba4328bf` | 7Code 默认首页主题（7 语言 homepage 命名空间/WebP 画廊/双模式）+ 首页彩蛋（HomePageTheme/HomePageEasterEggUrl 后台可配置） |
| `899f50519` | docs: SECONDARY-DEV 补录默认首页双主题与首页彩蛋 |
| `75241af63` | 7Code 主题浅色适配修复（语义变量）+ 跑马灯防复读 + 补页脚 + 彩蛋调优（6s 延迟/弹窗加大） |
| `67f474f21` | 7Code 主题页脚改用主题自带样式（site-footer.tsx，保留 New API 署名行） |
| `8f52c16dc` | （用户自改）移除部分 footer 内容 |
| `dc773bf0a` | 合并上游 main v1.0.0-rc.38（9 提交，零冲突；GitHub OAuth 旧绑定登录名用户需重新验证） |
| `bdda11d3a` | 首页顶部活动通知栏（35px 跑马灯）+ 顶部导航自定义链接与发光角标（console_setting 三配置，后台可开关） |
| `42d963258` | 修通知栏：文案较短时电脑端铺不满容器，按容器宽度自适应拷贝份数 |
| `47f0e1639` | SEO 第一阶段：双语 meta/OG/Twitter 卡、canonical、robots/sitemap、每页独立标题、html lang 同步 |
| `8c194bdb6` | SEO 文案改英文主推海外（title/description/OG/Twitter 全 en，`html lang="en"`） |
| `33a9b7325` | GEO 阶段：llms.txt（索引版）+ llms-full.txt（15 节详版）+ index.html 发现链接 |
| `67ef986e5` | GEO 文档校正（去掉不存在的后台 SEO 设置项；计费改为预授权+结算+失败退款表述） |
| `cad392ce0` | 合并上游 main v1.0.0-rc.39 / v1.0.0-rc.40（44 提交）。冲突 9 个文件：index.html 取我方（上游仅删 favicon 行）、system-info-section.tsx 并集、7 个 locale 冲突块内并集、上游新测试 pre-consume-settings.test.tsx fixture 补我方两字段。上游同轮重构 task 插件 adaptor（认证/usage 参数/多插件绑定）与预扣费语义（PreConsumedQuota → quota_setting.pre_consume_multiplier），我方视频直链注入与推广分成链路不受影响 |
| `014aec7de` | 自定义导航角标支持背景色（`tag_color` hex，后端正则+前端 zod 校验；渲染按亮度自动选黑/白文字）+ 校验单测 |
| `efafe3e45` | 子用户管理后端：Token 加 is_sub_user/sub_note/sub_group_id 三列 + SubUserGroup 表 + /api/sub_user 自服务 API（keys 列表隐藏子用户令牌，上限含子用户） |
| `68e26dc8d` | 子用户管理前端：/sub-users 页面（全功能抽屉/分组管理/一次性 key 弹层）、菜单与 4 处模块表、i18n ×7、表单转换测试 |
