# 入库费用明细表 - 实现规划

## 一、需求概述

在报表中心新增一份**入库费用明细表**，将入库单的商品信息、入库费用、关联采购订单的采购费用登记以及入库人整合到一张报表中，方便财务和管理层进行费用核算与审计。

## 二、数据来源分析

### 2.1 入库单 (`warehousing_orders`)

| 数据项 | 字段 | 说明 |
|--------|------|------|
| 入库单号 | `order_number` | 唯一标识 |
| 入库时间 | `warehousing_time` | 时间筛选依据 |
| 入库人 | `warehousing_person` | 入库经办人 |
| 采购订单号 | `purchase_order_number` | 关联采购订单（可为空） |
| 币种 | `currency` | 默认 CNY |
| 入库商品信息 | `warehousing_items` (JSON) | 包含 product_name, product_code, model, unit, quantity, tax_included_price, total_price 等 |
| 入库费用 | `expenses` (JSON) | `WarehousingExpenses` 类型 |

**入库费用结构 (`WarehousingExpenses`)**：
```json
{
  "expressDeliveryFee": 0,   // 快递费
  "transportationFee": 0,    // 运杂费
  "customsFee": 0,           // 报关费
  "otherFee": 0              // 其他费用
}
```

### 2.2 采购订单 (`purchase_orders`)

通过入库单的 `purchase_order_number` 关联查询。

| 数据项 | 字段 | 说明 |
|--------|------|------|
| 采购订单号 | `order_number` | 关联键 |
| 采购费用 | `expenses` (JSON) | `Expenses` 类型 |

**采购费用结构 (`Expenses`)**：
```json
{
  "transportationFee": 0,    // 交通费
  "entertainmentFee": 0,     // 招待费
  "giftFee": 0,              // 礼品费
  "otherFee": 0              // 其他费用
}
```

### 2.3 数据关联关系

```
warehousing_orders (入库单)
  ├── warehousing_items (JSON) → 商品明细
  ├── expenses (JSON)          → 入库费用
  ├── warehousing_person       → 入库人
  └── purchase_order_number    → 关联采购订单
                                    ├── expenses (JSON) → 采购费用登记
                                    └── purchase_items (JSON) → 采购商品信息（参考）
```

## 三、报表字段设计

### 3.1 表格列定义

| 列名 | 数据来源 | 字段 | 说明 |
|------|----------|------|------|
| **入库单号** | 入库单 | `order_number` | 入库单编号 |
| **入库时间** | 入库单 | `warehousing_time` | 入库日期 |
| **采购订单号** | 入库单 | `purchase_order_number` | 关联的采购订单号（可能为空） |
| **商品编码** | 入库单 items | `product_code` | 商品唯一编码 |
| **商品名称** | 入库单 items | `product_name` | 商品名称 |
| **规格型号** | 入库单 items | `model` | 规格型号 |
| **单位** | 入库单 items | `unit` | 计量单位 |
| **入库数量** | 入库单 items | `quantity` | 入库数量 |
| **含税单价** | 入库单 items | `tax_included_price` | 含税单价 |
| **含税金额** | 入库单 items | `total_price` | 含税总金额 |
| **快递费** | 入库单 expenses | `expressDeliveryFee` | 入库快递费 |
| **运杂费** | 入库单 expenses | `transportationFee` | 入库运杂费 |
| **报关费** | 入库单 expenses | `customsFee` | 入库报关费 |
| **入库其他费** | 入库单 expenses | `otherFee` | 入库其他费用 |
| **入库费用小计** | 计算 | — | 快递费+运杂费+报关费+入库其他费 |
| **采购交通费** | 采购单 expenses | `transportationFee` | 采购交通费 |
| **采购招待费** | 采购单 expenses | `entertainmentFee` | 采购招待费 |
| **采购礼品费** | 采购单 expenses | `giftFee` | 采购礼品费 |
| **采购其他费** | 采购单 expenses | `otherFee` | 采购其他费用 |
| **采购费用小计** | 计算 | — | 交通费+招待费+礼品费+采购其他费 |
| **费用合计** | 计算 | — | 入库费用小计+采购费用小计 |
| **入库人** | 入库单 | `warehousing_person` | 入库经办人 |
| **备注** | 入库单 | `remarks` | 入库单备注 |

### 3.2 展示逻辑说明

- **粒度**：每一行对应一个入库单中的一个商品明细项，即**一入库单×N商品 = N行**
- **费用列**：入库费用和采购费用属于单据级别，同一入库单的所有商品行共享相同的费用值
- **无关联采购单**：采购费用相关列显示为 0 或 `—`
- **汇总行**：表格底部显示所有费用的合计

## 四、查询筛选条件

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 起始日期 | DatePicker | 入库时间范围（开始） |
| 结束日期 | DatePicker | 入库时间范围（结束） |
| 入库单号 | Input | 模糊搜索 |
| 采购订单号 | Input | 模糊搜索 |
| 商品名称/编码 | Input | 模糊搜索 |

## 五、技术实现方案

### 5.1 后端

#### 5.1.1 新建 Controller

**文件**: `server/controllers/warehousingExpenseReportController.js`

```javascript
// 核心逻辑
export const getWarehousingExpenseReport = async (req, res) => {
  // 1. 查询入库单（支持日期范围、入库单号、采购订单号筛选）
  // 2. 遍历入库单，解析 warehousing_items JSON
  // 3. 对于有 purchase_order_number 的入库单，批量查询关联采购订单
  // 4. 组装报表数据：每个 warehousing_item 生成一行
  // 5. 返回结果
}
```

**关键实现细节**：
- 使用 `JSON_TABLE` 或应用层解析 `warehousing_items` JSON 数组，将每个商品展开为独立行
- 批量查询采购订单以避免 N+1 问题（收集所有 `purchase_order_number`，一次性查询）
- 应用层计算费用小计和费用合计

#### 5.1.2 新建 Route

**文件**: `server/routes/warehousingExpenseReportRoutes.js`

```javascript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getWarehousingExpenseReport } from '../controllers/warehousingExpenseReportController.js';

const router = Router();
router.get('/', authMiddleware, getWarehousingExpenseReport);
export default router;
```

#### 5.1.3 注册路由

**文件**: `server/index.js`

```javascript
import warehousingExpenseReportRoutes from './routes/warehousingExpenseReportRoutes.js';
// ...
app.use('/api/warehousing-expense-report', warehousingExpenseReportRoutes);
```

### 5.2 前端

#### 5.2.1 新建 API 文件

**文件**: `src/api/warehousingExpenseReport.ts`

```typescript
import request from './request';

export interface WarehousingExpenseReportParams {
  startDate?: string;
  endDate?: string;
  orderNumber?: string;
  purchaseOrderNumber?: string;
  productKeyword?: string;
}

export interface WarehousingExpenseReportItem {
  // 入库单信息
  warehousing_order_id: string;
  order_number: string;
  warehousing_time: string;
  purchase_order_number: string | null;
  currency: string;
  remarks: string;
  // 商品信息
  product_code: string;
  product_name: string;
  model: string;
  unit: string;
  quantity: number;
  tax_included_price: number;
  total_price: number;
  // 入库费用
  express_delivery_fee: number;
  transportation_fee: number;
  customs_fee: number;
  warehousing_other_fee: number;
  warehousing_expense_subtotal: number;
  // 采购费用
  purchase_transportation_fee: number;
  purchase_entertainment_fee: number;
  purchase_gift_fee: number;
  purchase_other_fee: number;
  purchase_expense_subtotal: number;
  // 费用合计
  total_expenses: number;
  // 入库人
  warehousing_person: string;
}

export const warehousingExpenseReportApi = {
  getReport: (params: WarehousingExpenseReportParams) =>
    request.get<WarehousingExpenseReportItem[]>('/warehousing-expense-report', { params }),
};
```

#### 5.2.2 新建报表视图

**文件**: `src/views/reports/WarehousingExpenseReport.vue`

参照现有 `InventoryReport.vue` 的结构，包含：
- 搜索区域：日期范围选择器 + 关键字搜索
- 数据表格：`a-table` 展示所有列
- 底部汇总行：显示各项费用合计
- 导出功能（可选）

#### 5.2.3 注册路由

**文件**: `src/router/index.ts`

在 `InventoryReport` 路由旁添加：

```typescript
{
  path: 'warehousing-expense-report',
  name: 'WarehousingExpenseReport',
  component: () => import('@/views/reports/WarehousingExpenseReport.vue'),
  meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
}
```

#### 5.2.4 添加菜单项

**文件**: `src/layouts/DefaultLayout.vue`

在 Reports 子菜单中添加：

```vue
<a-menu-item key="WarehousingExpenseReport">
  <router-link to="/warehousing-expense-report">入库费用明细表</router-link>
</a-menu-item>
```

#### 5.2.5 添加国际化 key（如有 i18n）

当前项目未使用 i18n，直接使用中文即可。

## 六、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `server/controllers/warehousingExpenseReportController.js` | 后端报表控制器 |
| **新建** | `server/routes/warehousingExpenseReportRoutes.js` | 后端路由 |
| **修改** | `server/index.js` | 注册新路由 |
| **新建** | `src/api/warehousingExpenseReport.ts` | 前端 API |
| **新建** | `src/views/reports/WarehousingExpenseReport.vue` | 报表视图组件 |
| **修改** | `src/router/index.ts` | 添加路由配置 |
| **修改** | `src/layouts/DefaultLayout.vue` | 添加菜单项 |

## 七、注意事项

1. **费用结构差异**：入库单的 `WarehousingExpenses`（快递费/运杂费/报关费/其他）与采购订单的 `Expenses`（交通费/招待费/礼品费/其他）结构不同，前端展示时需明确区分
2. **JSON 解析**：`warehousing_items` 和 `expenses` 在数据库中存储为 JSON 字符串，后端需要 `JSON.parse()` 后再组装
3. **无关联采购单**：入库单的 `purchase_order_number` 可为 null，此时采购费用列应显示为 0
4. **数据一致性**：采购订单的 `expenses` 可能在入库后被修改，报表展示的是查询时刻的最新值
5. **性能考虑**：如果入库数据量大，后端应考虑分页或限制日期范围

## 八、后续可扩展

- 添加费用明细的导出功能（Excel/CSV）
- 添加费用趋势图表
- 按供应商/商品维度的费用汇总分析
- 与出库费用明细表（基于出库单+销售订单）形成对照
