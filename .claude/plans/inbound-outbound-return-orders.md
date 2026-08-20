# 入库退货单 & 出库退货单功能实现方案

## 概述

在库存管理模块中新增**入库退货单**和**出库退货单**功能，支持从入库单/出库单发起退货，退货数据独立存储。

---

## 一、数据库设计

### 1.1 入库退货单表 `inbound_return_orders`

| 字段 | 类型 | 说明 |
|------|------|------|
| `inbound_return_id` | VARCHAR(36) | 主键 UUID |
| `order_number` | VARCHAR(50) | 自动生成，格式 `XSD-IR-YYMMDD-NNN` |
| `source_order_id` | VARCHAR(36) | 来源入库单ID |
| `source_order_number` | VARCHAR(50) | 来源入库单单号 |
| `contract_number` | VARCHAR(50) | 关联采购合同编号 |
| `supplier_name` | VARCHAR(200) | 供应商名称 |
| `supplier_code` | VARCHAR(50) | 供应商代码 |
| `return_items` | TEXT | 退货商品明细 JSON |
| `total_amount` | DECIMAL(15,2) | 退货总金额 |
| `return_time` | DATETIME | 退货时间 |
| `entry_date` | DATE | 录入日期 |
| `currency` | VARCHAR(10) | 币种，默认 CNY |
| `return_person` | VARCHAR(50) | 退货操作人 |
| `reason` | TEXT | 退货原因 |
| `remarks` | TEXT | 备注 |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### 1.2 出库退货单表 `outbound_return_orders`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outbound_return_id` | VARCHAR(36) | 主键 UUID |
| `order_number` | VARCHAR(50) | 自动生成，格式 `XSD-OR-YYMMDD-NNN` |
| `source_order_id` | VARCHAR(36) | 来源出库单ID |
| `source_order_number` | VARCHAR(50) | 来源出库单单号 |
| `contract_number` | VARCHAR(50) | 关联销售合同编号 |
| `customer_name` | VARCHAR(200) | 客户名称 |
| `customer_code` | VARCHAR(50) | 客户代码 |
| `return_items` | TEXT | 退货商品明细 JSON |
| `total_amount` | DECIMAL(15,2) | 退货总金额 |
| `return_time` | DATETIME | 退货时间 |
| `entry_date` | DATE | 录入日期 |
| `currency` | VARCHAR(10) | 币种，默认 CNY |
| `return_person` | VARCHAR(50) | 退货操作人 |
| `reason` | TEXT | 退货原因 |
| `remarks` | TEXT | 备注 |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### 1.3 退货商品明细 JSON 结构

```json
[{
  "no": 1,
  "product_code": "P001",
  "product_name": "产品A",
  "model": "型号1",
  "description": "描述",
  "unit": "个",
  "quantity": 5,
  "original_quantity": 100,
  "tax_included_price": 10.00,
  "tax_rate": 13,
  "total_price": 50.00,
  "remarks": ""
}]
```

---

## 二、后端实现

### 2.1 数据库迁移

创建迁移文件 `server/migrations/20260815_create_return_orders_tables.js`，创建上述两张表。

### 2.2 Model 层

创建两个模型，继承 BaseModel：

**`server/models/InboundReturnOrder.js`**
- 表名 `inbound_return_orders`，主键 `inbound_return_id`
- `generateOrderNumber()` - 生成 `XSD-IR-YYMMDD-NNN` 格式单号
- `calculateTotal(items)` - 计算退货总金额
- `create(data)` / `update(id, data)` - 处理 JSON 序列化

**`server/models/OutboundReturnOrder.js`**
- 表名 `outbound_return_orders`，主键 `outbound_return_id`
- `generateOrderNumber()` - 生成 `XSD-OR-YYMMDD-NNN` 格式单号
- 其余同上

### 2.3 Controller 层

**`server/controllers/inboundReturnController.js`**

| 方法 | 说明 | 业务逻辑 |
|------|------|----------|
| `getAllInboundReturns` | 分页查询 | 支持按单号、供应商、合同号筛选 |
| `getInboundReturnById` | 查单条 | - |
| `createInboundReturn` | 创建退货单 | 1. 校验退货数量 ≤ 原入库数量<br>2. 扣减产品库存（减库存）<br>3. 回退采购单入库数量<br>4. 删除关联应付账款 |
| `updateInboundReturn` | 更新退货单 | 计算数量差值，调整库存 |
| `deleteInboundReturn` | 删除退货单 | 1. 恢复产品库存<br>2. 恢复采购单入库数量<br>3. 重建应付账款 |
| `getNewOrderNumber` | 获取新单号 | - |

**`server/controllers/outboundReturnController.js`**

| 方法 | 说明 | 业务逻辑 |
|------|------|----------|
| `getAllOutboundReturns` | 分页查询 | 支持按单号、客户、合同号筛选 |
| `getOutboundReturnById` | 查单条 | - |
| `createOutboundReturn` | 创建退货单 | 1. 校验退货数量 ≤ 原出库数量<br>2. 增加产品库存（加库存）<br>3. 回退销售单出库数量<br>4. 删除关联应收账款 |
| `updateOutboundReturn` | 更新退货单 | 计算数量差值，调整库存 |
| `deleteOutboundReturn` | 删除退货单 | 1. 扣减产品库存<br>2. 恢复销售单出库数量<br>3. 重建应收账款 |
| `getNewOrderNumber` | 获取新单号 | - |

### 2.4 Routes 层

**`server/routes/inboundReturnRoutes.js`**

```
GET    /                        → getAllInboundReturns
GET    /new-order-number        → getNewOrderNumber
GET    /:id                     → getInboundReturnById
POST   /                        → createInboundReturn
PUT    /:id                     → updateInboundReturn
DELETE /:id                     → deleteInboundReturn
```

**`server/routes/outboundReturnRoutes.js`**

```
GET    /                        → getAllOutboundReturns
GET    /new-order-number        → getNewOrderNumber
GET    /:id                     → getOutboundReturnById
POST   /                        → createOutboundReturn
PUT    /:id                     → updateOutboundReturn
DELETE /:id                     → deleteOutboundReturn
```

### 2.5 注册路由

在 `server/index.js` 中注册：
```js
import inboundReturnRoutes from './routes/inboundReturnRoutes.js'
import outboundReturnRoutes from './routes/outboundReturnRoutes.js'

app.use('/api/inbound-returns', inboundReturnRoutes)
app.use('/api/outbound-returns', outboundReturnRoutes)
```

---

## 三、前端实现

### 3.1 TypeScript 类型定义

在 `src/types/index.ts` 中添加：

```typescript
// 入库退货单
export interface InboundReturnItem {
  no: number
  product_code: string
  product_name: string
  model?: string
  description?: string
  unit?: string
  quantity: number
  original_quantity?: number
  tax_included_price?: number
  tax_rate?: number
  total_price?: number
  remarks?: string
}

export interface InboundReturnOrder {
  inbound_return_id: string
  order_number: string
  source_order_id?: string
  source_order_number?: string
  contract_number?: string
  supplier_name?: string
  supplier_code?: string
  return_items: string
  total_amount: number
  return_time: string
  entry_date?: string
  currency: string
  return_person?: string
  reason?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface CreateInboundReturnRequest {
  source_order_id?: string
  source_order_number?: string
  contract_number?: string
  supplier_name?: string
  supplier_code?: string
  return_items?: InboundReturnItem[]
  total_amount?: number
  return_time?: string
  entry_date?: string
  currency?: string
  return_person?: string
  reason?: string
  remarks?: string
}

export interface InboundReturnQueryParams {
  page?: number
  pageSize?: number
  orderNumber?: string
  contractNumber?: string
  supplierName?: string
  startDate?: string
  endDate?: string
}

// 出库退货单（类似结构，字段替换为 customer 相关）
export interface OutboundReturnItem { /* 同 InboundReturnItem */ }
export interface OutboundReturnOrder { /* 字段替换为 outbound_return_id, customer_* */ }
export interface CreateOutboundReturnRequest { /* 字段替换为 customer_* */ }
export interface OutboundReturnQueryParams { /* 字段替换为 customerName */ }
```

### 3.2 API 层

**`src/api/inboundReturns.ts`**
- `getAll(params)` - 分页查询
- `getById(id)` - 查单条
- `create(data)` - 创建
- `update(id, data)` - 更新
- `delete(id)` - 删除
- `getNewOrderNumber()` - 获取新单号

**`src/api/outboundReturns.ts`** - 同上结构

### 3.3 退货单表单组件

**`src/components/InboundReturnForm.vue`**

弹窗表单，宽度 85%，包含：
- **头部**：退货单号（自动生成）、来源入库单号、采购合同号、供应商名称
- **商品明细表**：
  - 从来源入库单自动填充商品行
  - 列：序号、产品代码、产品名称、型号、描述、单位、原入库数量、退货数量、含税单价、税率、金额、备注
  - 退货数量不能超过原入库数量
- **底部**：退货时间、录入日期、退货原因（textarea）、备注、总金额
- **按钮**：取消、保存

**`src/components/OutboundReturnForm.vue`** - 同上结构，字段替换为出库单/客户相关

### 3.4 入库单/出库单列表添加退货按钮

**修改 `src/views/warehousing/WarehousingOrders.vue`**
- 在操作列添加「退货」按钮
- 点击后打开 `InboundReturnForm`，传入当前入库单数据作为来源
- 退货按钮仅在入库单状态为「已全部入库」或「已部分入库」时可用

**修改 `src/views/delivery/DeliveryOrders.vue`**
- 在操作列添加「退货」按钮
- 点击后打开 `OutboundReturnForm`，传入当前出库单数据作为来源

### 3.5 退货单列表页面（可选，后续扩展）

如需独立查看退货单列表：
- `src/views/warehousing/InboundReturns.vue`
- `src/views/delivery/OutboundReturns.vue`

在侧边栏导航中添加入口。

---

## 四、实现步骤

### Phase 1: 数据库 & 后端
1. 创建数据库迁移文件
2. 创建 InboundReturnOrder / OutboundReturnOrder 模型
3. 创建 inboundReturnController / outboundReturnController
4. 创建路由文件并注册到 index.js

### Phase 2: 前端类型 & API
5. 在 types/index.ts 添加退货单相关类型
6. 创建 src/api/inboundReturns.ts
7. 创建 src/api/outboundReturns.ts

### Phase 3: 前端组件
8. 创建 InboundReturnForm.vue
9. 创建 OutboundReturnForm.vue
10. 修改 WarehousingOrders.vue 添加退货按钮
11. 修改 DeliveryOrders.vue 添加退货按钮

### Phase 4: 验证
12. 构建验证（npm run build）
