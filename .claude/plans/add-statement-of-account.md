# 对账单功能实现计划

> **For agentic workers:** RECOMMENDED claude model for this plan: Sonnet (routine implementation, mostly CRUD + aggregation queries).

## TL;DR

> **Quick Summary:** 新增对账单（结算管理）功能，将应收账款和应付账款按来源单据类型（`source_bill_type`）进行汇总展示，提供汇总统计数据。页面支持查看列表和详情，预留结算操作接口但暂不实现前端操作。
>
> **Deliverables:**
> - 后端：对账单 API（列表查询 + 汇总统计 + 详情 + 预留结算接口）
> - 前端：对账单列表页 + 详情页
> - 路由注册 + 侧边栏菜单
> - TypeScript 类型定义
>
> **Estimated Effort:** Short (几小时)
> **Parallel Execution:** YES - 2 waves
> **Critical Path:** API → 前端页面

---

## Context

### Original Request
根据 `.function/add-statement-of-account.md` 需求文档，新增对账单功能。对账单将应收和应付数据按来源单据类型（`source_bill_type`）进行汇总，用于结算核对。

### Interview Summary
- **操作功能：** 仅查看（列表+详情），预留结算操作接口但暂不实现
- **汇总统计：** 应收/应付汇总（总计、已结算、待结算）
- **手续费处理：** 作为应收/应付表的字段（`handling_fee` 字段已存在）
- **汇总维度：** 按 `source_bill_type`（来源单据类型）汇总
- **详情页面：** 需要独立的详情页

### 现有代码库分析
- `receivables` 和 `payables` 表已存在 `billing_status`（开票状态）和 `handling_fee`（手续费）字段
- `source_bill_type` 在应收表中：1=出库单, 2=销售退货单；在应付表中：1=入库单, 2=采购退货单
- 现有模型继承 `BaseModel`，提供 `findAll`、`paginate` 等方法
- 控制器使用 ES 模块 + Express async/await 模式
- 前端使用 Vue 3 + Ant Design Vue + TypeScript
- 侧边栏已有"应收应付"菜单分组

---

## Work Objectives

### Core Objective
创建对账单功能，包含列表页和详情页，汇总展示应收和应付数据，按来源单据类型分类统计，提供全局汇总数据。预留结算操作接口。

### Concrete Deliverables
- `server/controllers/settlementController.js` — 对账单 API 控制器
- `server/routes/settlementRoutes.js` — 对账单路由
- `src/api/settlement.ts` — 前端 API 调用
- `src/views/settlement/SettlementStatement.vue` — 对账单列表页
- `src/views/settlement/SettlementDetail.vue` — 对账单详情页
- `src/types/index.ts` — 新增类型定义
- `src/router/index.ts` — 新增路由
- `src/layouts/DefaultLayout.vue` — 新增菜单项
- `server/index.js` — 注册路由

### Must Have
- 按来源单据类型汇总的应收/应付数据表
- 全局汇总统计卡片（应收总额、应付总额、净额、已结算、待结算）
- 按日期范围、结算状态、开票状态筛选
- 分页展示明细数据
- 详情页面展示单条记录完整信息
- 金额格式化展示
- 预留结算操作 API（`POST /api/settlement/settle`）

### Must NOT Have
- 无前端结算操作按钮（API 预留，前端不暴露）
- 无图表展示
- 不新增数据库表或字段（利用现有字段）

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — all verification is agent-executed.

### Test Decision
- **Infrastructure exists:** NO
- **Automated tests:** NONE
- **Framework:** none

### QA Policy
- 类型检查通过：`npm run typecheck`
- 构建成功：`npm run build`
- 页面渲染验证：检查组件模板无语法错误

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (立即开始 — 后端 API + 类型定义):
├── Task 1: 后端 API — 对账单控制器 + 路由 [quick]
├── Task 2: TypeScript 类型定义 [quick]
└── Task 3: 注册路由到 server/index.js [quick]

Wave 2 (Wave 1 完成后 — 前端实现):
├── Task 4: 前端 API 调用层 [quick]
├── Task 5: 对账单列表页组件 [medium]
├── Task 6: 对账单详情页组件 [medium]
├── Task 7: 路由注册 [quick]
└── Task 8: 侧边栏菜单 [quick]

Wave FINAL:
├── Task F1: 类型检查 [quick]
└── Task F2: 构建验证 [quick]
```

### Dependency Matrix
- **Tasks 1-3:** 无依赖，可并行
- **Tasks 4-8:** 依赖 Wave 1
- **F1-F2:** 依赖所有前置任务

### Agent Dispatch Summary
- **Wave 1:** 3 任务 → 3 agents (后端 API、类型定义、路由注册)
- **Wave 2:** 5 任务 → 5 agents (API 层、列表页、详情页、路由、菜单)
- **FINAL:** 2 任务 → 2 agents (typecheck、build)

---

## TODOs

- [ ] 1. 后端 API — 对账单控制器 + 路由

  **What to do:**
  - 创建 `server/controllers/settlementController.js`
    - `getSettlementList`: 查询应收/应付明细列表
      - 支持分页、筛选（日期范围、结算状态、开票状态、类型 receivable/payable）
      - 合并查询 receivables 和 payables 表，统一返回格式
      - 返回字段：id, type(receivable/payable), entity_name, source_bill_type, source_bill_id, amount, received_amount, balance_amount, handling_fee, status, billing_status, due_date, create_time
    - `getSettlementSummary`: 汇总统计接口
      - 返回：
        - `total_receivable`: 应收总额（amount 之和）
        - `total_payable`: 应付总额（amount 之和）
        - `net_amount`: 净额（应收 - 应付）
        - `settled_receivable`: 已结算应收（status=2 的 amount 之和）
        - `unsettled_receivable`: 待结算应收（status=0 或 1 的 amount 之和）
        - `settled_payable`: 已结算应付
        - `unsettled_payable`: 待结算应付
        - `by_source_type`: 按 source_bill_type 分组统计数组
    - `getSettlementById`: 详情接口
      - 根据 type 和 id 查询单条记录详情
    - `settleSettlement`: 结算操作（预留接口）
      - 接收 id, type, billing_status 参数
      - 更新对应记录的 billing_status 字段
      - **注意：此接口预留，前端暂不调用**

  - 创建 `server/routes/settlementRoutes.js`
    - `GET /` → getSettlementList
    - `GET /summary` → getSettlementSummary
    - `GET /:type/:id` → getSettlementById
    - `POST /settle` → settleSettlement

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `server/controllers/receivableController.js:1-107` — 控制器模式参考
  - `server/models/Receivable.js:1-28` — 模型模式参考
  - `server/models/Payable.js:1-28` — 模型模式参考
  - `server/models/BaseModel.js:42-50` — findAll 方法签名
  - `server/routes/receivableRoutes.js:1-17` — 路由模式参考

  **Acceptance Criteria:**
  - [ ] 控制器导出 `getSettlementList`、`getSettlementSummary`、`getSettlementById`、`settleSettlement`
  - [ ] 路由正确注册
  - [ ] 汇总统计按 source_bill_type 分组

  **Commit:** NO (与后续任务一起提交)

---

- [ ] 2. TypeScript 类型定义

  **What to do:**
  - 在 `src/types/index.ts` 中新增：
    ```typescript
    // 对账单明细
    export interface SettlementItem {
      id: string
      type: 'receivable' | 'payable'
      entity_name: string  // 客户名或供应商名
      source_bill_type: number
      source_bill_type_text: string
      source_bill_id: string
      amount: number
      received_amount: number
      balance_amount: number
      handling_fee: number
      status: 0 | 1 | 2
      billing_status: 0 | 1 | 2
      due_date: string
      create_time: string
    }

    // 对账单汇总
    export interface SettlementSummary {
      total_receivable: number
      total_payable: number
      net_amount: number
      settled_receivable: number
      unsettled_receivable: number
      settled_payable: number
      unsettled_payable: number
      by_source_type: {
        source_bill_type: number
        source_bill_type_text: string
        receivable_amount: number
        payable_amount: number
        count: number
      }[]
    }

    // 对账单查询参数
    export interface SettlementQueryParams {
      page?: number
      pageSize?: number
      type?: 'receivable' | 'payable' | ''
      status?: 0 | 1 | 2
      billing_status?: 0 | 1 | 2
      start_date?: string
      end_date?: string
    }
    ```

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/types/index.ts:808-863` — Receivable/Payable 类型定义参考
  - `src/types/index.ts` — PaginatedResponse 类型已存在

  **Acceptance Criteria:**
  - [ ] 类型定义无 TypeScript 错误

  **Commit:** NO

---

- [ ] 3. 注册路由到 server/index.js

  **What to do:**
  - 在 `server/index.js` 中添加：
    ```javascript
    import settlementRoutes from './routes/settlementRoutes.js'
    // ...
    app.use('/api/settlement', settlementRoutes)
    ```

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `server/index.js:23-24` — 现有导入模式
  - `server/index.js:58-59` — 现有路由注册模式

  **Acceptance Criteria:**
  - [ ] 路由正确注册在 `/api/settlement` 路径

  **Commit:** NO

---

- [ ] 4. 前端 API 调用层

  **What to do:**
  - 创建 `src/api/settlement.ts`
    ```typescript
    import instance from '@/utils/request'
    import type { SettlementItem, SettlementSummary, SettlementQueryParams, PaginatedResponse } from '@/types'

    const API_BASE_URL = '/settlement'

    export const settlementApi = {
      getList: async (params: SettlementQueryParams = {}): Promise<PaginatedResponse<SettlementItem>> => {
        return instance.get(`${API_BASE_URL}`, { params })
      },
      getSummary: async (params: { start_date?: string; end_date?: string } = {}): Promise<SettlementSummary> => {
        return instance.get(`${API_BASE_URL}/summary`, { params })
      },
      getById: async (type: 'receivable' | 'payable', id: string): Promise<SettlementItem> => {
        return instance.get(`${API_BASE_URL}/${type}/${id}`)
      }
    }
    ```

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/api/receivables.ts:1-26` — API 调用模式参考

  **Acceptance Criteria:**
  - [ ] API 函数类型正确
  - [ ] 使用 `instance` 实例

  **Commit:** NO

---

- [ ] 5. 对账单列表页组件

  **What to do:**
  - 创建 `src/views/settlement/SettlementStatement.vue`
  - 页面结构：
    1. **标题区:** "对账单"
    2. **汇总卡片区:** 使用 `a-row` + `a-col` + `a-statistic` 展示：
       - 应收总额（蓝色）
       - 应付总额（橙色）
       - 净额（正数绿色/负数红色）
       - 待结算应收
       - 待结算应付
    3. **来源类型汇总表:** `a-table` 按 `source_bill_type` 分组展示：
       - 来源类型、应收金额、应付金额、笔数
    4. **筛选区:** `a-form layout="inline"` —
       - 类型筛选（应收/应付/全部）
       - 结算状态筛选
       - 开票状态筛选
       - 结算日期范围
       - 查询/重置按钮
    5. **明细列表:** `a-table` 分页展示明细数据
       - 列：类型（应收/应付）、客户/供应商、来源单据、金额、已收/付、余额、手续费、状态、开票状态、结算日期
       - 操作列：详情按钮
       - 分页组件
  - 点击"详情"跳转到详情页（`router.push`）
  - 使用 `v-scroll-topbar` 指令（参考 ProfitReport）
  - 金额格式化：`formatMoney` 函数
  - 日期格式化：`formatDate` 工具函数

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/views/receivables/Receivables.vue:1-411` — 完整页面模式参考（筛选、表格、分页）
  - `src/views/reports/ProfitReport.vue:1-546` — 报表页面参考（汇总行、v-scroll-topbar）
  - `src/views/receivables/Receivables.vue:263-313` — 状态颜色/文本映射
  - `src/views/receivables/Receivables.vue:315-321` — formatMoney 函数

  **Acceptance Criteria:**
  - [ ] 汇总卡片正确展示统计数据
  - [ ] 筛选功能正常工作
  - [ ] 表格分页正常
  - [ ] 金额格式化正确
  - [ ] 使用 `a-statistic` 组件展示统计数字
  - [ ] 点击详情可跳转到详情页

  **Commit:** NO

---

- [ ] 6. 对账单详情页组件

  **What to do:**
  - 创建 `src/views/settlement/SettlementDetail.vue`
  - 页面结构：
    1. **标题区:** "对账单详情" + 返回按钮
    2. **基本信息卡片:** 使用 `a-descriptions` 展示：
       - 类型（应收/应付）
       - 客户/供应商名称
       - 来源单据类型
       - 来源单据编号
       - 结算日期
       - 创建时间
    3. **金额信息卡片:** 使用 `a-descriptions` 展示：
       - 应收/付金额
       - 已收/付金额
       - 未收/付余额
       - 手续费
    4. **状态信息卡片:** 使用 `a-descriptions` 展示：
       - 结算状态（Tag 展示）
       - 开票状态（Tag 展示）
  - 路由参数：`/settlement-statement/:type/:id`
  - 使用 `useRoute` 获取参数
  - 调用 `settlementApi.getById` 获取数据

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/views/receivables/Receivables.vue:263-313` — 状态颜色/文本映射
  - Ant Design Vue `a-descriptions` 组件文档

  **Acceptance Criteria:**
  - [ ] 详情页正确展示所有字段
  - [ ] 返回按钮可跳转回列表页
  - [ ] 状态使用 Tag 组件展示

  **Commit:** NO

---

- [ ] 7. 路由注册

  **What to do:**
  - 在 `src/router/index.ts` 的 children 数组中添加：
    ```typescript
    {
      path: 'settlement-statement',
      name: 'SettlementStatement',
      component: () => import('@/views/settlement/SettlementStatement.vue'),
      meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
    },
    {
      path: 'settlement-statement/:type/:id',
      name: 'SettlementDetail',
      component: () => import('@/views/settlement/SettlementDetail.vue'),
      meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
    }
    ```

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/router/index.ts:91-101` — 现有路由定义模式

  **Acceptance Criteria:**
  - [ ] 列表路由正确注册
  - [ ] 详情路由正确注册（带参数）

  **Commit:** NO

---

- [ ] 8. 侧边栏菜单

  **What to do:**
  - 在 `src/layouts/DefaultLayout.vue` 的 "应收应付" (`ReceivablePayable`) 子菜单中添加：
    ```vue
    <a-menu-item key="SettlementStatement" @click="navigateTo('/settlement-statement')">
      <span>对账单</span>
    </a-menu-item>
    ```

  **Recommended Agent Profile:**
  - **Skills:** [] (无需特定 skill)

  **References:**
  - `src/layouts/DefaultLayout.vue:75-86` — 现有"应收应付"菜单结构

  **Acceptance Criteria:**
  - [ ] 菜单项正确显示在"应收应付"分组下

  **Commit:** YES
  - 所有任务完成后统一提交
  - Message: `feat: 新增对账单功能`
  - Files: 所有新增和修改的文件

---

## Final Verification Wave

- [ ] F1. **类型检查**
  Run `npm run typecheck` — must pass with zero errors.

- [ ] F2. **构建验证**
  Run `npm run build` — must succeed.

---

## Commit Strategy

- **Single commit after all tasks:**
  - Message: `feat: 新增对账单功能`
  - Files: 所有新增和修改的文件

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck  # Expected: no errors
npm run build      # Expected: build succeeds
```

### Final Checklist
- [ ] 对账单列表页可正常访问
- [ ] 汇总统计数据正确
- [ ] 筛选功能正常
- [ ] 分页功能正常
- [ ] 详情页可正常访问
- [ ] 详情页返回功能正常
- [ ] 预留结算 API 可调用
- [ ] 类型检查通过
- [ ] 构建成功
