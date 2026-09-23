# 基础毛利表规划文档

## 一、需求概述

新增一个**基础毛利表**页面，只统计销售订单的销售额和采购订单的采购额，计算毛利。

**核心逻辑**：
- 销售额和采购额都需要换算成人民币（CNY）
- 汇率统一使用**海关汇率**
- 汇率查询依据：销售订单用**销售订单的录入日期**，采购订单用**采购订单的录入日期**
- 毛利 = 销售额（CNY） - 采购额（CNY）

---

## 二、数据来源

### 2.1 销售订单（sales_orders）

| 字段 | 说明 |
|------|------|
| sales_order_id | 主键 |
| contract_number | 销售合同编号 |
| customer_name | 客户名称 |
| sales_items | 销售商品JSON（含 product_code, product_name, quantity, tax_included_price, tax_rate 等） |
| tax_included_amount | 含税总价 |
| currency | 币种（如 USD, CNY） |
| exchange_rate | 订单汇率 |
| entry_date | 录入日期（用于查询海关汇率） |
| sales_person | 销售员 |

### 2.2 采购订单（purchase_orders）

| 字段 | 说明 |
|------|------|
| purchase_order_id | 主键 |
| contract_number | 采购合同编号 |
| supplier_name | 供应商名称 |
| purchase_items | 采购商品JSON（含 product_code, product_name, quantity, tax_included_price, tax_rate 等） |
| currency | 币种 |
| exchange_rate | 订单汇率 |
| entry_date | 录入日期（用于查询海关汇率） |
| purchase_person | 采购员 |
| related_sales_orders | 关联的销售订单（JSON数组，含 sales_order_id） |
| expenses | 采购费用JSON（含 transportationFee, operatingFee, vat, handlingFee, otherFee） |

### 2.3 海关汇率（customs_exchange_rates）

| 字段 | 说明 |
|------|------|
| source_currency | 源币种 |
| target_currency | 目标币种 |
| rate | 汇率 |
| effective_month | 生效月（第一天日期，如 2026-09-01） |

---

## 三、页面设计

### 3.1 页面路径

`/reports/basic-profit-report`

### 3.2 筛选条件

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 录入日期范围 | 日期范围选择器 | 筛选销售订单的录入日期 |
| 销售合同编号 | 文本输入 | 模糊匹配 |
| 客户名称 | 文本输入 | 模糊匹配 |
| 产品代码 | 文本输入 | 模糊匹配 |
| 销售员 | 文本输入 | 模糊匹配 |

### 3.3 表格列设计

| 序号 | 列名 | 数据字段 | 说明 |
|------|------|----------|------|
| 1 | 销售合同编号 | contract_number | 来自销售订单 |
| 2 | 客户名称 | customer_name | 来自销售订单 |
| 3 | 销售员 | sales_person | 来自销售订单 |
| 4 | 录入日期 | entry_date | 销售订单录入日期 |
| 5 | 产品名称 | product_name | 来自销售商品行 |
| 6 | 产品代码 | product_code | 来自销售商品行 |
| 7 | 规格型号 | model | 来自销售商品行 |
| 8 | 销售数量 | quantity | 来自销售商品行 |
| 9 | 币种 | currency | 销售订单币种 |
| 10 | 销售单价（含税） | unit_price | 原币 |
| 11 | 销售金额（含税） | amount | 原币 = 数量 × 单价 |
| 12 | 海关汇率（销售） | sales_customs_rate | 根据销售订单录入日期查询 |
| 13 | 销售金额（CNY） | sales_amount_cny | = 销售金额 × 海关汇率 |
| 14 | 采购合同编号 | purchase_contract_number | 关联的采购订单 |
| 15 | 供应商名称 | supplier_name | 关联的采购订单 |
| 16 | 采购员 | purchase_person | 关联的采购订单 |
| 17 | 采购数量 | purchase_quantity | 来自采购商品行 |
| 18 | 采购币种 | purchase_currency | 采购订单币种 |
| 19 | 采购单价（含税） | purchase_unit_price | 原币 |
| 20 | 采购金额（含税） | purchase_amount | 原币 |
| 21 | 海关汇率（采购） | purchase_customs_rate | 根据采购订单录入日期查询 |
| 22 | 采购金额（CNY） | purchase_amount_cny | = 采购金额 × 海关汇率 |
| 23 | 采购费用（CNY） | purchase_expense_cny | 采购费用合计（已换算CNY） |
| 24 | 毛利（CNY） | gross_profit | = 销售金额CNY - 采购金额CNY - 采购费用CNY |
| 25 | 毛利率 | gross_profit_rate | = 毛利 / 销售金额CNY × 100% |
| 26 | 备注 | remarks | |

---

## 四、核心计算逻辑

### 4.1 海关汇率查询

```
对于每个订单（销售或采购）：
1. 获取订单的 entry_date
2. 计算 effective_month = entry_date 所在月的第一天（YYYY-MM-01）
3. 查询 customs_exchange_rates 表：
   - source_currency = 订单币种
   - target_currency = 'CNY'
   - effective_month = 计算出的月份
4. 如果未找到，尝试反向查询（source_currency='CNY', target_currency=订单币种）并取倒数
5. 如果仍未找到，使用订单自身的 exchange_rate 作为兜底
```

### 4.2 销售额计算

```
对于每个销售订单的每个商品行：
- 销售金额（原币）= quantity × tax_included_price
- 销售金额（CNY）= 销售金额（原币） × 海关汇率（销售订单录入日期）
```

### 4.3 采购额计算

```
情况一：有关联采购订单
- 采购金额（原币）= quantity × tax_included_price
- 采购金额（CNY）= 采购金额（原币） × 海关汇率（采购订单录入日期）

情况二：无关联采购订单（兜底）
- 从产品表（products）获取商品的单价作为采购成本
- 采购金额（原币）= 销售数量 × 产品表单价（tax_included_price 或 tax_excluded_price）
- 采购金额（CNY）= 采购金额（原币） × 海关汇率（销售订单录入日期）

采购费用（CNY）：
- 从采购订单的 expenses 字段解析费用
- 费用币种与采购订单的 currency 一致
- 各项费用如果采购订单币种非CNY，需用采购订单录入日期的海关汇率换算为CNY
- 采购费用合计 = 运输费 + 增值税 + 手续费 + 其他
```

### 4.4 采购金额分摊

当一个采购订单关联多个销售订单时，采购金额需要按比例分摊：

```
分摊方式：按 related_sales_orders 中各销售订单的 quantity 比例分摊
1. 计算采购订单中某商品的总采购数量
2. 计算各销售订单在 related_sales_orders 中对应的 quantity
3. 分摊比例 = 该销售订单的 quantity / 所有关联销售订单的 quantity 之和
4. 分摊后的采购金额 = 采购金额 × 分摊比例

示例：
- 采购订单 P001 采购商品A，数量100，金额8000
- 关联销售订单 S001（quantity=60）和 S002（quantity=40）
- S001 分摊：8000 × 60/100 = 4800
- S002 分摊：8000 × 40/100 = 3200
```

### 4.5 毛利计算

```
毛利（CNY）= 销售金额（CNY） - 采购金额（CNY） - 采购费用（CNY）
毛利率（%）= 毛利（CNY） / 销售金额（CNY） × 100%
```

---

## 五、数据关联逻辑

### 5.1 销售订单 → 采购订单

采购订单有两个关联字段，查询时需同时覆盖：

**字段一**：`related_sales_order_id`（VARCHAR，单个销售订单ID）
- 直接外键关联，用于主要的一对一场景

**字段二**：`related_sales_orders`（JSON数组，支持多对多）
```json
[
  { "sales_order_id": "xxx-xxx-xxx", "order_number": "XSD-S-...", "product_code": "P001", "quantity": 60 },
  { "sales_order_id": "yyy-yyy-yyy", "order_number": "XSD-S-...", "product_code": "P001", "quantity": 40 }
]
```

**查询逻辑**：
1. 先查询所有符合条件的销售订单
2. 查询关联的采购订单，条件为：
   - `related_sales_order_id IN (销售订单ID列表)`，或
   - `JSON_CONTAINS(related_sales_orders, '{"sales_order_id": "..."}')` 匹配任一销售订单ID
3. 一个销售订单可能关联多个采购订单，一个采购订单也可能关联多个销售订单
4. 无关联采购订单的销售订单仍然显示，采购成本从产品表获取

### 5.2 展示粒度

**按销售订单商品行展示**，每个销售商品一行：
- 如果一个销售订单关联了多个采购订单，将采购金额合计后显示在同一行
- 如果需要更细粒度（按采购订单分行），可以后续扩展

---

## 六、后端实现

### 6.1 新增 API

**接口**: `GET /api/basic-profit-report`

**查询参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 录入日期起始（YYYY-MM-DD） |
| endDate | string | 否 | 录入日期结束（YYYY-MM-DD） |
| contractNumber | string | 否 | 销售合同编号（模糊匹配） |
| customerName | string | 否 | 客户名称（模糊匹配） |
| productCode | string | 否 | 产品代码（模糊匹配） |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认50 |

**响应格式**:
```json
{
  "success": true,
  "data": [
    {
      "contract_number": "HT-2026-001",
      "customer_name": "客户A",
      "sales_person": "张三",
      "entry_date": "2026-09-15",
      "product_name": "产品A",
      "product_code": "P001",
      "model": "型号A",
      "quantity": 100,
      "currency": "USD",
      "unit_price": 10.50,
      "amount": 1050.00,
      "sales_customs_rate": 7.25,
      "sales_amount_cny": 7612.50,
      "purchase_contract_number": "CG-2026-001",
      "supplier_name": "供应商B",
      "purchase_person": "李四",
      "purchase_quantity": 100,
      "purchase_currency": "USD",
      "purchase_unit_price": 8.00,
      "purchase_amount": 800.00,
      "purchase_customs_rate": 7.25,
      "purchase_amount_cny": 5800.00,
      "purchase_expense_cny": 200.00,
      "gross_profit": 1612.50,
      "gross_profit_rate": 21.18,
      "remarks": ""
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 50,
    "totalPages": 2
  }
}
```

### 6.2 Controller 实现步骤

```
1. 查询销售订单（带筛选条件，按销售订单分页）
2. 收集所有销售订单的 sales_order_id
3. 查询关联的采购订单（同时匹配 related_sales_order_id 和 related_sales_orders JSON）
4. 收集所有涉及的币种和月份，批量查询海关汇率（支持正反方向）
5. 批量查询产品表（products）作为无采购订单时的兜底数据
6. 对每个销售订单的商品行：
   a. 计算销售金额（原币）
   b. 根据销售订单 entry_date 查询海关汇率，计算销售金额（CNY）
   c. 找到关联的采购订单：
      - 如果有多个采购订单关联同一商品，按 product_code 匹配并合计
      - 如果一个采购订单关联多个销售订单，按 quantity 比例分摊
   d. 如果无关联采购订单，从产品表获取单价作为采购成本
   e. 根据采购订单 entry_date 查询海关汇率，计算采购金额（CNY）
   f. 计算采购费用（CNY）：费用币种与采购订单 currency 一致，非CNY时用海关汇率换算
   g. 计算毛利和毛利率
7. 返回结果（带分页）
```

> **分页说明**：按销售订单分页，每个销售订单展开后的行数不受 pageSize 限制。

---

## 七、前端实现

### 7.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/views/reports/BasicProfitReport.vue` | 基础毛利表页面 |
| `src/api/basicProfitReport.ts` | API 接口定义 |

### 7.2 路由配置

在 `src/router/index.ts` 中添加：

```typescript
{
  path: '/reports/basic-profit-report',
  name: 'BasicProfitReport',
  component: () => import('@/views/reports/BasicProfitReport.vue'),
  meta: { title: '基础毛利表', icon: 'FundOutlined' }
}
```

### 7.3 页面功能

1. **筛选查询**：日期范围、合同编号、客户名称、产品代码
2. **数据表格**：展示所有列，支持排序
3. **汇总行**：底部显示销售金额CNY合计、采购金额CNY合计、毛利合计、平均毛利率
4. **导出Excel**：支持导出当前查询结果
5. **列配置**：支持用户自定义显示/隐藏列

---

## 八、与现有毛利表的区别

| 对比项 | 现有毛利表 | 基础毛利表 |
|--------|-----------|-----------|
| 数据来源 | 出库单（delivery_orders） | 销售订单（sales_orders） |
| 采购数据 | 通过出库单→销售订单→采购订单→入库单 | 直接通过销售订单→采购订单 |
| 费用计算 | 包含出库费用、销售费用、入库费用、采购费用 | 只包含采购费用 |
| 汇率类型 | 银行汇率 + 海关汇率 | 只用海关汇率 |
| 汇率日期 | 银行汇率用结算日期，海关汇率用出库日期 | 统一用各自订单的录入日期 |
| 结算信息 | 包含应收、已收、核销等 | 不包含 |
| 复杂度 | 高（涉及多表关联） | 低（主要两表关联） |

---

## 九、开发计划

### 阶段一：后端 API
1. 新建 `server/controllers/basicProfitReportController.js`
2. 实现销售订单查询
3. 实现采购订单关联查询
4. 实现海关汇率批量查询
5. 实现毛利计算逻辑
6. 新建 `server/routes/basicProfitReportRoutes.js` 注册路由

### 阶段二：前端页面
1. 新建 `src/api/basicProfitReport.ts` 定义接口
2. 新建 `src/views/reports/BasicProfitReport.vue` 实现页面
3. 配置路由
4. 添加到菜单导航

### 阶段三：测试验证
1. 验证海关汇率查询正确性（支持正反方向）
2. 验证销售订单与采购订单关联正确性
3. 验证毛利计算准确性
4. 验证分页和筛选功能
5. 验证导出Excel功能
