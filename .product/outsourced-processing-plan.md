# 委外加工业务规划文档

## 一、业务背景

### 1.1 现状分析

当前系统中，委外加工单仅通过出库单合同编号以 `Owork` 前缀进行标识，在利润报表中被过滤排除。系统**没有独立的委外加工模块**，无法有效管理以下业务场景：

- 原材料出库发往加工商
- 加工过程跟踪（进度、损耗）
- 加工完成后成品入库
- 加工费用结算与应付管理

### 1.2 委外加工业务定义

委外加工是指企业将**自有原材料**委托外部加工商进行加工，加工商按照约定工艺将原材料加工为**成品或半成品**后交付回企业的业务模式。

核心区别于普通采购：
| 维度 | 普通采购 | 委外加工 |
|------|---------|---------|
| 物料流向 | 供应商 → 企业 | 企业 → 加工商 → 企业 |
| 物料变化 | 无变化 | 原材料 → 成品 |
| 成本构成 | 采购价 | 材料成本 + 加工费 |
| 库存影响 | 入库增加 | 原材料减少 + 成品增加 |

---

## 二、业务流程设计

### 2.1 完整业务流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        委外加工全链路流程                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ① 销售订单 ──→ ② 委外加工单 ──→ ③ 原材料出库 ──→ ④ 加工跟踪            │
│      │              │              │              │                     │
│      │         (Owork前缀)    (扣减原材料库存)    (进度/损耗)              │
│      │              │              │              │                     │
│      │              │              │              ▼                     │
│      │              │              │         ⑤ 成品入库                  │
│      │              │              │         (增加成品库存)               │
│      │              │              │              │                     │
│      │              │              │              ▼                     │
│      │              │              │         ⑥ 成品出库                  │
│      │              │              │         (交付客户)                   │
│      │              │              │              │                     │
│      ▼              ▼              ▼              ▼                     │
│  ┌─────────────────────────────────────────────────┐                   │
│  │          ⑦ 结算：加工费应付 + 利润核算            │                   │
│  └─────────────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 各环节详细说明

#### ① 委外加工单创建（新增）

- **触发方式**：从销售订单自动生成 或 手动创建
- **合同编号**：自动生成 `Owork-YYMMDD-NNN` 格式
- **关联关系**：关联销售订单（可选）
- **核心数据**：
  - 加工商（复用供应商数据）
  - 加工产品（成品信息）
  - 所需原材料清单（BOM 物料清单）
  - 加工数量、加工单价、加工费合计
  - 交付日期

#### ② 原材料出库（复用出库单，增加标识）

- 复用现有出库单模块，合同编号以 `Owork` 开头自动标识
- 出库物料为**原材料**，数量根据 BOM 清单 × 加工数量计算
- 出库对象为**加工商**（而非客户）
- 扣减原材料库存

#### ③ 加工跟踪（新增）

- 记录加工商反馈的加工进度
- 记录实际损耗数量（对比理论用量）
- 状态流转：待加工 → 加工中 → 已完成 → 已入库

#### ④ 成品入库（复用入库单，增加标识）

- 复用现有入库单模块，关联委外加工单
- 入库物料为**成品**（与原材料不同）
- 入库来源为**加工商**
- 增加成品库存

#### ⑤ 成品出库（复用出库单）

- 复用现有出库单模块，关联销售订单
- 将成品交付给客户
- 扣减成品库存

#### ⑥ 结算管理（新增）

- 加工费应付账款自动创建
- 利润核算：销售金额 - 材料成本 - 加工费 - 运费等

---

## 三、数据模型设计

### 3.1 新增表：委外加工单 `outsourced_orders`

```sql
CREATE TABLE outsourced_orders (
  outsourced_order_id   VARCHAR(36) PRIMARY KEY,
  order_number          VARCHAR(50) UNIQUE NOT NULL,        -- 单号 Owork-YYMMDD-NNN
  contract_number       VARCHAR(100),                        -- 合同编号（同单号或自定义）
  related_sales_order_id VARCHAR(36),                        -- 关联销售订单ID
  processor_id          VARCHAR(36) NOT NULL,                -- 加工商ID（复用suppliers表）
  processor_name        VARCHAR(100),                        -- 加工商名称
  processor_address     VARCHAR(255),                        -- 加工商地址
  product_code          VARCHAR(50),                         -- 成品编码
  product_name          VARCHAR(100),                        -- 成品名称
  model                 VARCHAR(100),                        -- 型号
  specification         VARCHAR(255),                        -- 规格
  unit                  VARCHAR(20),                         -- 单位
  processing_quantity   DECIMAL(15,4) NOT NULL,              -- 加工数量
  processing_unit_price DECIMAL(15,4),                       -- 加工单价
  processing_fee        DECIMAL(15,4),                       -- 加工费合计
  bom_items             JSON,                                -- BOM物料清单（原材料列表）
  status                TINYINT DEFAULT 1,                   -- 1待出库 2已出库 3加工中 4已入库 5已完成 6已取消
  currency              VARCHAR(10) DEFAULT 'CNY',
  expected_date         DATE,                                -- 预计完成日期
  actual_date           DATE,                                -- 实际完成日期
  loss_quantity         DECIMAL(15,4) DEFAULT 0,             -- 损耗数量
  remarks               TEXT,
  created_by            VARCHAR(36),
  created_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 3.2 新增表：委外加工单明细 `outsourced_order_items`

```sql
CREATE TABLE outsourced_order_items (
  item_id               VARCHAR(36) PRIMARY KEY,
  outsourced_order_id   VARCHAR(36) NOT NULL,
  material_product_id   VARCHAR(36),                         -- 原材料产品ID
  material_product_code VARCHAR(50),                         -- 原材料编码
  material_product_name VARCHAR(100),                        -- 原材料名称
  material_model        VARCHAR(100),                        -- 原材料型号
  material_specification VARCHAR(255),                       -- 原材料规格
  material_unit         VARCHAR(20),                         -- 原材料单位
  required_quantity     DECIMAL(15,4) NOT NULL,              -- 需求数量（单件用量 × 加工数量）
  actual_used_quantity  DECIMAL(15,4),                       -- 实际使用数量
  loss_quantity         DECIMAL(15,4) DEFAULT 0,             -- 损耗数量
  remarks               VARCHAR(255),
  FOREIGN KEY (outsourced_order_id) REFERENCES outsourced_orders(outsourced_order_id)
);
```

### 3.3 现有表修改

#### delivery_orders 表

- 新增字段 `outsourced_order_id` VARCHAR(36) —— 关联委外加工单
- 新增字段 `order_type` TINYINT DEFAULT 1 —— 1普通出库 2委外加工出库 3委外成品入库出库

#### warehousing_orders 表

- 新增字段 `outsourced_order_id` VARCHAR(36) —— 关联委外加工单
- 新增字段 `order_type` TINYINT DEFAULT 1 —— 1普通入库 2委外加工成品入库

### 3.4 数据关系图

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐
│  sales_orders│     │ outsourced_orders  │     │   suppliers      │
│  (销售订单)   │────▶│  (委外加工单)      │────▶│  (加工商)         │
└──────┬───────┘     └─────┬─────────────┘     └──────────────────┘
       │                   │
       │                   ├──▶ outsourced_order_items (BOM原材料清单)
       │                   │
       │                   ├──▶ delivery_orders (原材料出库)
       │                   │    order_type = 2 (委外加工出库)
       │                   │
       │                   └──▶ warehousing_orders (成品入库)
       │                        order_type = 2 (委外成品入库)
       │
       └──▶ delivery_orders (成品出库给客户)
            order_type = 3 (委外成品出库)
```

---

## 四、状态流转设计

### 4.1 委外加工单状态

```
┌─────────┐    原材料出库完成    ┌──────────┐    加工商开始加工    ┌──────────┐
│ 1.待出库  │──────────────────▶│ 2.已出库   │──────────────────▶│ 3.加工中   │
└─────────┘                    └──────────┘                    └──────────┘
     │                                                                │
     │ 取消                                                           │ 成品入库完成
     ▼                                                                ▼
┌─────────┐                                                   ┌──────────┐
│ 6.已取消  │                                                   │ 4.已入库   │
└─────────┘                                                   └──────────┘
                                                                       │
                                                                       │ 结算完成
                                                                       ▼
                                                               ┌──────────┐
                                                               │ 5.已完成   │
                                                               └──────────┘
```

### 4.2 状态与业务操作对应

| 状态 | 可执行操作 | 触发条件 |
|------|-----------|---------|
| 1.待出库 | 创建原材料出库单、编辑、取消 | 新建委外加工单 |
| 2.已出库 | 确认加工开始 | 原材料出库单创建完成 |
| 3.加工中 | 创建成品入库单、记录损耗 | 加工商确认开始加工 |
| 4.已入库 | 创建成品出库单、结算 | 成品入库单创建完成 |
| 5.已完成 | 查看 | 结算完成 |
| 6.已取消 | 查看 | 手动取消 |

---

## 五、成本核算设计

### 5.1 成本构成

```
委外加工总成本 = 原材料成本 + 加工费 + 运费 + 其他费用

其中：
- 原材料成本 = Σ(原材料单价 × 实际用量)   ← 来自出库单
- 加工费     = 加工单价 × 加工数量         ← 来自委外加工单
- 运费       = 原材料运费 + 成品运费        ← 来自出库/入库单费用
- 其他费用   = 模具费、包装费等             ← 来自委外加工单费用
```

### 5.2 利润核算

```
毛利 = 销售金额 - 委外加工总成本
毛利率 = 毛利 / 销售金额 × 100%
```

### 5.3 与利润报表的集成

当前 `profitReportController.js` 已过滤 `Owork` 开头的出库单。改造后：

- 委外加工的原材料出库 → 计入**材料成本**
- 委外加工费 → 计入**加工成本**
- 成品出库给客户 → 计入**销售收入**
- 最终利润 = 销售收入 - 材料成本 - 加工成本 - 运费等

---

## 六、前端页面规划

### 6.1 新增页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 委外加工单列表 | `/outsourced-orders` | 列表展示、筛选、搜索 |
| 委外加工单详情 | `/outsourced-orders/:id` | 查看详情、状态流转 |
| 委外加工单表单 | `/outsourced-orders/create` | 新建/编辑 |
| BOM物料清单管理 | 内嵌于表单 | 维护成品与原材料的对应关系 |

### 6.2 菜单结构调整

```
├── 销售管理
│   ├── 报价单
│   ├── 销售订单
│   └── 委外加工单        ← 新增
├── 采购管理
│   ├── 采购计划
│   ├── 采购订单
│   └── 供应商管理
├── 出库管理
│   ├── 出库计划
│   ├── 出库单            ← 区分普通出库/委外出库
│   └── 出库退货单
├── 入库管理
│   ├── 入库计划
│   ├── 入库单            ← 区分普通入库/委外成品入库
│   └── 入库退货单
```

### 6.3 委外加工单表单核心字段

```
┌─────────────────────────────────────────────────────────────────┐
│  委外加工单                                        [保存] [提交] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  基本信息                                                       │
│  ┌─────────────┬─────────────┬─────────────────┐                │
│  │ 单号(自动生成) │ 合同编号     │ 关联销售订单      │                │
│  ├─────────────┼─────────────┼─────────────────┤                │
│  │ 加工商(下拉)   │ 加工商地址   │ 交付日期          │                │
│  └─────────────┴─────────────┴─────────────────┘                │
│                                                                 │
│  成品信息                                                       │
│  ┌─────────────┬─────────────┬─────────────┬──────────┐        │
│  │ 产品编码      │ 产品名称     │ 型号/规格    │ 加工数量   │        │
│  ├─────────────┼─────────────┼─────────────┼──────────┤        │
│  │ 加工单价      │ 加工费合计   │ 币种         │ 备注      │        │
│  └─────────────┴─────────────┴─────────────┴──────────┘        │
│                                                                 │
│  BOM物料清单（原材料）                          [+ 添加行]        │
│  ┌──────┬────────┬────────┬────────┬────────┬────────┐        │
│  │ 序号  │ 编码    │ 名称    │ 型号    │ 单件用量 │ 需求总量 │        │
│  ├──────┼────────┼────────┼────────┼────────┼────────┤        │
│  │ 1    │ [选择]  │ 自动    │ 自动    │ [输入]  │ 自动    │        │
│  │ 2    │ [选择]  │ 自动    │ 自动    │ [输入]  │ 自动    │        │
│  └──────┴────────┴────────┴────────┴────────┴────────┘        │
│                                                                 │
│  费用明细                                                       │
│  ┌──────────────┬──────────────┬──────────────┐                │
│  │ 运费          │ 模具费        │ 其他费用       │                │
│  └──────────────┴──────────────┴──────────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、后端接口规划

### 7.1 API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/outsourced-orders` | 获取列表（支持分页、筛选） |
| GET | `/api/outsourced-orders/:id` | 获取详情 |
| POST | `/api/outsourced-orders` | 创建委外加工单 |
| PUT | `/api/outsourced-orders/:id` | 更新委外加工单 |
| DELETE | `/api/outsourced-orders/:id` | 删除委外加工单 |
| PUT | `/api/outsourced-orders/:id/status` | 更新状态 |
| GET | `/api/outsourced-orders/:id/bom` | 获取BOM物料清单 |
| POST | `/api/outsourced-orders/:id/batch` | 从销售订单批量生成 |

### 7.2 创建委外加工单业务逻辑

```javascript
// 伪代码
async function createOutsourcedOrder(req, res) {
  // 1. 生成单号 Owork-YYMMDD-NNN
  const orderNumber = await generateOrderNumber('Owork');

  // 2. 校验加工商存在
  await validateProcessor(processorId);

  // 3. 校验BOM物料清单中每个原材料库存充足
  for (const item of bomItems) {
    const stock = await getProductStock(item.productId);
    if (stock < item.requiredQuantity) {
      throw new Error(`${item.productName} 库存不足`);
    }
  }

  // 4. 创建委外加工单
  const order = await OutsourcedOrder.create({ ... });

  // 5. 如果关联了销售订单，更新销售订单状态
  if (relatedSalesOrderId) {
    await updateSalesOrderStatus(relatedSalesOrderId);
  }

  return order;
}
```

### 7.3 原材料出库联动逻辑

```javascript
// 伪代码：创建委外加工单的原材料出库
async function createOutboundForOutsourced(outsourcedOrderId) {
  const order = await OutsourcedOrder.findById(outsourcedOrderId);

  // 1. 创建出库单，合同编号 = 委外加工单号（Owork开头）
  const deliveryOrder = await DeliveryOrder.create({
    contract_number: order.order_number,  // Owork-YYMMDD-NNN
    order_type: 2,                         // 委外加工出库
    outsourced_order_id: order.outsourced_order_id,
    customer_name: order.processor_name,   // 出库对象是加工商
    delivery_items: order.bom_items,       // 出库物料是原材料
  });

  // 2. 扣减原材料库存
  for (const item of order.bomItems) {
    await decrementStock(item.productId, item.requiredQuantity);
  }

  // 3. 更新委外加工单状态
  await order.update({ status: 2 }); // 已出库

  return deliveryOrder;
}
```

### 7.4 成品入库联动逻辑

```javascript
// 伪代码：委外加工成品入库
async function createInboundForOutsourced(outsourcedOrderId, actualQuantity, lossQuantity) {
  const order = await OutsourcedOrder.findById(outsourcedOrderId);

  // 1. 创建入库单
  const warehousingOrder = await WarehousingOrder.create({
    order_type: 2,                          // 委外成品入库
    outsourced_order_id: order.outsourced_order_id,
    supplier_name: order.processor_name,    // 入库来源是加工商
    warehousing_items: [{
      product_code: order.product_code,
      product_name: order.product_name,
      quantity: actualQuantity,
    }],
  });

  // 2. 增加成品库存
  await incrementStock(order.product_id, actualQuantity);

  // 3. 记录损耗
  await order.update({
    status: 4,  // 已入库
    loss_quantity: lossQuantity,
  });

  return warehousingOrder;
}
```

---

## 八、打印模板规划

### 8.1 需要新增的打印模板

| 模板 | 说明 |
|------|------|
| 委外加工单 | 包含成品信息、BOM物料清单、加工费用 |
| 委外出库单 | 原材料出库给加工商的出库单 |
| 委外入库单 | 成品从加工商入库的入库单 |

### 8.2 委外加工单打印内容

```
┌────────────────────────────────────────────────────────┐
│                    XX公司委外加工单                       │
├────────────────────────────────────────────────────────┤
│ 单号：Owork-260801-001    日期：2026-08-01              │
│ 加工商：XX加工厂          交付日期：2026-08-15           │
├────────────────────────────────────────────────────────┤
│ 成品信息                                                │
│ 编码：FP-001  名称：成品A  型号：M1  数量：1000          │
├────────────────────────────────────────────────────────┤
│ 原材料清单                                              │
│ 序号│ 编码      │ 名称     │ 单位 │ 单件用量 │ 需求总量   │
│  1  │ YL-001   │ 原材料A  │ 个   │ 2       │ 2000      │
│  2  │ YL-002   │ 原材料B  │ 米   │ 0.5     │ 500       │
├────────────────────────────────────────────────────────┤
│ 加工费：¥5,000.00        运费：¥200.00                  │
│ 合计：¥5,200.00                                         │
├────────────────────────────────────────────────────────┤
│ 备注：                                                  │
│ 制单人：张三    审核人：____    日期：____                │
└────────────────────────────────────────────────────────┘
```

---

## 九、实施计划

### 9.1 分阶段实施

#### 第一阶段：基础框架（预计 3-5 天）

- [ ] 创建数据库表（outsourced_orders, outsourced_order_items）
- [ ] 修改 delivery_orders、warehousing_orders 表增加字段
- [ ] 实现后端 CRUD API
- [ ] 实现前端列表页、表单页
- [ ] 路由和菜单配置

#### 第二阶段：业务联动（预计 3-5 天）

- [ ] 委外加工单 → 自动生成原材料出库单
- [ ] 原材料出库 → 扣减库存、更新加工单状态
- [ ] 成品入库 → 增加库存、更新加工单状态
- [ ] 状态流转控制
- [ ] 从销售订单批量生成委外加工单

#### 第三阶段：报表与打印（预计 2-3 天）

- [ ] 利润报表适配（区分委外加工成本）
- [ ] 打印模板（委外加工单、委外出入库单）
- [ ] 应付账款自动生成（加工费）

#### 第四阶段：优化完善（预计 2-3 天）

- [ ] BOM 物料清单管理（可保存常用组合）
- [ ] 损耗率统计与预警
- [ ] 加工商对账
- [ ] 权限控制
- [ ] 数据校验与异常处理

### 9.2 涉及文件清单

#### 后端新增
```
server/models/OutsourcedOrder.js
server/controllers/outsourcedOrderController.js
server/routes/outsourcedOrderRoutes.js
server/migrations/add_outsourced_orders.sql
```

#### 后端修改
```
server/controllers/deliveryOrderController.js      -- 区分普通/委外出库
server/controllers/warehousingOrderController.js    -- 区分普通/委外入库
server/controllers/profitReportController.js        -- 适配委外成本核算
server/controllers/receivableController.js          -- 适配委外应付
server/models/DeliveryOrder.js                      -- 新增字段
server/models/WarehousingOrder.js                   -- 新增字段
```

#### 前端新增
```
src/views/outsourced/OutsourcedOrders.vue           -- 列表页
src/views/outsourced/OutsourcedOrderForm.vue        -- 表单页
src/views/outsourced/OutsourcedOrderDetail.vue      -- 详情页
src/api/outsourcedOrders.ts                         -- API模块
```

#### 前端修改
```
src/router/index.ts                                 -- 新增路由
src/types/index.ts                                  -- 新增类型定义
src/components/DeliveryOrderForm.vue                -- 支持委外出库
src/components/WarehousingOrderForm.vue             -- 支持委外入库
src/views/reports/ProfitReport.vue                  -- 适配委外成本
```

---

## 十、兼容性说明

### 10.1 向后兼容

- 现有出库单中合同编号以 `Owork` 开头的记录，可通过数据迁移脚本关联到新的委外加工单
- 利润报表逻辑保持兼容：无 `outsourced_order_id` 的出库单按原逻辑处理
- 现有打印模板不受影响

### 10.2 数据迁移

```sql
-- 可选：将历史 Owork 出库单关联到新表
-- 需要根据实际业务数据手工或脚本处理
```

### 10.3 与现有功能的关系

| 现有功能 | 影响 | 说明 |
|---------|------|------|
| 出库单 | 扩展 | 新增 order_type 字段区分类型 |
| 入库单 | 扩展 | 新增 order_type 字段区分类型 |
| 利润报表 | 修改 | 增加委外加工成本维度 |
| 应付账款 | 扩展 | 自动生成加工费应付 |
| 库存管理 | 无变化 | 复用现有库存增减逻辑 |
| 供应商管理 | 无变化 | 加工商复用供应商数据 |

---

## 十一、风险与注意事项

1. **库存校验**：创建委外加工单时需校验原材料库存是否充足，不足时应提示但允许创建（待出库状态）
2. **并发控制**：多人同时操作同一原材料出库时需注意库存扣减的并发安全
3. **损耗管理**：实际加工中可能存在损耗，需支持记录实际用量与理论用量的差异
4. **数据一致性**：委外加工单与出库单、入库单的联动需保证事务一致性
5. **编号规则**：`Owork` 前缀已作为约定使用，新系统保持一致
