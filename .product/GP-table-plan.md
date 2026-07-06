# 功能规划：毛利表查询功能

> Generated: 2026-07-06
> Source: `.function/GP-table.md`

---

## 一、功能概述

在报表中心新增毛利表查询功能，通过出库单 → 销售订单 → 采购订单 → 入库单的数据链路，计算每笔出库商品的毛利。

**核心公式**：`毛利 = 出库额 - 成本 - 入库费用中的关税`

---

## 二、数据链路

```
出库单 (delivery_orders)
  │  contract_number = 销售合同编号
  ↓
销售订单 (sales_orders)
  │  sales_order_id = purchase_orders.related_sales_order_id
  ↓
采购订单 (purchase_orders)
  │  contract_number = 采购合同编号
  ↓
入库单 (warehousing_orders)
```

### 各环节数据用途

| 环节 | 数据来源 | 用途 |
|------|---------|------|
| 出库额 | delivery_orders.delivery_items | 出货数量 × 含税单价 = 销售额（含税） |
| 结算状态/日期 | sales_orders.sales_items (JSON) | 按 product_code 匹配商品行，取 settlement_status / settlement_date |
| 销售费用 | sales_orders.expenses | 运输费、手续费、其他 |
| 采购合同编号 | purchase_orders.contract_number | 关联入库单 |
| 采购员 | purchase_orders.purchase_person | 采购员信息 |
| 成本（入库） | warehousing_orders.warehousing_items | 入库数量 × 未税单价 = 入库金额 |
| 入库费用 | warehousing_orders.expenses | 关税（tariff）、运杂费、报关费、其他 |
| 成本（兜底） | products.tax_excluded_price | 无入库数据时，用产品移动平均未税单价 |

---

## 三、毛利表列定义

| 序号 | 列名 | 数据来源 | 说明 |
|------|------|---------|------|
| 1 | 出货日期 | delivery_orders.delivery_date | 出库单日期 |
| 2 | 结算状态 | sales_items.settlement_status | 匹配 product_code，值：未结算/部分结算/全部结算 |
| 3 | 结算日期 | sales_items.settlement_date | 匹配 product_code |
| 4 | 销售合同编号 | delivery_orders.contract_number | 链接销售订单 |
| 5 | 销售员 | sales_orders.sales_person | |
| 6 | 公司名称 | sales_orders.customer_name | 客户名称 |
| 7 | 结算方式 | sales_orders.payment_method | |
| 8 | 分类 | product.product_classification | 产品分类 |
| 9 | 产品名称 | delivery_items.product_name | |
| 10 | 产品代码 | delivery_items.product_code | |
| 11 | 规格型号 | delivery_items.model | |
| 12 | 规格描述 | product.description | 来自产品表 |
| 13 | 单位 | delivery_items.unit | |
| 14 | 出货数量 | delivery_items.quantity | |
| 15 | 单价 | delivery_items.tax_included_price | 含税单价 |
| 16 | 销售额（含税） | quantity × tax_included_price | |
| 17 | 未税单价 | tax_included_price / (1 + tax_rate/100) | 默认税率13% |
| 18 | 未税金额 | quantity × 未税单价 | |
| 19 | 采购合同编号 | purchase_orders.contract_number | 链接入库单 |
| 20 | 采购员 | purchase_orders.purchase_person | |
| 21 | 入库日期 | warehousing_orders.entry_date | |
| 22 | 入库数量 | warehousing_items.quantity | 匹配 product_code |
| 23 | 入库单价（未税） | warehousing_items.tax_included_price / 1.13 | 含税转未税 |
| 24 | 入库金额 | 入库数量 × 入库单价（未税） | |
| 25 | 采购费用 | purchase_orders.expenses | 运输费、增值税、手续费、其他 |
| 26 | 销售费用 | sales_orders.expenses | 运输费、手续费、其他 |
| 27 | 入库费用 | warehousing_orders.expenses | 关税（tariff）、运杂费、报关费、其他 |
| 28 | 出库费用 | delivery_orders.expenses | 快递费、运杂费、报关费、其他 |
| 29 | 毛利 | 出库额(未税) - 入库金额 - 入库费用中的关税 | 核心计算 |
| 30 | 提成比例 | — | 预留字段 |
| 31 | 应发提成 | — | 预留字段 |
| 32 | 备注 | delivery_orders.remarks | |

---

## 四、毛利计算逻辑

### 4.1 成本确定（按优先级）

1. **有入库数据**：使用入库单中匹配 product_code 的商品行的 `tax_included_price / 1.13`（含税转未税）
2. **无入库数据**：使用 products 表中对应产品的 `tax_excluded_price`（移动平均未税单价）

### 4.2 毛利公式

```
毛利 = 出库额(未税) - 入库金额 - 入库费用中的关税(tariff)
```

其中：
- `出库额(未税)` = 出货数量 × 未税单价
- `入库金额` = 入库数量 × 入库单价（未税），无入库时 = 出货数量 × 产品未税单价
- `入库费用中的关税` = warehousing_orders.expenses.tariff（按比例分摊到商品行，或取整单关税）

### 4.3 费用分摊策略

订单级费用（采购费用、销售费用、入库费用、出库费用）需要分摊到商品行：
- **按金额比例分摊**：每行分摊 = 订单总费用 × (该行金额 / 订单总金额)
- **或按数量均摊**：每行分摊 = 订单总费用 / 总数量 × 该行数量

建议采用**按金额比例分摊**，更准确反映各商品的实际费用。

---

## 五、API 设计

### 5.1 查询毛利表

**接口**：`GET /profit-report`

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| startDate | string | 否 | 出货开始日期 (YYYY-MM-DD) |
| endDate | string | 否 | 出货结束日期 (YYYY-MM-DD) |
| contractNumber | string | 否 | 销售合同编号（模糊匹配） |
| customerName | string | 否 | 客户名称（模糊匹配） |
| productCode | string | 否 | 产品代码（模糊匹配） |
| page | number | 否 | 页码，默认 1 |
| pageSize | number | 否 | 每页条数，默认 50 |

**响应**：
```json
{
  "success": true,
  "data": [
    {
      "delivery_date": "2026-07-01",
      "settlement_status": "未结算",
      "settlement_date": null,
      "sales_contract_number": "HT-2026-001",
      "sales_person": "张三",
      "customer_name": "深圳XX科技",
      "payment_method": "月结30天",
      "classification": "电子元器件",
      "product_name": "STM32F103C8T6",
      "product_code": "IC-0001",
      "model": "LQFP48",
      "description": "ARM Cortex-M3 MCU",
      "unit": "个",
      "delivery_quantity": 100,
      "unit_price": 10.00,
      "sales_amount_included": 1000.00,
      "unit_price_excluded": 8.85,
      "sales_amount_excluded": 885.00,
      "purchase_contract_number": "PO-2026-001",
      "purchase_person": "李四",
      "warehousing_date": "2026-06-28",
      "warehousing_quantity": 100,
      "warehousing_unit_price_excluded": 6.19,
      "warehousing_amount": 619.00,
      "purchase_expenses": { "transportationFee": 0, "valueAddedTax": 0, "handlingFee": 0, "otherFee": 0 },
      "sales_expenses": { "transportationFee": 50, "handlingFee": 0, "otherFee": 0 },
      "warehousing_expenses": { "tariff": 100, "transportationFee": 30, "customsFee": 0, "otherFee": 0 },
      "delivery_expenses": { "expressDeliveryFee": 20, "transportationFee": 0, "customsFee": 0, "otherFee": 0 },
      "gross_profit": 166.00,
      "commission_rate": null,
      "commission_amount": null,
      "remarks": ""
    }
  ],
  "pagination": { "total": 100, "page": 1, "pageSize": 50, "totalPages": 2 }
}
```

---

## 六、后端实现方案

### 6.1 查询流程

```
1. 查询 delivery_orders（按日期、合同编号、客户名过滤）
   ↓
2. 解析 delivery_items JSON，每个商品生成一行报告
   ↓
3. 批量查询 sales_orders（按 contract_number IN (...)）
   ↓
4. 批量查询 purchase_orders（按 related_sales_order_id IN (...)）
   ↓
5. 批量查询 warehousing_orders（按 contract_number IN (...)）
   ↓
6. 批量查询 products（按 product_code IN (...)，用于兜底成本）
   ↓
7. 遍历每行，匹配关联数据，计算毛利
```

### 6.2 关键实现细节

**Step 1 - 查询出库单**：
```sql
SELECT * FROM delivery_orders
WHERE entry_date BETWEEN ? AND ?
  AND contract_number LIKE ?
  AND customer_name LIKE ?
ORDER BY entry_date DESC
```

**Step 2 - 批量查询销售订单**：
```sql
SELECT * FROM sales_orders
WHERE contract_number IN (?)
```
构建 `salesOrderMap[contract_number]`

**Step 3 - 批量查询采购订单**：
```sql
SELECT * FROM purchase_orders
WHERE related_sales_order_id IN (?)
```
构建 `purchaseOrderMap[sales_order_id]`（可能一个销售订单对应多个采购订单）

**Step 4 - 批量查询入库单**：
```sql
SELECT * FROM warehousing_orders
WHERE contract_number IN (?)
```
构建 `warehousingOrderMap[contract_number]`

**Step 5 - 批量查询产品**：
```sql
SELECT product_code, tax_excluded_price, description, product_classification
FROM products
WHERE product_code IN (?)
```
构建 `productMap[product_code]`

**Step 6 - 遍历生成报告行**：
对每个出库单的每个商品行：
1. 通过 contract_number 找到销售订单 → 解析 sales_items JSON → 按 product_code 匹配商品行 → 获取结算状态(settlement_status)、结算日期(settlement_date)、销售费用、客户名、销售员、结算方式
2. 通过 sales_order_id 找到采购订单 → 获取采购合同编号、采购员、采购费用
3. 通过采购合同编号找到入库单 → 匹配 product_code 的商品行 → 获取入库成本
4. 若无入库数据 → 用 productMap 中的 tax_excluded_price 作为成本
5. 计算毛利

---

## 七、前端实现方案

### 7.1 页面结构

参考现有 `WarehousingExpenseReport.vue` 的布局：
- 顶部：搜索栏（日期范围、销售合同编号、客户名称、产品代码）
- 中部：数据表格（支持横向滚动，列数较多）
- 底部：分页 + 合计行

### 7.2 列分组

```typescript
const columns = [
  { title: '出货日期', dataIndex: 'delivery_date', fixed: 'left', width: 100 },
  { title: '结算状态', dataIndex: 'settlement_status', width: 80 },
  { title: '结算日期', dataIndex: 'settlement_date', width: 100 },
  { title: '销售合同编号', dataIndex: 'sales_contract_number', width: 130 },
  { title: '销售员', dataIndex: 'sales_person', width: 80 },
  { title: '公司名称', dataIndex: 'customer_name', width: 150 },
  { title: '结算方式', dataIndex: 'payment_method', width: 100 },
  { title: '分类', dataIndex: 'classification', width: 100 },
  // ---- 商品信息 ----
  { title: '产品名称', dataIndex: 'product_name', width: 150 },
  { title: '产品代码', dataIndex: 'product_code', width: 120 },
  { title: '规格型号', dataIndex: 'model', width: 100 },
  { title: '规格描述', dataIndex: 'description', width: 120 },
  { title: '单位', dataIndex: 'unit', width: 60 },
  { title: '出货数量', dataIndex: 'delivery_quantity', width: 80 },
  // ---- 销售信息 ----
  { title: '单价', dataIndex: 'unit_price', width: 90, align: 'right' },
  { title: '销售额（含税）', dataIndex: 'sales_amount_included', width: 120, align: 'right' },
  { title: '未税单价', dataIndex: 'unit_price_excluded', width: 90, align: 'right' },
  { title: '未税金额', dataIndex: 'sales_amount_excluded', width: 110, align: 'right' },
  // ---- 采购信息 ----
  { title: '采购合同编号', dataIndex: 'purchase_contract_number', width: 130 },
  { title: '采购员', dataIndex: 'purchase_person', width: 80 },
  { title: '入库日期', dataIndex: 'warehousing_date', width: 100 },
  { title: '入库数量', dataIndex: 'warehousing_quantity', width: 80 },
  { title: '入库单价（未税）', dataIndex: 'warehousing_unit_price_excluded', width: 120, align: 'right' },
  { title: '入库金额', dataIndex: 'warehousing_amount', width: 110, align: 'right' },
  // ---- 费用 ----
  { title: '采购费用', dataIndex: 'purchase_expenses_total', width: 100, align: 'right' },
  { title: '销售费用', dataIndex: 'sales_expenses_total', width: 100, align: 'right' },
  { title: '入库费用', dataIndex: 'warehousing_expenses_total', width: 100, align: 'right' },
  { title: '出库费用', dataIndex: 'delivery_expenses_total', width: 100, align: 'right' },
  // ---- 毛利 ----
  { title: '毛利', dataIndex: 'gross_profit', width: 110, align: 'right', fixed: 'right' },
  { title: '提成比例', dataIndex: 'commission_rate', width: 80, align: 'right', fixed: 'right' },
  { title: '应发提成', dataIndex: 'commission_amount', width: 100, align: 'right', fixed: 'right' },
  { title: '备注', dataIndex: 'remarks', width: 150 },
]
```

### 7.3 合计行

表格底部显示合计行，对数值列求和：
- 出货数量、销售额（含税）、未税金额、入库数量、入库金额
- 采购费用、销售费用、入库费用、出库费用、毛利

---

## 八、文件清单

### 后端（新建）

| 文件 | 说明 |
|------|------|
| `server/routes/profitReportRoutes.js` | 路由定义 |
| `server/controllers/profitReportController.js` | 控制器：查询、数据组装、毛利计算 |

### 前端（新建）

| 文件 | 说明 |
|------|------|
| `src/api/profitReport.ts` | API 客户端 |
| `src/views/reports/ProfitReport.vue` | 毛利表页面（搜索 + 表格 + 合计） |

### 需修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `server/index.js` | 注册 profitReportRoutes |
| `src/router/index.ts` | 添加毛利表路由 |
| `src/layouts/DefaultLayout.vue` | 报表中心菜单添加毛利表入口 |

---

## 九、注意事项

1. **费用分摊**：订单级费用需按金额比例分摊到每个商品行，不能直接使用订单总费用
2. **无入库数据的兜底**：当采购订单未找到或入库单无数据时，使用 products 表的移动平均未税单价作为成本
3. **多采购订单**：一个销售订单可能关联多个采购订单（related_sales_order_id），需汇总所有采购订单的数据
4. **税率处理**：入库单价默认含税（13%），需除以 1.13 转为未税单价
5. **预留字段**：提成比例、应发提成当前无数据源，列为预留字段
6. **性能优化**：批量查询关联表（使用 IN 查询），避免 N+1 问题
