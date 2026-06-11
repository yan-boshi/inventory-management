# 订单数量同步功能 - 实施规划

## 一、需求概述

### 1.1 出库数量同步至销售订单

- 新增出库单选择销售订单并保存后，将出库单中每样商品的出库数量同步至销售订单 `sales_items` 对应商品的 `outbound_quantity` 属性
- 同步方式：`sales_items` 中该商品的 `outbound_quantity += 出库单中该商品的 quantity`
- 数据校验：
  - 若同步后 `outbound_quantity == quantity`，该商品状态改为"已出库"
  - 若同步后 `outbound_quantity > quantity`，**报错：已超出销售数量**，阻止保存
  - 若原 `outbound_quantity` 为 0 或空，该商品状态从"未出库"改为"已部分出库"

### 1.2 入库数量同步至采购订单

- 新增入库单选择采购订单并保存后，将入库单中每样商品的入库数量同步至采购订单 `purchase_items` 对应商品的 `inbound_quantity` 属性
- 同步方式：`purchase_items` 中该商品的 `inbound_quantity += 入库单中该商品的 quantity`
- 数据校验：
  - 若同步后 `inbound_quantity == quantity`，该商品状态改为"已入库"
  - 若同步后 `inbound_quantity > quantity`，**报错：已超出采购数量**，阻止保存
  - 若原 `inbound_quantity` 为 0 或空，该商品状态从"未入库"改为"已部分入库"

### 1.3 重要约束

> `sales_items` 和 `purchase_items` 是 JSON 字符串，其中已存在 `outbound_quantity` / `inbound_quantity` 字段（TypeScript 类型已定义），**无需新增字段**，只需在后端正确读写这些字段。

---

## 二、现状分析与关键发现

### 2.1 当前未实现的关键点

| 维度 | 现状 | 需要实现 |
|------|------|----------|
| `outbound_quantity` | TS 类型已定义，后端**完全未使用** | 创建出库单时回写 |
| `inbound_quantity` | TS 类型已定义，后端**完全未使用** | 创建入库单时回写 |
| 状态计算 | 动态查询子表计算 (`calculateStatus`) | 改为基于行级 `outbound/inbound_quantity` 计算 |
| 前端数量填充 | 直接使用原始 `quantity`，不减已出/入库量 | 减去已出/入库量，显示剩余可出/入库数量 |
| 超量校验 | **完全没有** | 后端校验并报错 |
| 可选父订单查询 | 出库端查 status 1/3；入库端**只查 1** | 统一为查 status 1/3 |

### 2.2 当前 `calculateStatus` 的问题

现有的 `calculateStatus()` 方法通过 SQL JOIN 子表来动态计算状态，每次查询列表都要对每个订单执行子查询，存在 N+1 性能问题。改为在创建出库/入库单时同步回写 `outbound_quantity` / `inbound_quantity` 到父订单的 `sales_items` / `purchase_items` JSON 中后，可以直接从父订单自身数据计算状态，无需再 JOIN 子表。

---

## 三、后端改造方案

### 3.1 出库单控制器改造

**文件**: `server/controllers/deliveryOrderController.js`

#### 3.1.1 `createDeliveryOrder` 方法改造

在现有创建出库单逻辑之后，增加数量同步逻辑：

```
步骤：
1. [现有] 创建出库单记录
2. [新增] 如果关联了 sales_order_number：
   a. 查询销售订单，获取 sales_items JSON
   b. 解析 sales_items 为数组
   c. 遍历出库单的 delivery_items，按 product_code 匹配 sales_items 中的商品
   d. 累加 outbound_quantity：item.outbound_quantity = (item.outbound_quantity || 0) + deliveryItem.quantity
   e. 超量校验：如果 outbound_quantity > quantity，抛出错误 "已超出销售数量"
   f. 更新商品行状态（status）：
      - 如果 outbound_quantity == quantity → status = 2 (已全部出库)
      - 如果 outbound_quantity > 0 && outbound_quantity < quantity：
        - 如果原 outbound_quantity 为 0 或 null → status = 3 (已部分出库)
        - 否则保持 status = 3
   g. 计算订单整体状态：
      - 所有行 status == 2 → 订单 status = '2' (已全部出库)
      - 有任何行 status == 3 → 订单 status = '3' (已部分出库)
      - 所有行 status == 1 → 订单 status = '1' (未出库)
   h. 将更新后的 sales_items 序列化回 JSON 字符串
   i. 更新销售订单记录 (sales_items, status, updated_at)
```

**关键代码逻辑（伪代码）**：

```javascript
// 在 createDeliveryOrder 中，创建出库单之后添加
if (sales_order_number) {
  // 查询销售订单
  const salesOrder = await SalesOrder.findOne(
    'order_number = ?', [sales_order_number]
  );

  let salesItems = JSON.parse(salesOrder.sales_items || '[]');

  // 遍历出库项，同步数量
  for (const deliveryItem of delivery_items) {
    const targetItem = salesItems.find(
      si => si.product_code === deliveryItem.product_code
    );

    if (!targetItem) {
      throw new Error(`商品 ${deliveryItem.product_code} 不在销售订单中`);
    }

    const currentOutbound = targetItem.outbound_quantity || 0;
    const newOutbound = currentOutbound + deliveryItem.quantity;

    // 超量校验
    if (newOutbound > targetItem.quantity) {
      throw new Error(
        `商品 ${targetItem.product_name} 已超出销售数量，` +
        `订单数量: ${targetItem.quantity}，已出库: ${currentOutbound}，` +
        `本次出库: ${deliveryItem.quantity}`
      );
    }

    // 更新出库数量
    targetItem.outbound_quantity = newOutbound;

    // 更新行状态
    if (newOutbound === targetItem.quantity) {
      targetItem.status = 2; // 已全部出库
    } else if (newOutbound > 0) {
      targetItem.status = 3; // 已部分出库
    }
  }

  // 计算订单整体状态
  const statuses = salesItems.map(item => item.status || 1);
  let orderStatus = '1';
  if (statuses.every(s => s === 2)) {
    orderStatus = '2'; // 全部出库
  } else if (statuses.some(s => s === 2 || s === 3)) {
    orderStatus = '3'; // 部分出库
  }

  // 更新销售订单
  await SalesOrder.update(salesOrder.sales_order_id, {
    sales_items: JSON.stringify(salesItems),
    status: orderStatus
  });
}
```

#### 3.1.2 `getUndeliveredSalesOrders` 方法改造

返回数据中需要包含每个行项的已出库数量，以便前端计算剩余可出库量。

**方案**：无需改后端返回结构（`sales_items` JSON 已包含 `outbound_quantity`），只需确保前端正确解析并使用。

#### 3.1.3 `deleteDeliveryOrder` 方法改造

删除出库单时需要回退出库数量：

```
步骤：
1. [现有] 查询出库单记录
2. [新增] 如果关联了 sales_order_number：
   a. 查询销售订单
   b. 解析 sales_items
   c. 遍历被删除出库单的 delivery_items
   d. 回退 outbound_quantity：item.outbound_quantity -= deliveryItem.quantity
   e. 更新行状态：
      - 如果 outbound_quantity == 0 → status = 1 (未出库)
      - 如果 outbound_quantity > 0 && outbound_quantity < quantity → status = 3 (已部分出库)
      - 如果 outbound_quantity == quantity → status = 2 (已全部出库)
   f. 重新计算订单整体状态
   g. 更新销售订单
3. [现有] 删除出库单记录
```

### 3.2 入库单控制器改造

**文件**: `server/controllers/warehousingOrderController.js`

#### 3.2.1 `createWarehousingOrder` 方法改造

与出库单对称，在创建入库单后增加数量同步逻辑：

```
步骤：
1. [现有] 创建入库单记录
2. [现有] 更新产品库存（增加 stock）
3. [新增] 如果关联了 purchase_order_number：
   a. 查询采购订单，获取 purchase_items JSON
   b. 解析 purchase_items 为数组
   c. 遍历入库单的 warehousing_items，按 product_code 匹配
   d. 累加 inbound_quantity：item.inbound_quantity = (item.inbound_quantity || 0) + warehousingItem.quantity
   e. 超量校验：如果 inbound_quantity > quantity，抛出错误 "已超出采购数量"
   f. 更新商品行状态：
      - inbound_quantity == quantity → status = 2 (已全部入库)
      - inbound_quantity > 0 && < quantity → status = 3 (已部分入库)
   g. 计算订单整体状态并更新
```

#### 3.2.2 `getPurchaseOrdersForWarehousing` 方法改造

**当前问题**：只查询 `status = '1'` 的采购订单，不包含已部分入库(status='3')的订单。

**修复**：改为查询 `status = '1' OR status = '3'`，与出库端保持一致。

#### 3.2.3 `deleteWarehousingOrder` 方法改造

删除入库单时回退出库数量：

```
步骤：
1. [现有] 查询入库单记录
2. [新增] 如果关联了 purchase_order_number：
   a. 查询采购订单
   b. 解析 purchase_items
   c. 遍历被删除入库单的 warehousing_items
   d. 回退 inbound_quantity
   e. 更新行状态
   f. 重新计算订单整体状态
   g. 更新采购订单
3. [现有] 回退产品库存（减少 stock）
4. [现有] 删除入库单记录
```

### 3.3 销售订单模型改造

**文件**: `server/models/SalesOrder.js`

#### 3.3.1 `calculateStatus` 方法优化

当前方法通过 SQL JOIN `delivery_orders` 来计算状态。同步功能实现后，可以直接从 `sales_items` JSON 中的 `outbound_quantity` 和 `status` 字段读取，不再需要 JOIN 子表。

**优化后逻辑**：
```
1. 如果 status === '4'（退货），直接返回 4
2. 解析 sales_items JSON
3. 检查每个商品行的 status：
   - 全部为 2 → 返回 '2' (已全部出库)
   - 有任一为 2 或 3 → 返回 '3' (已部分出库)
   - 全部为 1 → 返回 '1' (未出库)
```

> **注意**：此优化属于可选的性能优化。在初始实现中，可以保留现有的 `calculateStatus` 方法不变（通过 JOIN 子表计算），确保向后兼容。数量同步逻辑独立于状态计算方式，即使保留动态计算，同步的 `outbound_quantity` 仍可作为前端展示使用。

#### 3.3.2 `create` 方法改造

创建销售订单时，初始化每个商品行的 `outbound_quantity = 0` 和 `status = 1`：

```javascript
// 在 create 方法中，处理 sales_items 时
const processedItems = items.map((item, index) => ({
  ...item,
  no: item.no || index + 1,
  outbound_quantity: item.outbound_quantity || 0,
  status: item.status || 1
}));
```

### 3.4 采购订单模型改造

**文件**: `server/models/PurchaseOrder.js`

#### 3.4.1 `create` 方法改造

创建采购订单时，初始化每个商品行的 `inbound_quantity = 0` 和 `status = 1`：

```javascript
// 在 create 方法中，处理 purchase_items 时
const processedItems = items.map((item, index) => ({
  ...item,
  no: item.no || index + 1,
  inbound_quantity: item.inbound_quantity || 0,
  status: item.status || 1
}));
```

#### 3.4.2 `calculateStatus` 方法优化（可选）

与 SalesOrder 同理，可从 `purchase_items` JSON 中直接读取状态。

---

## 四、前端改造方案

### 4.1 出库单表单改造

**文件**: `src/components/DeliveryOrderForm.vue`

#### 4.1.1 `handleSalesOrderChange` 方法改造

选择销售订单后，填充出库单行时需要减去已出库数量：

```
当前逻辑：quantity = item.quantity（原始订单数量）
改为：quantity = item.quantity - (item.outbound_quantity || 0)（剩余可出库数量）
```

**额外处理**：
- 如果剩余可出库数量为 0，该商品行不应出现在出库单中（已全部出库）
- 在商品行旁显示"已出库 X / 共 Y"的提示信息

#### 4.1.2 超量前端校验

在提交前增加前端校验：出库数量不能超过剩余可出库数量。

#### 4.1.3 表单展示优化

在出库单商品列表中增加一列"剩余可出库数量"，方便用户参考。

### 4.2 入库单表单改造

**文件**: `src/components/WarehousingOrderForm.vue`

与出库单表单对称改造：

#### 4.2.1 `handlePurchaseOrderChange` 方法改造

```
当前逻辑：quantity = item.quantity（原始订单数量）
改为：quantity = item.quantity - (item.inbound_quantity || 0)（剩余可入库数量）
```

#### 4.2.2 超量前端校验

入库数量不能超过剩余可入库数量。

#### 4.2.3 表单展示优化

在入库单商品列表中增加一列"剩余可入库数量"。

### 4.3 销售订单详情改造

**文件**: `src/components/SalesOrderDetail.vue`

#### 4.3.1 展示已出库数量

在销售订单详情的商品列表中，增加"已出库数量"和"出库状态"列。

#### 4.3.2 状态显示修正

当前详情组件只展示 2 种状态（已到货/采购中），需修正为 4 种状态，与列表页一致。

### 4.4 采购订单详情改造

**文件**: `src/components/PurchaseOrderDetail.vue`

#### 4.4.1 展示已入库数量

在采购订单详情的商品列表中，增加"已入库数量"和"入库状态"列。

#### 4.4.2 状态显示修正

同销售订单，修正为 4 种状态。

### 4.5 销售订单列表改造

**文件**: `src/views/sales/SalesOrders.vue`

#### 4.5.1 操作按钮状态控制

- 当订单所有商品行已全部出库（status='2'）时，隐藏或禁用"创建出库单"入口（如果有该入口）
- 退货操作：如果订单已有出库记录（outbound_quantity > 0），退货时应提示用户

### 4.6 采购订单列表改造

**文件**: `src/views/purchase/PurchaseOrders.vue`

#### 4.6.1 操作按钮状态控制

- 当订单所有商品行已全部入库（status='2'）时，隐藏或禁用"创建入库单"入口
- 退货操作：如果订单已有入库记录（inbound_quantity > 0），退货时应提示用户

---

## 五、删除出库单/入库单时的级联处理

### 5.1 删除出库单

- 回退销售订单 `sales_items` 中对应商品的 `outbound_quantity`
- 重新计算行状态和订单整体状态
- **不回退产品库存**（当前系统出库单不扣减库存，保持一致）

### 5.2 删除入库单

- 回退采购订单 `purchase_items` 中对应商品的 `inbound_quantity`
- 重新计算行状态和订单整体状态
- **回退产品库存**（当前系统入库单会增加库存，删除时需扣减，已有实现）

### 5.3 已退货订单的保护

- 订单 status='4'（退货）为终态
- 不允许为已退货订单创建出库单/入库单
- 删除操作不受退货状态影响

---

## 六、性能优化方案

### 6.1 状态计算优化

**当前问题**：`calculateStatus()` 在每次列表查询时对每个订单执行 SQL JOIN 子表，存在 N+1 性能问题。

**优化方案**：

同步功能实现后，`sales_items` / `purchase_items` JSON 中已包含完整的 `outbound_quantity` / `inbound_quantity` 和行级 `status` 信息。可以直接从 JSON 数据计算订单整体状态，无需 JOIN 子表。

| 场景 | 优化前 | 优化后 |
|------|--------|--------|
| 列表查询 20 条订单 | 1 + 20 次子查询 = 21 次 SQL | 1 次 SQL |
| 查询单个订单详情 | 2 次 SQL | 1 次 SQL |

**实施策略**：数量同步功能稳定运行后，再进行此优化。初期保留现有 `calculateStatus` 作为兜底验证。

### 6.2 数据库索引优化

确保以下索引存在：

```sql
-- 出库单关联销售订单的索引
CREATE INDEX IF NOT EXISTS idx_delivery_sales_order
ON delivery_orders(sales_order_number);

-- 入库单关联采购订单的索引
CREATE INDEX IF NOT EXISTS idx_warehousing_purchase_order
ON warehousing_orders(purchase_order_number);
```

### 6.3 JSON 解析开销

`sales_items` / `purchase_items` 为 JSON 字符串，每次读取都需要 `JSON.parse()`。

**优化建议**：对于列表查询场景，如果不需要展示商品明细，可以在 SQL 中只查询必要字段，避免传输大 JSON 字符串。但这是已有的架构限制，短期内保持现状。

---

## 七、事务处理建议

### 7.1 需要事务的场景

当前系统所有操作均未使用数据库事务。数量同步涉及多表更新（出库单 + 销售订单），建议引入事务保证原子性。

**推荐方案**：在 `createDeliveryOrder` 和 `createWarehousingOrder` 中使用 MySQL 事务：

```
BEGIN
  1. 创建出库单/入库单
  2. 同步数量到父订单
  3. 更新产品库存（入库单场景）
COMMIT
-- 如果任何步骤失败
ROLLBACK
```

### 7.2 并发安全

- 使用数据库事务和行级锁（`SELECT ... FOR UPDATE`）防止并发创建出库单时超量
- 或在 UPDATE 语句中使用 WHERE 条件做乐观校验

---

## 八、实施步骤与优先级

### 第一阶段：核心同步功能（P0）

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 1 | 出库单创建时同步 outbound_quantity 到销售订单 | `server/controllers/deliveryOrderController.js` |
| 2 | 出库单创建时超量校验 | `server/controllers/deliveryOrderController.js` |
| 3 | 出库单创建时自动更新销售订单状态 | `server/controllers/deliveryOrderController.js` |
| 4 | 入库单创建时同步 inbound_quantity 到采购订单 | `server/controllers/warehousingOrderController.js` |
| 5 | 入库单创建时超量校验 | `server/controllers/warehousingOrderController.js` |
| 6 | 入库单创建时自动更新采购订单状态 | `server/controllers/warehousingOrderController.js` |
| 7 | 修复 getPurchaseOrdersForWarehousing 查询条件 | `server/controllers/warehousingOrderController.js` |

### 第二阶段：删除回退（P0）

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 8 | 删除出库单时回退 outbound_quantity | `server/controllers/deliveryOrderController.js` |
| 9 | 删除入库单时回退 inbound_quantity | `server/controllers/warehousingOrderController.js` |

### 第三阶段：前端适配（P1）

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 10 | 出库单表单：选择销售订单后计算剩余可出库量 | `src/components/DeliveryOrderForm.vue` |
| 11 | 入库单表单：选择采购订单后计算剩余可入库量 | `src/components/WarehousingOrderForm.vue` |
| 12 | 出库单表单：前端超量校验 | `src/components/DeliveryOrderForm.vue` |
| 13 | 入库单表单：前端超量校验 | `src/components/WarehousingOrderForm.vue` |
| 14 | 销售订单详情：展示已出库数量和状态 | `src/components/SalesOrderDetail.vue` |
| 15 | 采购订单详情：展示已入库数量和状态 | `src/components/PurchaseOrderDetail.vue` |
| 16 | 销售订单详情/采购订单详情：修正状态显示 | `src/components/SalesOrderDetail.vue`, `PurchaseOrderDetail.vue` |

### 第四阶段：初始化与优化（P2）

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 17 | 创建销售订单时初始化 outbound_quantity=0, status=1 | `server/models/SalesOrder.js` |
| 18 | 创建采购订单时初始化 inbound_quantity=0, status=1 | `server/models/PurchaseOrder.js` |
| 19 | 历史数据初始化脚本 | `server/migrations/` |
| 20 | 优化 calculateStatus 从 JSON 读取（可选） | `server/models/SalesOrder.js`, `PurchaseOrder.js` |

---

## 九、历史数据迁移

### 9.1 数据初始化脚本

对于已存在的订单，需要为其 `sales_items` / `purchase_items` 中的商品行初始化 `outbound_quantity` 和 `inbound_quantity` 字段。

```sql
-- 销售订单：为 sales_items 中缺少 outbound_quantity 的商品行补 0
-- 需要应用层脚本处理，因为 JSON 操作在 SQL 中较复杂

-- 采购订单：同理
```

**建议**：编写 Node.js 迁移脚本，遍历所有订单，解析 JSON，补全缺失字段，写回数据库。

### 9.2 已有出库单/入库单的数据回填

对于已有出库单但 `outbound_quantity` 未同步的订单，需要根据已有出库单数据重新计算并回填。

---

## 十、测试用例

### 10.1 出库数量同步

| 测试场景 | 预期结果 |
|---------|---------|
| 创建出库单，出库数量 = 订单数量 | sales_items 中 outbound_quantity = quantity, status = 2, 订单 status = '2' |
| 创建出库单，出库数量 < 订单数量 | outbound_quantity = 出库量, status = 3, 订单 status = '3' |
| 同一销售订单创建两次出库单 | 第二次 outbound_quantity = 第一次 + 第二次，状态正确更新 |
| 出库数量 > 剩余可出库量 | 报错"已超出销售数量"，出库单不创建 |
| 删除出库单 | outbound_quantity 回退，状态正确更新 |

### 10.2 入库数量同步

| 测试场景 | 预期结果 |
|---------|---------|
| 创建入库单，入库数量 = 订单数量 | inbound_quantity = quantity, status = 2, 订单 status = '2' |
| 创建入库单，入库数量 < 订单数量 | inbound_quantity = 入库量, status = 3, 订单 status = '3' |
| 同一采购订单创建两次入库单 | 第二次 inbound_quantity = 第一次 + 第二次 |
| 入库数量 > 剩余可入库量 | 报错"已超出采购数量"，入库单不创建 |
| 删除入库单 | inbound_quantity 回退，库存扣减，状态正确更新 |

### 10.3 边界场景

| 测试场景 | 预期结果 |
|---------|---------|
| 已退货订单(status=4) | 不允许创建出库单/入库单 |
| 出库单/入库单未关联父订单 | 不触发同步逻辑，正常创建 |
| sales_items/purchase_items 中缺少 outbound_quantity/inbound_quantity | 视为 0，正常处理 |
| 商品编码不匹配 | 报错提示商品不在订单中 |
