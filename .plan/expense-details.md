# 费用明细功能实现规划

## 一、目标

按照 `.function/expense-details.md` 规格，统一四种单据的费用类型：

| 单据类型 | 费用项目 |
|---------|---------|
| 销售订单 | 交通费、招待费、礼品费、其他 |
| 采购订单 | 交通费、招待费、礼品费、其他 |
| 入库单 | 快递费、运杂费、报关费、其他 |
| 出库单 | 快递费、运杂费、报关费、其他 |

## 二、现状分析

### 已完成
- ✅ 销售订单：费用字段已正确实现（交通费、招待费、礼品费、其他）
- ✅ 采购订单：费用字段已正确实现（交通费、招待费、礼品费、其他）
- ✅ 入库单表单：费用字段已正确实现（快递费、运杂费、报关费、其他）
- ✅ 出库单表单：费用字段已正确实现（快递费、运杂费、报关费、其他）

### 待修复问题

| # | 问题 | 影响范围 | 优先级 |
|---|------|---------|--------|
| 1 | `WarehousingExpenses` 类型接口使用中文键名，与表单实际使用的英文键名不一致 | 类型定义 | 中 |
| 2 | 销售/采购订单详情页费用显示为英文变量名（如 `transportationFee: ¥100`） | 用户体验 | 高 |
| 3 | 入库单详情页费用显示为英文变量名 | 用户体验 | 高 |
| 4 | 四个详情组件的费用显示方式不统一 | 代码一致性 | 中 |

## 三、实现方案

### 步骤 1：修复 `WarehousingExpenses` 类型定义

**文件**：`src/types/index.ts`

将中文键名改为英文键名，与表单实际使用一致：

```typescript
// 修改前
export interface WarehousingExpenses {
  快递费?: number
  运杂费?: number
  报关费?: number
  其他?: number
}

// 修改后
export interface WarehousingExpenses {
  expressDeliveryFee?: number   // 快递费
  transportationFee?: number    // 运杂费
  customsFee?: number           // 报关费
  otherFee?: number             // 其他
}
```

### 步骤 2：统一详情页费用显示

创建一个通用的费用显示工具函数，所有详情组件共用。

**新建文件**：`src/utils/expense.ts`

```typescript
// 费用键名到中文标签的映射
const EXPENSE_LABELS: Record<string, string> = {
  // 销售/采购费用
  transportationFee: '交通费',
  entertainmentFee: '招待费',
  giftFee: '礼品费',
  // 入库/出库费用（复用 transportationFee 表示运杂费）
  expressDeliveryFee: '快递费',
  customsFee: '报关费',
  // 通用
  otherFee: '其他',
}

/**
 * 解析费用 JSON 字符串
 */
export function parseExpenses(expenses: string | object | null | undefined): Record<string, number> {
  if (!expenses) return {}
  if (typeof expenses === 'string') {
    try {
      return JSON.parse(expenses)
    } catch {
      return {}
    }
  }
  return expenses as Record<string, number>
}

/**
 * 获取费用项的中文标签
 */
export function getExpenseLabel(key: string): string {
  return EXPENSE_LABELS[key] || key
}

/**
 * 获取有值的费用列表
 */
export function getValidExpenses(expenses: string | object | null | undefined): Array<{ key: string; label: string; value: number }> {
  const parsed = parseExpenses(expenses)
  return Object.entries(parsed)
    .filter(([, value]) => value && value > 0)
    .map(([key, value]) => ({
      key,
      label: getExpenseLabel(key),
      value,
    }))
}
```

### 步骤 3：更新详情组件

修改以下四个详情组件，使用统一的费用显示方式：

| 文件 | 修改内容 |
|------|---------|
| `src/components/SalesOrderDetail.vue` | 使用 `getValidExpenses()` 替代直接 `JSON.parse` |
| `src/components/PurchaseOrderDetail.vue` | 使用 `getValidExpenses()` 替代直接 `JSON.parse` |
| `src/components/WarehousingOrderDetail.vue` | 使用 `getValidExpenses()` 替代自定义 `getExpenses()` |
| `src/components/DeliveryOrderDetail.vue` | 使用 `getValidExpenses()` 替代 computed 属性 |

**统一显示模板**（以销售订单为例）：

```vue
<div style="grid-column: span 2;">
  <h4>费用登记</h4>
  <div v-if="getValidExpenses(order.expenses).length > 0"
       style="display: flex; gap: 20px; padding: 12px; background: #f5f7fa; border-radius: 4px;">
    <a-tag v-for="item in getValidExpenses(order.expenses)" :key="item.key" color="blue">
      {{ item.label }}: ¥{{ item.value.toFixed(2) }}
    </a-tag>
  </div>
  <span v-else style="color: #999;">无费用登记</span>
</div>
```

### 步骤 4：清理冗余类型定义（可选）

删除 `WarehousingExpenses` 和 `DeliveryExpenses` 接口，统一使用通用 `Expenses` 接口（需扩展字段）：

```typescript
// 统一费用接口
export interface Expenses {
  // 销售/采购费用
  transportationFee?: number    // 交通费
  entertainmentFee?: number     // 招待费
  giftFee?: number              // 礼品费
  // 入库/出库费用
  expressDeliveryFee?: number   // 快递费
  customsFee?: number           // 报关费
  // 通用
  otherFee?: number             // 其他
}
```

## 四、变更清单

| 序号 | 文件 | 操作 | 说明 |
|------|------|------|------|
| 1 | `src/types/index.ts` | 修改 | 修复 `WarehousingExpenses` 键名；可选合并为统一 `Expenses` |
| 2 | `src/utils/expense.ts` | 新建 | 通用费用解析和显示工具函数 |
| 3 | `src/components/SalesOrderDetail.vue` | 修改 | 使用 `getValidExpenses()` 显示费用 |
| 4 | `src/components/PurchaseOrderDetail.vue` | 修改 | 使用 `getValidExpenses()` 显示费用 |
| 5 | `src/components/WarehousingOrderDetail.vue` | 修改 | 使用 `getValidExpenses()` 显示费用 |
| 6 | `src/components/DeliveryOrderDetail.vue` | 修改 | 使用 `getValidExpenses()` 显示费用 |

## 五、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 修改 `WarehousingExpenses` 键名后，已有数据读取异常 | 入库单编辑时费用丢失 | 数据库中存储的 JSON 键名已经是英文（表单写入时用的英文），无需迁移 |
| 统一 `Expenses` 接口后，`DeliveryExpenses` 引用报错 | 编译错误 | 全局替换 `DeliveryExpenses` 为 `Expenses` |

## 六、验证方式

1. 运行 `npm run build` 确认无编译错误
2. 打开各单据详情页，确认费用显示为中文标签（如"交通费: ¥100"）
3. 新增/编辑各单据，确认费用保存和读取正常
