# 库存管理系统 第二轮系统测试报告（2026-11-04）

> **📌 修复状态（最终）**：除按主人指示跳过的 S-H1（JWT 密钥轮换）/S-H2（MySQL 口令/端口）及运维项 S-L8 外，**其余全部修复**：
> 安全 H3/H4/M1-M11、回归 R-B1/B2/C1-C10/D1-D4、前端 F-A1-A4/B1-B5。
> **最终验证**：105 个服务端模块冒烟 0 失败；npm run build 通过；typecheck 423→**420**（改动行零新增，顺带消除存量）；
> npm audit 40→**26**（生产运行时漏洞**清零**，剩余全部为 dev 工具链：vitest 链需 5.x 大版本、minimatch 链被 eslint 8 锁定需 eslint 9、esbuild 随 vite 升级）；真库只读体检零新增问题。
> **遗留提醒**：① 重启 API 服务生效（含 dotenv 顺序修复后 JWT_SECRET 才真正从 .env 读取）；② S-H1/H2 仍建议排期（密钥/口令在 git 历史里）；③ 登出黑名单/限流为内存版，多实例部署需换 Redis；④ R-D4 的"一容器多表格只接管第一个溢出容器"（无现有页面触发）与 F-B3（.main-column 裁剪超宽非表格内容）保持观察。

> 测试方式：3 路专项审计（安全隐患深审 / 修复回归复查 / 前端残留复查）+ 本体动态实测（线上探测、npm audit、真库体检、登录链路复现）。
> 带 ★ 为动态实测或人工抽验确认。本轮新发现合计 **约 40 条**（安全 21 / 回归与业务 18 / 前端 9，去重后）。
> **本轮已顺手修复 2 条必现级**（见第一节）；其余列为待修清单。

---

## 一、本轮已顺手修复的必现级（修复工程自身回归/同批高危）

| # | 问题 | 位置 | 状态 |
|---|------|------|------|
| R-A1 ★ | **删除采购订单 100% 报 500**：上轮新增守卫 SQL 查不存在的列 `warehousing_orders.source_order_number`（实库查证该列不存在）→ ER_BAD_FIELD_ERROR | purchaseOrderController.js:385-389 | ✅ 已修（守卫改按 `purchase_order_id` 精确匹配） |
| R-A2 ★ | **采购计划→生成采购订单必失败**：`PurchaseOrder.update` 缺 `plan_deductions` 数组序列化（create 有、update 漏），数组被 mysql2 写成 `'[object Object]'` → JSON 列报错 → 事务回滚 | server/models/PurchaseOrder.js:49-52 | ✅ 已补 stringify（与 DeliveryOrder 同款） |

---

## 二、安全隐患（21 条，按危害排序）

### 🔴 高危 4 条
| # | 问题 | 位置 / 实测 | 修法 |
|---|------|------------|------|
| S-H1 ★ | **JWT 签名密钥明文进 git**：deployment.md:204 写着 `JWT_SECRET=x7K9m...`，与运行中 .env 同值；同文件还有 DB 口令（:116/:200）| 立即轮换密钥+口令（旧值已在 git 历史）；清 git 历史（filter-repo/BFG）；文档改占位符 |
| S-H2 ★ | **MySQL root 弱口令 `aabbcc123!` 硬编码 + 3306 对所有网卡开放**：docker-compose.yml:9/13；database.js:10 及约 25 个迁移脚本同款回退默认值 | 强随机口令走 secrets/env_file；端口绑 127.0.0.1；业务最小权限账号；删源码回退口令 |
| S-H3 ★ | **API 泄露 bcrypt 密码哈希**：userController.js:29/51/76/119 直接返回 `SELECT *` 原始行（含 password 列）| 查询排除 password 或返回前 delete；统一 toSafeUser 序列化 |
| S-H4 ★ | **存储型 XSS → 偷 admin token**：ProductClassificationDetail.vue:29/57 `v-html` 渲染未转义的用户可控分类名（advanced 用户埋脚本，admin 打开即中招）| 弃 v-html 或先 escapeHtml；入库/渲染统一转义 |

### 🟡 中危 11 条
| # | 问题 | 位置 / 实测 |
|---|------|------------|
| S-M1 | 登录无速率限制/账户锁定，可无限爆破 | server/index.js 无任何 limiter/helmet |
| S-M2 | 默认管理员 admin/admin123 硬编码进 git | init.sql:251-257、userInit.sql、generate-password.js、update-password.js |
| S-M3 | `error.message` 直返客户端 113 处（SQL/内部错误信息泄露：表名/列名/约束名）| 各控制器 catch + auth.js:34 等 |
| S-M4 ★ | **CORS 全开** `Access-Control-Allow-Origin: *` | server/index.js:45 `app.use(cors())`（curl 实测）|
| S-M5 | 无安全响应头（helmet/X-Frame-Options/CSP/HSTS 全缺，点击劫持无防护）| server/index.js |
| S-M6 ★ | token 存 localStorage 且 **user.ts:24 把 JWT 明文 console.log 出来** | src/stores/user.ts:24-25 |
| S-M7 | Invoices.vue:409-513 `document.write` 拼接用户数据 → 打印时 DOM XSS | src/views/documents/Invoices.vue |
| S-M8 | 单价/金额/税率无负数校验（数量已校验，金额漏网 → 财务可被负数操纵）| 各 create/update 校验 |
| S-M9 ★ | **xlsx 依赖原型污染+ReDoS 且无修复版本**（0.18.5 弃维护）| package.json:22（npm audit 实测）|
| S-M10 | 角色分档不一致：normal 用户可删销售单/发票/结算单、作废核销单；删应收应付却要 admin（越权+审计断链）| salesOrderRoutes:23、invoiceRoutes:21、settlementRoutes:25、writeOffRoutes:23 等 |
| S-M11 ★ | **依赖漏洞 40 个（3 严重/11 高危/26 中危）**：生产链路含 body-parser(DoS)、proxy-addr(严重,IP 伪造)、axios、follow-redirects、qs、vue；vitest/tinypool(严重)等仅开发链 | npm audit 实测；生产依赖升级 + dev/prod 分开审计 |

### 🟢 低危 10 条
| # | 问题 |
|---|------|
| S-L1 | logout 不真正失效 token（无黑名单/版本号，旧 token 24h 内一直有效）|
| S-L2 | `jwt.verify` 未固定 `algorithms:['HS256']` |
| S-L3 ★ | **`dotenv.config()` 写在全部 import 之后（index.js:39）**——ESM import 先执行，`server/.env` 的 JWT_SECRET 实际从未被认证模块读到，在用内置 dev 回退密钥（比 S-L3 原描述更严重：.env 配了也没用）|
| S-L4 | express.json 无显式 body 上限（默认 ~100kb + body-parser 已知 DoS）|
| S-L5 ★ | `X-Powered-By: Express` 暴露框架指纹（curl 实测）|
| S-L6 | BaseModel 排序白名单 `ALLOWED_ORDER_FIELDS` 是死代码，实际靠字符过滤（能防注入但与文档说法不符）|
| S-L7 | 登出/会话、依赖审计策略等杂项（详见上轮 L7）|
| S-L8 ★ | **线上进程与源码行为不一致**：登录错误凭据返回 500 "Something went wrong!"（全局兜底文案），而工作区源码 login 实测返回标准 401（两种情况都对）→ 需确认部署/重启一致性后复测 |
| S-L9 | 全局错误处理器把一切错误映射成 500（含 body-parser 4xx），忽略 err.status，掩盖真实状态码 |
| S-L10 | 核销金额不封顶待核销余额（预收/多收属业务设计，建议确认是否需要上限/审批留痕）|

---

## 三、回归复查发现（修复批次遗留，R 组）

### 🟠 高 2 条
| # | 问题 | 位置 | 修法 |
|---|------|------|------|
| R-B1 ★ | **入库计划生成漏改净出 + fire-and-forget**：编辑采购订单会把入库计划重置为全量（已收货被遗忘→可重复入库）；生成失败静默丢计划。销售/采购侧同款问题上轮已修，采购→入库侧漏做 | inboundPlanController.js:212-227；purchaseOrderController.js:259-262/363-366 | 净出 quantity=max(0,total−inbound_quantity)、状态推导、事务内 await（对齐 outboundPlanController）|
| R-B2 | **plan_deductions 收敛缺口**：订单更新删除重建计划后（新 plan_id），单据的扣减记录指向死计划行，删单回补静默丢量且不走合同兜底 | planRestore.js:176-179；delivery/warehousing/purchaseOrderController 的恢复路径 | restorePlanDeductions 返回 unmatchedQty>0 时补跑 restoreQuantitiesToPlans 兜底 |

### 🟡 中 10 条（摘要）
| # | 问题 |
|---|------|
| R-C1 | 出/入库单编辑同步应收应付**漏 handling_fee**（balance=amount−received vs 权威 amount+fee−received），不重算 status、amount 不钳位 ≥received |
| R-C2 | 全额退货删除账款丢手续费；恢复重建字段不全（丢 handling_fee/payment_method/due_date/billing_status）、金额用 returnAmount 不是原值 |
| R-C3 | 退货单编辑只调库存不动移动平均单价；表单 return_items 不带 tax_rate → tax_excluded_price 永不更新（死分支）|
| R-C4 | 退货单只改 source_order_id/number 不改明细时无对账：冲减留在旧账款、累计校验被绕过 |
| R-C5 | `Number(null)=0` 税率语义：旧数据 tax_rate=null 的行被编辑后未税价从 0 跳成含税全价；null 与 undefined 行为相反 |
| R-C6 | 取号锁只锁取号不锁落库（并发仍可撞号，多数模型无 ER_DUP_ENTRY 重试）；事务内二次借池连接（limit=10 可互等）|
| R-C7 | updateSalesOrder 数量下限校验漏"整行删除"场景；删除守卫 `outbound_quantity>0` 无浮点容差（残留会永久误拦）|
| R-C8 | 入库侧行状态浮点 `===` 比较（0.1+0.2 类数量卡状态），出库侧已修容差、入库侧漏改 |
| R-C9 | 对账单更新时手续费清零/删明细行不还原应收应付上的残留；均分尾差 |
| R-C10 | 入库单 create 信任前端 total_amount、update 服务端重算，口径不一致；update 库存 Math.max(0) 静默吞缺货；移动平均调价删除/减量不还原 |

### 🟢 低/模式 4 条
| # | 问题 |
|---|------|
| R-D1 | 日期本地化漏网：三个计划生成器 entry_date 兜底仍用 toISOString；4 处查询边界拼 ' 00:00:00'/' 23:59:59' 无 length===10 兼容（带时分秒参数会静默查空）|
| R-D2 | 退货单删除路径 `(x\|\|0) + quantity` 数字加法未 parseFloat（字符串 quantity 会拼接），风险低 |
| R-D3 | 8 个控制器 catch 里 `await connection.rollback()` 无防护：连接断开时二次抛错 → Express 4 不接异步抛 → 请求悬挂。修法：try{rollback}catch{} + 始终 500 |
| R-D4 | 滚动条指令小遗留：一容器多表格只接管第一个溢出容器；beforeUnmount 行内还原 'auto' 非现场值（均低危）|

---

## 四、前端残留 bug（F 组，均已读码核实）

### 真 bug 4 条
| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| F-A1 | **create 丢弃 order_number**：表单可编辑/预览单号、报价单转换设计"单号=报价单号-行号"，但三个 create 控制器解构没有 order_number → 落库重新生成号，预览号/手填号/转换单号全部落空（行级转换"-行号"后缀完全失效）| SalesOrderForm:31/959/1038 + salesOrderController.js:139；purchase/delivery 同款 | 单号一致性、多行转换无法区分 |
| F-A2 | **表单路径转换单未税字段全 0**：QuotationForm 发起的转换 `toSalesItem` 写死 tax_excluded_*=0，SalesOrderForm 载入不重算（列表路径上轮已修、表单路径漏同步）| Quotations.vue:511-528 + SalesOrderForm.vue:1047 | 未税金额/税额落库 0，毛利报表错 |
| F-A3 | **转换分支不重置 expenses/entry_date**：先编辑带费用旧单→再从报价转换→新单带上旧单费用和旧录入日期（modal 无 destroyOnClose）| SalesOrderForm.vue:1036-1047 | 新单费用脏数据、金额统计错 |
| F-A4 | **转换丢 product_code**（表单路径写死 ''，列表路径保留）→ 出库计划/库存按编码匹配失效 | Quotations.vue:527 | 下游匹配失效 |

### 可疑/低 5 条
| # | 问题 |
|---|------|
| F-B1 | 滚动条指令 updated() 不校验 target 是否仍在 DOM（表格重建后顶条同步到游离节点消失）——建议加 `el.contains()` 校验 |
| F-B2 | DefaultLayout liveScrollMap 持有已关闭页 DOM（宜 WeakMap）|
| F-B3 | `.main-column{overflow-x:hidden}` 可能裁剪非表格超宽内容（宽表单页建议实测）|
| F-B4 | QuotationPrint 列表打印恒中文（`handlePrint(lang)` 死代码，lang 未传入 printData）|
| F-B5 | SettlementStatement 的 statement_number 筛选前后端都不存在（死分支=功能未实现）|

### 423 条 typecheck 归因（结论）
- **~355 条类型噪音**：根因 `request.ts:22-25` 拦截器已解包 `response.data` 而类型注解仍标 `AxiosResponse<T>`，TS 视图与运行时错位一级；修正 api 返回注解可一次消掉约 190 条
- **~60 条死代码/未用**（calculateAmount、handlePrint、apiCompat 等）
- **与真 bug 挂钩仅 ~8 条**（F-A1 的 TS2353 是唯一"报错即真线索"；F-A2~A4 是 typecheck 查不出的纯逻辑 bug）

---

## 五、复核通过（不用担心的面）

- 路由鉴权 183 端点全覆盖（装箱单修复在位，curl 实测全 401）；SQL 注入无漏网；注册无提权
- 并发核销防超收正确（FOR UPDATE 行锁）；LIKE 转义 89 处全覆盖且常量未误伤
- 累计退货校验、planRestore 封顶、contractOrderLookup 双向封顶、13 处取号表名/前缀一致
- 8 控制器早退 rollback/finally release 齐全（仅 rollback 无防护见 R-D3）
- 滚动条重构无残留引用、无 Observer 泄漏；日期筛选前后端参数全对齐；打印组件编辑回填未写坏
- 真库体检：零新增问题（仅历史 10 条孤儿计划待清理，SQL 见第一轮报告）

## 六、建议处置顺序
1. **安全四高危**：轮换 JWT_SECRET/DB 口令+清 git 历史（H1/H2）→ 补鉴权数据脱敏（H3）→ 堵 XSS（H4/M7/M6）
2. **R-B1 入库计划净出**（业务重复入库风险）+ R-B2 回补兜底
3. **F-A1~A4 报价转换链路**（单号/金额/脏数据/编码）
4. 依赖升级（生产链 body-parser/proxy-addr/axios/xlsx）+ helmet/CORS/限流（M1/M4/M5/M11）
5. 金额与状态一致性（R-C1/C2/C5/C7/C8）→ 其余中低危
