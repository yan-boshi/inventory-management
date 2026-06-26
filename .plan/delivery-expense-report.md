# 出库明细表 - 实现规划

## 一、需求概述

在报表中心新增一份**出库明细表**，将出库单的商品信息、出库费用、关联销售订单的销售费用登记以及出库人整合到一张报表中，方便财务和管理层进行费用核算与审计。

## 二、数据来源分析

### 2.1 出库单 (`delivery_orders`)

| 数据项 | 字段 | 说明 |
|--------|------|------|
| 出库单号 | `order_number` | 唯一标识 |
| 出库时间 | `delivery_time` | 时间筛选依据 |
| 出库人 | `delivery_person` | 出库经办人 |
| 销售订单号 | `sales_order_number` | 关联销售订单（可为空） |
| 币种 | `currency` | 默认 CNY |
| 出库商品信息 | `delivery_items` (JSON) | 包含 product_name, product_code, specification, unit, quantity, tax_included_price 等 |
| 出库费用 | `expenses` (JSON) | `DeliveryExpenses` 类型 |

**出库商品明细结构 (`DeliveryItem`)**：
```json
{
  "no": 1,
  "product_code": "P001",
  "product_name": "商品A",
  "specification": "规格描述",
  "unit": "个",
  "quantity": 10,
  "tax_included_price": 100.00
}
```

**出库费用结构 (`DeliveryExpenses`)**：
```json
{
  "expressDeliveryFee": 0,   // 快递费
  "transportationFee": 0,    // 运杂费
  "customsFee": 0,           // 报关费
  "otherFee": 0              // 其他费用
}
```

### 2.2 销售订单 (`sales_orders`)

通过出库单的 `sales_order_number` 关联查询。

| 数据项 | 字段 | 说明 |
|--------|------|------|
| 销售订单号 | `order_number` | 关联键 |
| 销售费用 | `expenses` (JSON) | `Expenses` 类型 |
| 销售人 | `sales_person` | 销售经办人（参考） |

**销售费用结构 (`Expenses`)**：
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
delivery_orders (出库单)
  ├── delivery_items (JSON)  → 商品明细
  ├── expenses (JSON)        → 出库费用
  ├── delivery_person        → 出库人
  └── sales_order_number     → 关联销售订单
                                    ├── expenses (JSON) → 销售费用登记
                                    └── sales_items (JSON) → 销售商品信息（参考）
```

## 三、报表字段设计

### 3.1 表格列定义

| 列名 | 数据来源 | 字段 | 说明 |
|------|----------|------|------|
| **出库单号** | 出库单 | `order_number` | 出库单编号 |
| **出库时间** | 出库单 | `delivery_time` | 出库日期 |
| **销售订单号** | 出库单 | `sales_order_number` | 关联的销售订单号（可能为空） |
| **客户名称** | 出库单 | `customer_name` | 收货客户 |
| **商品编码** | 出库单 items | `product_code` | 商品唯一编码 |
| **商品名称** | 出库单 items | `product_name` | 商品名称 |
| **规格型号** | 出库单 items | `specification` | 规格描述 |
| **单位** | 出库单 items | `unit` | 计量单位 |
| **出库数量** | 出库单 items | `quantity` | 出库数量 |
| **含税单价** | 出库单 items | `tax_included_price` | 含税单价 |
| **含税金额** | 出库单 items | `quantity × tax_included_price` | 含税总金额 |
| **快递费** | 出库单 expenses | `expressDeliveryFee` | 出库快递费 |
| **运杂费** | 出库单 expenses | `transportationFee` | 出库运杂费 |
| **报关费** | 出库单 expenses | `customsFee` | 出库报关费 |
| **出库其他费** | 出库单 expenses | `otherFee` | 出库其他费用 |
| **出库费用小计** | 计算 | — | 快递费+运杂费+报关费+出库其他费 |
| **销售交通费** | 销售单 expenses | `transportationFee` | 销售交通费 |
| **销售招待费** | 销售单 expenses | `entertainmentFee` | 销售招待费 |
| **销售礼品费** | 销售单 expenses | `giftFee` | 销售礼品费 |
| **销售其他费** | 销售单 expenses | `otherFee` | 销售其他费用 |
| **销售费用小计** | 计算 | — | 交通费+招待费+礼品费+销售其他费 |
| **费用合计** | 计算 | — | 出库费用小计+销售费用小计 |
| **出库人** | 出库单 | `delivery_person` | 出库经办人 |
| **备注** | 出库单 | `remarks` | 出库单备注 |

### 3.2 展示逻辑说明

- **粒度**：每一行对应一个出库单中的一个商品明细项，即**一出库单×N商品 = N行**
- **行合并**：同一出库单号的行，单据级字段（出库单号、出库时间、销售订单号、客户名称、所有费用列、出库人、备注）使用 `rowSpan` 合并显示
- **费用列**：出库费用和销售费用属于单据级别，同一出库单的所有商品行共享相同的费用值
- **无关联销售单**：销售费用相关列显示为 0 或 `—`
- **汇总行**：表格底部显示所有费用的合计

## 四、查询筛选条件

| 筛选项 | 类型 | 说明 |
|--------|------|------|
| 起始日期 | DatePicker | 出库时间范围（开始） |
| 结束日期 | DatePicker | 出库时间范围（结束） |
| 出库单号 | Input | 模糊搜索 |
| 销售订单号 | Input | 模糊搜索 |
| 商品名称/编码 | Input | 模糊搜索 |

## 五、技术实现方案

### 5.1 后端

#### 5.1.1 新建 Controller

**文件**: `server/controllers/deliveryExpenseReportController.js`

```javascript
// 核心逻辑（参考 warehousingExpenseReportController.js）
export const getDeliveryExpenseReport = async (req, res) => {
  // 1. 查询出库单（支持日期范围、出库单号、销售订单号筛选）
  // 2. 遍历出库单，解析 delivery_items JSON
  // 3. 对于有 sales_order_number 的出库单，批量查询关联销售订单
  // 4. 组装报表数据：每个 delivery_item 生成一行
  // 5. 返回结果
}
```

**关键实现细节**：
- 应用层解析 `delivery_items` JSON 数组，将每个商品展开为独立行
- 批量查询销售订单以避免 N+1 问题（收集所有 `sales_order_number`，一次性 `IN (?)` 查询）
- 应用层计算费用小计和费用合计
- 支持 `productKeyword` 对商品名称/编码进行模糊过滤

#### 5.1.2 新建 Route

**文件**: `server/routes/deliveryExpenseReportRoutes.js`

```javascript
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { getDeliveryExpenseReport } from '../controllers/deliveryExpenseReportController.js';

const router = Router();
router.get('/', authMiddleware, getDeliveryExpenseReport);
export default router;
```

#### 5.1.3 注册路由

**文件**: `server/index.js`

```javascript
import deliveryExpenseReportRoutes from './routes/deliveryExpenseReportRoutes.js';
// ...
app.use('/api/delivery-expense-report', deliveryExpenseReportRoutes);
```

### 5.2 前端

#### 5.2.1 类型定义

**文件**: `src/types/index.ts`

```typescript
export interface DeliveryExpenseReportParams {
  startDate?: string
  endDate?: string
  orderNumber?: string
  salesOrderNumber?: string
  productKeyword?: string
}

export interface DeliveryExpenseReportItem {
  // 出库单信息
  delivery_order_id: string
  order_number: string
  delivery_time: string
  sales_order_number: string
  customer_name: string
  currency: string
  remarks: string
  // 商品信息
  product_code: string
  product_name: string
  specification: string
  unit: string
  quantity: number
  tax_included_price: number
  total_price: number
  // 出库费用
  express_delivery_fee: number
  transportation_fee: number
  customs_fee: number
  delivery_other_fee: number
  delivery_expense_subtotal: number
  // 销售费用
  sales_transportation_fee: number
  sales_entertainment_fee: number
  sales_gift_fee: number
  sales_other_fee: number
  sales_expense_subtotal: number
  // 费用合计
  total_expenses: number
  // 出库人
  delivery_person: string
}
```

#### 5.2.2 新建 API 文件

**文件**: `src/api/deliveryExpenseReport.ts`

```typescript
import instance from '@/utils/request'
import type { DeliveryExpenseReportItem, DeliveryExpenseReportParams } from '@/types'

export const deliveryExpenseReportApi = {
  getReport: async (params: DeliveryExpenseReportParams) => {
    const response = await instance.get<{ success: boolean; data: DeliveryExpenseReportItem[] }>('/delivery-expense-report', { params })
    return response.data
  },
}
```

#### 5.2.3 新建报表视图

**文件**: `src/views/reports/DeliveryExpenseReport.vue`

参照现有 `WarehousingExpenseReport.vue` 的结构，包含：
- 搜索区域：日期范围选择器 + 出库单号/销售订单号/商品关键字搜索
- 数据表格：`a-table` 展示所有列，含表头分组（出库费用 / 销售费用）
- 行合并：同一出库单号的行使用 `customCell` + `rowSpan` 合并单据级列
- 底部汇总行：显示各项费用合计
- 客户名称列（入库明细表无此列，出库单有客户信息）

#### 5.2.4 注册路由

**文件**: `src/router/index.ts`

在 `WarehousingExpenseReport` 路由旁添加：

```typescript
{
  path: 'delivery-expense-report',
  name: 'DeliveryExpenseReport',
  component: () => import('@/views/reports/DeliveryExpenseReport.vue'),
  meta: { roles: ['normal', 'advanced', 'admin'] as UserRole[] }
}
```

#### 5.2.5 添加菜单项

**文件**: `src/layouts/DefaultLayout.vue`

在 Reports 子菜单中添加：

```vue
<a-menu-item key="DeliveryExpenseReport" @click="navigateTo('/delivery-expense-report')">
  出库明细表
</a-menu-item>
```

## 六、文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| **新建** | `server/controllers/deliveryExpenseReportController.js` | 后端报表控制器 |
| **新建** | `server/routes/deliveryExpenseReportRoutes.js` | 后端路由 |
| **修改** | `server/index.js` | 注册新路由 |
| **修改** | `src/types/index.ts` | 添加类型定义 |
| **新建** | `src/api/deliveryExpenseReport.ts` | 前端 API |
| **新建** | `src/views/reports/DeliveryExpenseReport.vue` | 报表视图组件 |
| **修改** | `src/router/index.ts` | 添加路由配置 |
| **修改** | `src/layouts/DefaultLayout.vue` | 添加菜单项 |

## 七、与入库明细表的差异对比

| 维度 | 入库明细表 | 出库明细表 |
|------|--------------|--------------|
| 主表 | `warehousing_orders` | `delivery_orders` |
| 关联表 | `purchase_orders`（采购订单） | `sales_orders`（销售订单） |
| 关联字段 | `purchase_order_number` | `sales_order_number` |
| 商品 JSON | `warehousing_items` | `delivery_items` |
| 商品字段 | product_name, model, unit, quantity, tax_included_price | product_name, specification, unit, quantity, tax_included_price |
| 主表费用类型 | `WarehousingExpenses`（快递费/运杂费/报关费/其他） | `DeliveryExpenses`（快递费/运杂费/报关费/其他） |
| 关联表费用类型 | `Expenses`（交通费/招待费/礼品费/其他） | `Expenses`（交通费/招待费/礼品费/其他） |
| 经办人 | `warehousing_person` | `delivery_person` |
| 额外信息 | 无 | `customer_name`（客户名称） |

## 八、注意事项

1. **费用结构差异**：出库单的 `DeliveryExpenses`（快递费/运杂费/报关费/其他）与销售订单的 `Expenses`（交通费/招待费/礼品费/其他）结构不同，前端展示时需明确区分
2. **JSON 解析**：`delivery_items` 和 `expenses` 在数据库中存储为 JSON 字符串，后端需要 `JSON.parse()` 后再组装
3. **无关联销售单**：出库单的 `sales_order_number` 可为 null，此时销售费用列应显示为 0
4. **数据一致性**：销售订单的 `expenses` 可能在出库后被修改，报表展示的是查询时刻的最新值
5. **商品字段差异**：出库单使用 `specification`（规格描述），入库单使用 `model`（规格型号），注意字段名不同
6. **客户信息**：出库单有 `customer_name`，可作为额外的筛选维度或展示列

## 九、后续可扩展

- 添加费用明细的导出功能（Excel/CSV）
- 添加费用趋势图表
- 按客户/商品维度的费用汇总分析
- 与入库明细表形成进销对照分析
