# 销售费用登记与采购费用登记功能实现规划

## 一、需求概述

为销售订单和采购订单新增费用登记功能，支持四种费用类型：交通费、招待费、礼品费、其他。

### 核心功能
- 销售订单：新增销售费用登记字段（JSON格式）
- 采购订单：新增采购费用登记字段（JSON格式）
- 前端表单：费用登记区域位于发货日期下方，四种费用水平排列
- 前端列表：费用登记信息在备注前显示

### 费用类型
1. 交通费
2. 招待费
3. 礼品费
4. 其他

### 数据格式
```json
{
  "交通费": 100,
  "招待费": 200,
  "礼品费": 300,
  "其他": 400
}
```

## 二、数据模型改造

### 2.1 销售订单表 (sales_orders)

**添加字段：**
```sql
expenses VARCHAR(1000) COMMENT '销售费用登记JSON字符串'
```

**字段说明：**
- 字段名：`expenses`
- 类型：VARCHAR(1000) 或 TEXT（考虑到JSON长度）
- 默认值：NULL
- 存储格式：JSON字符串

### 2.2 采购订单表 (purchase_orders)

**添加字段：**
```sql
expenses VARCHAR(1000) COMMENT '采购费用登记JSON字符串'
```

**字段说明：**
- 字段名：`expenses`
- 类型：VARCHAR(1000) 或 TEXT
- 默认值：NULL
- 存储格式：JSON字符串

### 2.3 TypeScript 类型定义

```typescript
// 费用登记类型
export interface Expenses {
  交通费?: number
  招待费?: number
  礼品费?: number
  其他?: number
}

// 销售订单更新接口
export interface UpdateSalesOrderRequest extends CreateSalesOrderRequest {
  expenses?: Expenses
}

// 采购订单更新接口
export interface UpdatePurchaseOrderRequest extends CreatePurchaseOrderRequest {
  expenses?: Expenses
}
```

## 三、后端改造

### 3.1 改造 server/models/SalesOrder.js

**改动点：**
1. `create()` 方法：添加 expenses 字段处理
2. `update()` 方法：添加 expenses 字段更新
3. `getAll()` 方法：保持不变（expenses 会自动返回）

```javascript
// create 方法示例
async create(data) {
  const { expenses, ...otherFields } = data
  const expensesJson = expenses ? JSON.stringify(expenses) : null
  // ... 其他逻辑
}

// update 方法示例
async update(id, data) {
  const { expenses, ...otherFields } = data
  const updateData = { ...otherFields }
  if (expenses !== undefined) {
    updateData.expenses = expenses ? JSON.stringify(expenses) : null
  }
  // ... 其他逻辑
}
```

### 3.2 改造 server/models/PurchaseOrder.js

**改动点：**
1. `create()` 方法：添加 expenses 字段处理
2. `update()` 方法：添加 expenses 字段更新

### 3.3 控制器层

**server/controllers/salesOrderController.js**
- `createSalesOrder`：接受 expenses 参数
- `updateSalesOrder`：接受 expenses 参数

**server/controllers/purchaseOrderController.js**
- `createPurchaseOrder`：接受 expenses 参数
- `updatePurchaseOrder`：接受 expenses 参数

### 3.4 路由层

无需修改，现有路由已支持新增字段的传递。

## 四、前端类型定义 (src/types/index.ts)

### 4.1 新增 Expenses 接口

```typescript
export interface Expenses {
  交通费?: number
  招待费?: number
  礼品费?: number
  其他?: number
}
```

### 4.2 更新销售订单接口

```typescript
export interface SalesOrder {
  // ... 现有字段
  expenses?: string // JSON字符串
}

export interface CreateSalesOrderRequest {
  // ... 现有字段
  expenses?: Expenses
}
```

### 4.3 更新采购订单接口

```typescript
export interface PurchaseOrder {
  // ... 现有字段
  expenses?: string // JSON字符串
}

export interface CreatePurchaseOrderRequest {
  // ... 现有字段
  expenses?: Expenses
}
```

## 五、前端组件改造

### 5.1 改造 src/components/SalesOrderForm.vue

**布局位置：** 发货日期下方

**表单结构：**
```vue
<!-- 费用登记区域 -->
<div class="expenses-section">
  <h4>销售费用登记</h4>
  <div class="expenses-row">
    <div class="expense-item">
      <label>交通费</label>
      <el-input-number v-model="form.expenses.交通费" :min="0" :precision="2" />
    </div>
    <div class="expense-item">
      <label>招待费</label>
      <el-input-number v-model="form.expenses.招待费" :min="0" :precision="2" />
    </div>
    <div class="expense-item">
      <label>礼品费</label>
      <el-input-number v-model="form.expenses.礼品费" :min="0" :precision="2" />
    </div>
    <div class="expense-item">
      <label>其他</label>
      <el-input-number v-model="form.expenses.其他" :min="0" :precision="2" />
    </div>
  </div>
</div>
```

**样式：**
```css
.expenses-section {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.expenses-row {
  display: flex;
  gap: 20px;
}

.expense-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

**表单初始化：**
```typescript
const form = reactive({
  // ... 其他字段
  expenses: {
    交通费: 0,
    招待费: 0,
    礼品费: 0,
    其他: 0
  }
})

// 编辑时解析 expenses
const loadOrder = async (id: string) => {
  const order = await salesOrdersApi.getById(id)
  // ... 其他字段赋值
  form.expenses = order.expenses ? JSON.parse(order.expenses) : {
    交通费: 0,
    招待费: 0,
    礼品费: 0,
    其他: 0
  }
}
```

### 5.2 改造 src/views/sale/SalesOrders.vue

**布局位置：** 备注前

**列表显示：**
```vue
<el-descriptions-item label="销售费用登记">
  <template v-if="row.expenses">
    <span v-for="(value, key) in JSON.parse(row.expenses)" :key="key" class="expense-tag">
      {{ key }}: ¥{{ value }}
    </span>
  </template>
  <span v-else>无</span>
</el-descriptions-item>
```

### 5.3 改造 src/components/PurchaseOrderForm.vue

**布局位置：** 发货日期下方

与销售订单表单类似，修改表单数据字段名和标题。

### 5.4 改造 src/views/purchase/PurchaseOrders.vue

**布局位置：** 备注前

与销售订单列表类似，修改显示内容为采购费用登记。

## 六、数据库迁移

### 6.1 迁移脚本

创建 `server/migrations/xxxx_add_expenses.sql`：

```sql
-- 销售订单表添加费用登记字段
ALTER TABLE sales_orders
ADD COLUMN expenses TEXT COMMENT '销售费用登记JSON字符串' AFTER remarks;

-- 采购订单表添加费用登记字段
ALTER TABLE purchase_orders
ADD COLUMN expenses TEXT COMMENT '采购费用登记JSON字符串' AFTER remarks;
```

### 6.2 更新 init.sql

在销售订单和采购订单表的建表语句中添加 expenses 字段。

## 七、实现步骤

### 阶段一：数据库改造

1. **更新 init.sql**
   - 销售订单表添加 expenses 字段
   - 采购订单表添加 expenses 字段

2. **创建迁移脚本**
   - 创建 `server/migrations/xxxx_add_expenses.sql`
   - 执行迁移

### 阶段二：后端改造

1. **更新类型定义**
   - 修改 `src/types/index.ts` 添加 Expenses 接口

2. **改造模型**
   - 修改 `server/models/SalesOrder.js`
   - 修改 `server/models/PurchaseOrder.js`

3. **改造控制器**
   - 修改 `server/controllers/salesOrderController.js`
   - 修改 `server/controllers/purchaseOrderController.js`

### 阶段三：前端改造

1. **更新类型定义**
   - 修改 `src/types/index.ts`

2. **改造销售订单表单**
   - 修改 `src/components/SalesOrderForm.vue`

3. **改造销售订单列表**
   - 修改 `src/views/sale/SalesOrders.vue`

4. **改造采购订单表单**
   - 修改 `src/components/PurchaseOrderForm.vue`

5. **改造采购订单列表**
   - 修改 `src/views/purchase/PurchaseOrders.vue`

### 阶段四：测试和优化

1. **功能测试**
   - 测试新增销售订单时费用登记
   - 测试编辑销售订单时费用登记更新
   - 测试新增采购订单时费用登记
   - 测试编辑采购订单时费用登记更新
   - 测试费用为0的情况
   - 测试费用为空的情况

2. **边界测试**
   - 测试负数输入（应禁止）
   - 测试超大数值输入
   - 测试非数值输入

3. **UI测试**
   - 测试费用登记区域布局
   - 测试列表显示效果
   - 测试响应式布局

## 八、性能优化建议

### 8.1 数据库层面
1. `expenses` 字段使用 TEXT 类型，避免 VARCHAR 长度限制
2. 考虑为 `expenses` 字段添加虚拟索引（如果需要按费用查询）

### 8.2 前端层面
1. 费用输入使用 `el-input-number` 组件，限制最小值和精度
2. 费用显示使用格式化函数，统一货币格式
3. 考虑添加费用总计显示（可选功能）

### 8.3 数据验证
1. 前端验证：费用值不能为负数，精度限制为2位小数
2. 后端验证：确保 expenses 是有效的 JSON 格式

## 九、注意事项

1. **数据一致性**：前后端都需要对 expenses 字段进行 JSON 序列化/反序列化
2. **默认值处理**：新增订单时 expenses 默认为 null 或全0
3. **编辑逻辑**：编辑时需要正确解析和序列化 expenses 字段
4. **显示逻辑**：列表显示时需要处理 null 或空对象的情况
5. **向后兼容性**：现有订单的 expenses 字段为 null，前端需要正确处理

## 十、依赖关系

- 销售订单模块（sales）- 必须先完成基础CRUD
- 采购订单模块（purchase）- 必须先完成基础CRUD

## 十一、预期产出

1. **数据库文件**
   - `server/init.sql` (更新)
   - `server/migrations/xxxx_add_expenses.sql` (新建)

2. **后端文件**
   - `server/models/SalesOrder.js` (更新)
   - `server/models/PurchaseOrder.js` (更新)
   - `server/controllers/salesOrderController.js` (更新)
   - `server/controllers/purchaseOrderController.js` (更新)

3. **前端文件**
   - `src/types/index.ts` (更新)
   - `src/components/SalesOrderForm.vue` (更新)
   - `src/views/sale/SalesOrders.vue` (更新)
   - `src/components/PurchaseOrderForm.vue` (更新)
   - `src/views/purchase/PurchaseOrders.vue` (更新)

4. **文档**
   - 功能规划文档（本文档）
   - API文档更新
