# 采购订单功能实现规划

## 一、需求概述

基于 `.function/purchase.md` 中的需求，重新开发采购订单核心功能，支持多商品采购订单管理。

### 核心功能
- 新增采购订单
- 查询采购订单（支持供应商名称、供应商代码、报价单号、报价单生成日期查询，默认按日期排序）
- 更新采购订单
- 删除采购订单

### 订单编号格式
`XSD-P + 日期(YYYYMMDD) + 5位随机数字`

## 二、数据模型改造

### 2.1 数据库表结构 (server/models/PurchaseOrder.js)

当前问题：现有模型只支持单个商品，需要改造为支持多商品数组。

**需要修改的字段：**
```javascript
{
  purchase_order_id: string,           // 主键 UUID
  order_number: string,                // 订单编号 XSD-P-2026050912345
  contract_number: string,             // 采购合同编号
  supplier_name: string,               // 供应商名称
  supplier_code: string,               // 供应商代码
  purchase_items: JSON,                // 采购商品内容（JSON字符串）
  currency: string,                    // 币种
  exchange_rate: number,               // 汇率
  delivery_date: string,               // 发货日期
  arrival_date: string,                // 到货日期
  status: number,                      // 采购订单状态 1:采购中 2:已到货
  remarks: string,                     // 备注
  created_at: string,
  updated_at: string
}
```

**移除的字段：**
- payment_method (根据需求文档中未提及)
- business_category, product_name, model, description, product_code, unit, quantity, tax_included_price, tax_rate, tax_excluded_price, tax_included_amount, tax_excluded_amount, tax_amount
- is_returned (用 status 替代)

### 2.2 采购商品项结构 (PurchaseItem)

```typescript
interface PurchaseItem {
  no: number,              // 编号
  business_category: string,  // 业务分类
  product_name: string,       // 产品名称
  product_code: string,       // 产品代码
  model?: string,            // 规格型号
  description?: string,      // 规格描述
  unit?: string,             // 单位
  quantity: number,          // 数量
  tax_rate: number,          // 税率（%）
  tax_included_price: number,    // 含税单价
  tax_excluded_price: number,    // 未税单价
  tax_included_amount: number,   // 含税金额
  tax_excluded_amount: number,   // 未税金额
  tax_amount: number,            // 税额
  status: number,            // 状态
  remarks?: string,          // 备注
  total_price?: number       // 总价
}
```

## 三、后端改造

### 3.1 改造 server/models/PurchaseOrder.js

**改动点：**
1. 修改 `generateOrderNumber()` 方法，生成 5 位随机数字
2. 修改 `create()` 方法，处理 purchase_items 数组
3. 添加自动计算逻辑：
   - 未税单价 = 含税单价 / (1 + 税率)
   - 含税金额 = 数量 × 含税单价
   - 未税金额 = 数量 × 未税单价
   - 税额 = 含税金额 × 税率
   - 总价 = 含税金额

### 3.2 改造 server/controllers/purchaseOrderController.js

**改动点：**
1. `getAllPurchaseOrders` - 修改查询参数，支持新的查询条件
2. `createPurchaseOrder` - 修改为处理 purchase_items 数组
3. `updatePurchaseOrder` - 修改为更新 purchase_items 数组
4. 移除 `returnPurchaseOrder` (改为通过 status 更新)

### 3.3 改造 server/routes/purchaseOrderRoutes.js

**改动点：**
1. 移除 `POST /:id/return` 路由
2. 添加 `PUT /:id/status` 路由用于更新状态

## 四、前端类型定义 (src/types/index.ts)

### 4.1 更新 PurchaseOrder 接口

```typescript
export interface PurchaseOrder {
  purchase_order_id: string
  order_number: string
  contract_number?: string
  supplier_name: string
  supplier_code: string
  purchase_items: string          // JSON 字符串
  currency: string
  exchange_rate: number
  delivery_date?: string
  arrival_date?: string
  status: 1 | 2                   // 1: 采购中, 2: 已到货
  remarks?: string
  created_at: string
  updated_at: string
}
```

### 4.2 新增 PurchaseItem 接口

```typescript
export interface PurchaseItem {
  no: number
  business_category: string
  product_name: string
  product_code: string
  model?: string
  description?: string
  unit?: string
  quantity: number
  tax_rate: number
  tax_included_price: number
  tax_excluded_price: number
  tax_included_amount: number
  tax_excluded_amount: number
  tax_amount: number
  status: number
  remarks?: string
  total_price?: number
}
```

### 4.3 更新请求接口

```typescript
export interface CreatePurchaseOrderRequest {
  contract_number?: string
  supplier_name: string
  supplier_code: string
  purchase_items: PurchaseItem[]
  currency?: string
  exchange_rate?: number
  delivery_date?: string
  arrival_date?: string
  remarks?: string
}

export interface UpdatePurchaseOrderRequest extends Partial<CreatePurchaseOrderRequest> {}
```

## 五、前端 API 改造 (src/api/purchaseOrders.ts)

**改动点：**
1. `getNewOrderNumber` - 返回新的订单编号格式

## 六、前端组件改造

### 6.1 改造 src/components/PurchaseOrderForm.vue

**当前问题：**
- 使用了错误的 API (salesOrdersApi)
- 使用了错误的字段名 (customer_name 应为 supplier_name)
- 缺少汇率字段
- 到货日期绑定错误（绑定到了 delivery_date）
- 缺少结算方式选择（虽然需求中未提及，但现有代码中有）

**需要改造：**
1. 修改 API 调用为 `purchaseOrdersApi`
2. 修改字段名：
   - `customer_name` → `supplier_name`
   - `customer_code` → `supplier_code`
   - `customerOptions` → `supplierOptions`
3. 修改 API 导入：`customersApi` → `suppliersApi`
4. 添加汇率字段
5. 修复到货日期绑定
6. 修改订单编号生成逻辑
7. 修改提交逻辑以支持新的数据结构
8. 添加业务分类选择（当前有，但需要确认是否保留）
9. 移除结算方式（需求中未提及）

**表单布局：**
```
第一行：
  - 默认单据编号（只读）
  - 采购合同编号（输入）

第二行：
  - 供应商名称（下拉选择）
  - （移除结算方式，需求中未提及）

采购商品内容表（可编辑表格）：
  - 编号
  - 业务分类
  - 产品名称
  - 产品代码
  - 规格型号
  - 规格描述
  - 单位
  - 数量
  - 税率
  - 含税单价
  - 未税单价（自动计算）
  - 含税金额（自动计算）
  - 未税金额（自动计算）
  - 税额（自动计算）
  - 状态
  - 备注
  - 总价（自动计算）
  - 操作（删除行）

表尾：
  - 含税总价（所有行总价之和）
  - 追加行按钮

其他内容第一行：
  - 币种
  - 汇率

其他内容第二行：
  - 发货日期
  - 到货日期

其他内容第三行：
  - 备注

底部按钮：
  - 保存
  - 取消
```

### 6.2 改造 src/views/purchase/PurchaseOrders.vue

**改动点：**
1. 修改列表显示逻辑，解析 purchase_items JSON
2. 添加状态显示（采购中/已到货）
3. 修改操作按钮（移除退货按钮，改为状态更新）
4. 更新查询参数

## 七、数据库迁移

### 7.1 迁移脚本

需要创建迁移脚本来：
1. 添加 `purchase_items` 字段
2. 移除单个商品相关字段
3. 添加 `status` 字段
4. 数据迁移：将现有单商品数据转换为数组格式

## 八、实现步骤

### 阶段一：数据模型改造（后端优先）

1. **改造 BaseModel 和 PurchaseOrder 模型**
   - 修改 `server/models/PurchaseOrder.js`
   - 更新 `generateOrderNumber()` 方法
   - 更新 `create()` 方法处理数组

2. **改造控制器**
   - 修改 `server/controllers/purchaseOrderController.js`
   - 更新所有 CRUD 方法

3. **改造路由**
   - 修改 `server/routes/purchaseOrderRoutes.js`

4. **数据库迁移**
   - 创建迁移脚本
   - 执行迁移

### 阶段二：前端类型和 API

1. **更新类型定义**
   - 修改 `src/types/index.ts`

2. **更新 API**
   - 修改 `src/api/purchaseOrders.ts`

### 阶段三：前端组件改造

1. **改造表单组件**
   - 修改 `src/components/PurchaseOrderForm.vue`
   - 修复所有字段绑定和 API 调用

2. **改造列表组件**
   - 修改 `src/views/purchase/PurchaseOrders.vue`
   - 更新列表显示和操作逻辑

### 阶段四：测试和优化

1. **功能测试**
   - 测试新增采购订单
   - 测试编辑采购订单
   - 测试删除采购订单
   - 测试查询功能
   - 测试状态更新

2. **性能优化**
   - 考虑大量商品时的分页加载
   - 考虑表格渲染性能优化

3. **代码审查**
   - 检查 ESLint 规范
   - 检查 Prettier 格式

## 九、性能优化建议

### 9.1 数据库层面
1. 为 `supplier_name`, `supplier_code`, `order_number` 添加索引
2. 为 `created_at` 添加索引以支持按日期排序
3. 考虑对 `purchase_items` 字段的查询优化（如果需要）

### 9.2 前端层面
1. 使用虚拟滚动处理大量商品行
2. 防抖处理搜索输入
3. 懒加载下拉选项数据

### 9.3 计算优化
1. 商品价格计算在前端和后端都进行，前端提供实时反馈，后端做最终验证
2. 考虑使用 Web Worker 处理大量数据的计算

## 十、注意事项

1. **向后兼容性**：现有数据需要迁移，确保不会丢失数据
2. **数据验证**：前后端都需要验证必填字段和数据格式
3. **错误处理**：完善错误提示和异常处理
4. **权限控制**：确保只有有权限的用户可以操作采购订单
5. **代码规范**：遵循 ESLint 和 Prettier 规范

## 十一、依赖关系

- 供应商管理模块（suppliers）- 必须先完成
- 产品管理模块（products）- 必须先完成
- 业务分类模块（businessCategories）- 必须先完成
- 支付方式模块（paymentMethods）- 根据需求可能不需要

## 十二、预期产出

1. **后端文件**
   - `server/models/PurchaseOrder.js` (已存在，需改造)
   - `server/controllers/purchaseOrderController.js` (已存在，需改造)
   - `server/routes/purchaseOrderRoutes.js` (已存在，需改造)
   - `server/migrations/xxxx_purchase_orders_refactor.js` (新建)

2. **前端文件**
   - `src/types/index.ts` (已存在，需更新)
   - `src/api/purchaseOrders.ts` (已存在，需更新)
   - `src/components/PurchaseOrderForm.vue` (已存在，需改造)
   - `src/views/purchase/PurchaseOrders.vue` (已存在，需更新)

3. **文档**
   - API 文档更新
   - 数据库结构文档
