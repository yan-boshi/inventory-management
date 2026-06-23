# 暂存功能实现规划

## 功能概述

为新增销售订单、新增采购订单、新增入库单、新增出库单四个表单增加暂存功能，使用浏览器 localStorage 存储表单数据，用户可随时暂存当前填写内容，下次打开时恢复。

## 一、设计思路

### 核心流程
1. 用户打开新增订单表单，填写部分内容
2. 点击"暂存"按钮 → 将当前表单数据保存到 localStorage
3. 关闭表单后再次打开 → 检测到暂存数据，提示"是否恢复暂存内容？"
4. 用户选择恢复 → 填充暂存数据到表单
5. 用户选择不恢复 → 清除暂存数据，打开空白表单
6. 用户正常提交订单 → 自动清除对应暂存数据

### 存储 Key 设计
| 表单 | localStorage Key |
|------|-----------------|
| 销售订单 | `draft_sales_order` |
| 采购订单 | `draft_purchase_order` |
| 入库单 | `draft_warehousing_order` |
| 出库单 | `draft_delivery_order` |

### 存储数据结构
```json
{
  "data": { ...表单所有字段 },
  "timestamp": 1718520000000,
  "summary": "客户名称 / 供应商名称 - 商品数量"
}
```
- `data`：表单快照（所有 reactive 字段的值）
- `timestamp`：保存时间戳，用于显示"X分钟前暂存"
- `summary`：简要描述，用于提示用户暂存内容

## 二、工具函数

### 新增文件：`src/utils/draft.ts`

```typescript
const DRAFT_PREFIX = 'draft_'

// 保存暂存
export function saveDraft(key: string, data: any, summary: string): void

// 读取暂存
export function loadDraft(key: string): { data: any; timestamp: number; summary: string } | null

// 清除暂存
export function clearDraft(key: string): void

// 检查是否有暂存
export function hasDraft(key: string): boolean

// 格式化暂存时间
export function formatDraftTime(timestamp: number): string
// 返回 "刚刚" / "5分钟前" / "2小时前" / "昨天" 等
```

## 三、表单改动

### 3.1 通用改动模式（四个表单一致）

**1. 弹窗按钮区域增加"暂存"按钮**
```
<template #footer>
  <a-button @click="handleCancel">取消</a-button>
  <a-button @click="handleSaveDraft">暂存</a-button>
  <a-button type="primary" @click="handleSubmit">创建</a-button>
</template>
```

**2. 打开表单时检查暂存**
- 在 `watch(visible)` 中，当 `visible=true` 且 `!isEdit` 时，检查是否有暂存数据
- 如果有，弹出确认框：`检测到上次暂存的内容（客户：XXX，3个商品，暂存于5分钟前），是否恢复？`
- 用户确认 → 填充暂存数据到表单
- 用户取消 → 清除暂存数据，正常打开空白表单

**3. 暂存按钮逻辑**
- 不做任何验证（允许不完整数据）
- 收集当前表单所有字段值
- 生成摘要信息（客户/供应商名称 + 商品数量）
- 调用 `saveDraft()` 保存到 localStorage
- 提示"暂存成功"，不关闭弹窗

**4. 提交成功后清除暂存**
- 在 `handleSubmit` 成功后，调用 `clearDraft()` 清除对应暂存数据

**5. 关闭弹窗时的行为**
- 正常关闭（点击取消/X）：不自动清除暂存（用户可能稍后恢复）
- 提交成功：自动清除暂存

### 3.2 各表单具体改动

#### SalesOrderForm.vue
- 暂存 key：`draft_sales_order`
- 暂存字段：`order_number`, `contract_number`, `customer_name`, `customer_code`, `payment_method`, `items`(数组), `currency`, `delivery_date`, `expenses`, `remarks`
- 摘要格式：`{customer_name} - {items.length}个商品`
- 恢复时需要处理 items 数组中 computed 字段的重新计算

#### PurchaseOrderForm.vue
- 暂存 key：`draft_purchase_order`
- 暂存字段：`order_number`, `contract_number`, `supplier_name`, `supplier_code`, `items`(数组), `currency`, `exchange_rate`, `delivery_date`, `arrival_date`, `expenses`, `remarks`
- 摘要格式：`{supplier_name} - {items.length}个商品`

#### WarehousingOrderForm.vue
- 暂存 key：`draft_warehousing_order`
- 暂存字段：`order_number`, `purchase_order_number`, `customer_name`, `customer_address`, `items`(数组), `total_amount`, `currency`, `warehousing_time`, `expenses`, `warehousing_person`, `contact_phone`, `remarks`
- 摘要格式：`{customer_name} - {items.length}个商品`

#### DeliveryOrderForm.vue
- 暂存 key：`draft_delivery_order`
- 暂存字段：`order_number`, `sales_order_number`, `customer_name`, `customer_address`, `items`(数组), `total_amount`, `currency`, `delivery_time`, `delivery_date`, `expenses`, `remarks`
- 摘要格式：`{customer_name} - {items.length}个商品`

## 四、实现步骤

1. 创建 `src/utils/draft.ts` 工具函数
2. 改造 `SalesOrderForm.vue` — 增加暂存/恢复逻辑
3. 改造 `PurchaseOrderForm.vue` — 增加暂存/恢复逻辑
4. 改造 `WarehousingOrderForm.vue` — 增加暂存/恢复逻辑
5. 改造 `DeliveryOrderForm.vue` — 增加暂存/恢复逻辑
6. 构建验证

## 五、文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/utils/draft.ts` | 新增 | 暂存工具函数 |
| `src/components/SalesOrderForm.vue` | 修改 | 增加暂存/恢复逻辑 |
| `src/components/PurchaseOrderForm.vue` | 修改 | 增加暂存/恢复逻辑 |
| `src/components/WarehousingOrderForm.vue` | 修改 | 增加暂存/恢复逻辑 |
| `src/components/DeliveryOrderForm.vue` | 修改 | 增加暂存/恢复逻辑 |

## 六、注意事项

1. **编辑模式不暂存**：仅在新增（`!isEdit`）时启用暂存功能，编辑已有订单不暂存
2. **暂存不做验证**：允许保存不完整的表单数据
3. **自动计算字段**：恢复暂存时，需要重新触发 computed 字段的计算（如含税金额、未税金额等）
4. **localStorage 容量**：单个 key 约 5MB，订单数据量远小于此，无需担心
5. **跨标签页**：localStorage 同源共享，多个标签页操作同一 key 可能覆盖，但实际使用场景影响极小
