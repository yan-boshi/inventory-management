# 进销存明细表功能规划文档

## 一、需求概述

实现进销存明细表报表功能，用于查询各产品在指定时间段内的入库、出库和库存结余情况。

- **查询粒度**：按年或按月查询
- **展示方式**：每个产品一行
- **核心公式**：期初库存 + 本期入库 - 本期出库 = 期末库存

---

## 二、报表字段定义

| 字段 | 数据来源 | 说明 |
|------|----------|------|
| 产品名称 | products.product_name | — |
| 产品代码 | products.product_code | — |
| 规格型号 | products.model | — |
| 单位 | products.unit | — |
| 期初库存 | 反推计算 | 期末库存 - 本期入库 + 本期出库 |
| 本期入库数量 | warehousing_orders | 时间段内所有入库单中该产品的数量之和 |
| 本期出库数量 | delivery_orders | 时间段内所有出库单中该产品的数量之和 |
| 期末库存 | products.stock | 当前实时库存 |
| 含税单价 | products.tax_included_price | 移动平均法计算的当前含税单价 |
| 未税单价 | products.tax_excluded_price | 移动平均法计算的当前未税单价 |
| 期末金额（含税） | 计算 | 期末库存 × 含税单价 |
| 期末金额（未税） | 计算 | 期末库存 × 未税单价 |

### 期初库存计算说明

系统当前只维护 `products.stock` 作为实时库存（即期末库存），没有历史库存快照机制。因此采用反推法：

```
期初库存 = 期末库存 - 本期入库 + 本期出库
```

---

## 三、数据流与计算逻辑

```
查询参数: year, month(可选)
       │
       ▼
┌─────────────────────────────────┐
│  确定时间范围                      │
│  按年: year-01-01 ~ year-12-31   │
│  按月: year-month-01 ~ 月末       │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  并行查询                         │
│  1. 所有产品 (products)           │
│  2. 时间段内入库单                 │
│  3. 时间段内出库单                 │
└─────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  汇总计算（按 product_code 聚合）  │
│  - 入库数量: 解析 warehousing_items│
│  - 出库数量: 解析 delivery_items   │
│  - 期初 = 期末 - 入库 + 出库      │
│  - 金额 = 期末库存 × 单价         │
└─────────────────────────────────┘
       │
       ▼
    返回报表数据
```

---

## 四、涉及文件清单

### 新建文件（4个）

| 文件 | 说明 |
|------|------|
| `server/controllers/inventoryReportController.js` | 报表查询控制器 |
| `server/routes/inventoryReportRoutes.js` | 报表路由 |
| `src/api/inventoryReport.ts` | 前端 API 模块 |
| `src/views/reports/InventoryReport.vue` | 报表页面组件 |

### 修改文件（4个）

| 文件 | 修改内容 |
|------|----------|
| `server/index.js` | 注册报表路由 `/api/inventory-report` |
| `src/types/index.ts` | 新增 `InventoryReportItem` 类型定义 |
| `src/router/index.ts` | 注册报表页面路由 |
| `src/layouts/DefaultLayout.vue` | 侧边栏新增"报表中心"菜单组 |

---

## 五、API 设计

### GET /api/inventory-report

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| year | number | 是 | 查询年份，如 2026 |
| month | number | 否 | 查询月份 1-12，不传则按年汇总 |

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "product_id": "uuid",
      "product_name": "产品A",
      "product_code": "P001",
      "model": "型号1",
      "unit": "个",
      "opening_stock": 100,
      "inbound_quantity": 50,
      "outbound_quantity": 30,
      "closing_stock": 120,
      "tax_included_price": 11.30,
      "tax_excluded_price": 10.00,
      "tax_included_amount": 1356.00,
      "tax_excluded_amount": 1200.00
    }
  ]
}
```

---

## 六、前端页面设计

### 查询区域

```
┌──────────────────────────────────────────────────┐
│  年份: [2026 ▼]   月份: [全部 ▼ / 1月~12月]   [查询]  │
└──────────────────────────────────────────────────┘
```

### 表格列

| 列名 | 字段 | 对齐 | 宽度 |
|------|------|------|------|
| 产品名称 | product_name | 左 | 150px |
| 产品代码 | product_code | 左 | 120px |
| 规格型号 | model | 左 | 120px |
| 单位 | unit | 中 | 60px |
| 期初库存 | opening_stock | 右 | 100px |
| 本期入库 | inbound_quantity | 右 | 100px |
| 本期出库 | outbound_quantity | 右 | 100px |
| 期末库存 | closing_stock | 右 | 100px |
| 含税单价 | tax_included_price | 右 | 100px |
| 未税单价 | tax_excluded_price | 右 | 100px |
| 期末金额（含税） | tax_included_amount | 右 | 120px |
| 期末金额（未税） | tax_excluded_amount | 右 | 120px |

### 侧边栏菜单结构

```
📊 报表中心
   └── 进销存明细表
```

路由路径：`/inventory-report`

---

## 七、实施顺序

1. `src/types/index.ts` — 新增类型定义
2. `server/controllers/inventoryReportController.js` — 后端控制器
3. `server/routes/inventoryReportRoutes.js` — 后端路由
4. `server/index.js` — 注册路由
5. `src/api/inventoryReport.ts` — 前端 API
6. `src/views/reports/InventoryReport.vue` — 报表页面
7. `src/router/index.ts` — 注册页面路由
8. `src/layouts/DefaultLayout.vue` — 侧边栏菜单

---

## 八、验证方式

1. 启动服务 `npm run server:dev` 和 `npm run dev`
2. 创建几张入库单和出库单（关联不同产品）
3. 进入进销存明细表页面，按月查询
4. 核对：期初库存 + 入库 - 出库 = 期末库存
5. 核对：期末金额 = 期末库存 × 单价
6. 切换按年查询，验证汇总数据正确
