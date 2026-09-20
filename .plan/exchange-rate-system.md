# 汇率维护系统规划文档

> 参考金蝶云星辰多币种管理模块设计

## 一、背景与现状分析

### 1.1 当前系统币种使用情况

| 模块 | 币种字段 | 汇率字段 | 币种选项 |
|------|---------|---------|---------|
| 客户管理 | ✅ `currency` | ❌ | CNY/USD/EUR |
| 供应商管理 | ✅ `currency` | ❌ | CNY/USD/EUR |
| 销售订单 | ✅ `currency` | ✅ `exchange_rate` | CNY/USD/EUR |
| 采购订单 | ✅ `currency` | ✅ `exchange_rate` | CNY/USD/EUR |
| 入库单 | ✅ `currency` | ✅ `exchange_rate` | CNY/USD/EUR |
| 出库单 | ✅ `currency` | ❌ | CNY/USD/EUR |
| 报价单 | ✅ `currency` | ❌ | CNY/USD/EUR |
| 对账单 | ✅ `currency`（在明细行） | ❌ | CNY |
| 毛利表 | ❌ | ❌ | — |

### 1.2 现有问题

1. **币种选项硬编码**：每个表单中 `CNY/USD/EUR` 是写死在模板里的，新增币种需要改多个文件
2. **无汇率集中管理**：汇率由用户在每个订单中手动填写，没有统一的汇率维护
3. **缺少港币(HKD)**：用户需要港币支持，但当前系统未提供
4. **汇率不一致**：同一日期同一币种在不同订单中可能填写不同的汇率（需通过系统自动填入解决）
5. **无汇率历史**：无法追溯某一时期的汇率是多少
6. **毛利表无币种维度**：毛利计算未考虑多币种汇率换算

---

## 二、功能设计（参照金蝶云星辰）

### 2.1 功能概览

```
系统设置
├── 币种管理          ← 新增：基础数据维护
│   ├── 币种列表（增删改查）
│   ├── 设置记账本位币（默认 CNY）
│   └── 币种精度设置（小数位数）
│
└── 汇率管理          ← 新增：核心功能
    ├── 汇率维护列表（按周展示）
    ├── 新增/编辑汇率
    ├── 批量维护汇率（推荐，一次性维护一周所有币种）
    └── 汇率历史查询
```

### 2.2 币种管理

#### 2.2.1 数据模型：`currencies`

| 字段 | 类型 | 说明 |
|------|------|------|
| `currency_id` | VARCHAR(36) | 主键 UUID |
| `currency_code` | VARCHAR(10) | 币种代码（CNY/USD/EUR/HKD） |
| `currency_name` | VARCHAR(50) | 币种名称（人民币/美元/欧元/港币） |
| `currency_symbol` | VARCHAR(10) | 货币符号（¥/$/€/HK$） |
| `decimal_places` | INT | 小数位数（默认2） |
| `is_base_currency` | TINYINT(1) | 是否为记账本位币（0/1） |
| `is_active` | TINYINT(1) | 是否启用（0/1） |
| `sort_order` | INT | 排序序号 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

#### 2.2.2 预置数据

```sql
INSERT INTO currencies (currency_code, currency_name, currency_symbol, decimal_places, is_base_currency, is_active, sort_order) VALUES
('CNY', '人民币', '¥',  2, 1, 1, 1),
('HKD', '港币',   'HK$', 2, 0, 1, 2),
('USD', '美元',   '$',  2, 0, 1, 3),
('EUR', '欧元',   '€',  2, 0, 1, 4);
```

#### 2.2.3 功能要点

- 记账本位币只能有一个（默认 CNY），修改时需确认
- 币种代码不可修改（作为外键被其他表引用）
- 停用的币种不出现在下拉选择中，但历史数据保留
- 提供 `is_active=1` 的币种列表 API，供所有表单的币种下拉使用

### 2.3 汇率管理

#### 2.3.1 数据模型：`exchange_rates`

| 字段 | 类型 | 说明 |
|------|------|------|
| `exchange_rate_id` | VARCHAR(36) | 主键 UUID |
| `source_currency` | VARCHAR(10) | 源币种（如 USD） |
| `target_currency` | VARCHAR(10) | 目标币种（如 CNY） |
| `rate` | DECIMAL(12,6) | 汇率（如 7.245000） |
| `effective_week` | DATE | 生效周（存储该周的周一日期） |
| `remarks` | VARCHAR(255) | 备注 |
| `created_by` | VARCHAR(50) | 创建人 |
| `created_at` | DATETIME | 创建时间 |
| `updated_at` | DATETIME | 更新时间 |

**唯一约束**：`(source_currency, target_currency, effective_week)`

#### 2.3.2 设计理念（参照金蝶云星辰）

| 特性 | 说明 |
|------|------|
| **本位币基准** | 所有汇率均为"外币 → 本位币(CNY)"的直接标价法 |
| **按周维护** | 每个币种每周维护一个汇率（以周一为该周标识日期） |
| **取最新汇率** | 订单日期自动匹配所属周的汇率；若该周未维护则取最近一周的汇率 |
| **系统自动填入** | 汇率由系统根据订单日期自动填入，用户不可手动修改，确保数据一致性 |
| **历史可追溯** | 保留所有历史汇率，可按周范围查询 |

#### 2.3.3 预置汇率示例

```
2026-09-01 (W36):  USD → CNY = 7.245000
2026-09-01 (W36):  HKD → CNY = 0.928000
2026-09-01 (W36):  EUR → CNY = 7.892000
```

### 2.4 汇率维护页面设计

#### 2.4.1 汇率列表页

```
┌──────────────────────────────────────────────────────────────────────┐
│ 汇率管理                                                   [新增汇率] │
├──────────────────────────────────────────────────────────────────────┤
│ 筛选条件:                                                            │
│ 币种: [全部 ▼]  周范围: [____-__-__] ~ [____-__-__]  [查询] [重置]    │
├──────────────────────────────────────────────────────────────────────┤
│ 序号 │ 源币种 │ 源币种名称 │ 目标币种 │ 汇率     │ 生效周       │ 操作     │
│ ────│──────│────────│────────│────────│────────────│────────│
│  1  │ USD  │ 美元     │ CNY    │ 7.2450 │09-01(W36)  │编辑│删除│
│  2  │ HKD  │ 港币     │ CNY    │ 0.9280 │09-01(W36)  │编辑│删除│
│  3  │ EUR  │ 欧元     │ CNY    │ 7.8920 │09-01(W36)  │编辑│删除│
│  4  │ USD  │ 美元     │ CNY    │ 7.2500 │08-25(W35)  │编辑│删除│
│  ...│      │          │        │        │            │        │
├──────────────────────────────────────────────────────────────────────┤
│ 共 N 条记录  < 1 2 3 ... >  每页 [20] 条                            │
└──────────────────────────────────────────────────────────────────────┘
```

#### 2.4.2 新增/编辑汇率弹窗

```
┌──────────────────────────────────────┐
│            新增汇率                   │
├──────────────────────────────────────┤
│ 源币种:    [USD        ▼] *          │
│ 目标币种:  [CNY        ▼] (默认本位币)│
│ 汇率:      [7.245     ] *            │
│ 生效周:    [2026-09-01] *            │
│ 备注:      [                    ]    │
├──────────────────────────────────────┤
│ 注:生效周选择日期后自动对齐到该周的周一│
├──────────────────────────────────────┤
│        [取消]  [保存]                │
└──────────────────────────────────────┘
```

#### 2.4.3 批量维护功能（参照金蝶批量填汇率）

```
┌─────────────────────────────────────────────────────────────────┐
│ 批量维护汇率                                                     │
├─────────────────────────────────────────────────────────────────┤
│ 生效周: [2026-09-01] (W36)                                      │
├─────────────────────────────────────────────────────────────────┤
│ 币种   │ 名称   │ 汇率        │ 上周汇率   │ 变动率 │ 备注     │
│ ─────│──────│──────────│──────────│──────│────────│
│ USD  │ 美元   │ [7.245   ] │ 7.2500   │-0.07%│          │
│ HKD  │ 港币   │ [0.928   ] │ 0.9300   │-0.22%│          │
│ EUR  │ 欧元   │ [7.892   ] │ 7.8800   │+0.15%│          │
├─────────────────────────────────────────────────────────────────┤
│                    [取消]  [批量保存]                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、API 设计

### 3.1 币种管理 API

```
GET    /api/currencies              获取所有币种（支持 ?active=1 过滤启用的）
GET    /api/currencies/:id          获取单个币种
POST   /api/currencies              新增币种
PUT    /api/currencies/:id          编辑币种
DELETE /api/currencies/:id          删除币种（仅未被引用时可删）
```

### 3.2 汇率管理 API

```
GET    /api/exchange-rates              获取汇率列表（支持分页、筛选）
         ?sourceCurrency=USD
         &startWeek=2026-01-05          (周一日期)
         &endWeek=2026-12-28            (周一日期)
         &page=1&pageSize=20

GET    /api/exchange-rates/latest       获取最新汇率（供订单表单调用）
         ?sourceCurrency=USD
         &date=2026-09-02    (可选，默认当天，自动匹配所属周的周一)
         注: 若该周无汇率记录，则向前查找最近一周的汇率

GET    /api/exchange-rates/batch-latest 批量获取所有币种最新汇率
         ?date=2026-09-02    (可选，默认当天，自动匹配所属周的周一)
         注: 若该周无汇率记录，则向前查找最近一周的汇率

POST   /api/exchange-rates              新增汇率
PUT    /api/exchange-rates/:id          编辑汇率
DELETE /api/exchange-rates/:id          删除汇率
POST   /api/exchange-rates/batch        批量新增/更新汇率
```

### 3.3 接口响应示例

#### 获取最新汇率

**请求**: `GET /api/exchange-rates/latest?sourceCurrency=USD&date=2026-09-02`

**响应**（自动匹配到 2026-09-01 即该周的周一）:
```json
{
  "code": 200,
  "data": {
    "exchange_rate_id": "xxx",
    "source_currency": "USD",
    "target_currency": "CNY",
    "rate": 7.245000,
    "effective_week": "2026-09-01"
  }
}
```

#### 批量获取所有币种最新汇率

**请求**: `GET /api/exchange-rates/batch-latest?date=2026-09-02`

**响应**:
```json
{
  "code": 200,
  "data": [
    { "source_currency": "USD", "rate": 7.245000, "effective_week": "2026-09-01" },
    { "source_currency": "HKD", "rate": 0.928000, "effective_week": "2026-09-01" },
    { "source_currency": "EUR", "rate": 7.892000, "effective_week": "2026-09-01" }
  ]
}
```

---

## 四、现有模块改造方案

### 4.1 币种下拉统一化

**问题**：当前每个表单都硬编码了 `CNY/USD/EUR`。

**改造方案**：

```typescript
// 新增 api/currencies.ts
export const currenciesApi = {
  getActive: () => request.get('/currencies?active=1'),
}

// 各表单中替换硬编码：
// Before:
<a-select-option value="CNY">人民币</a-select-option>
<a-select-option value="USD">美元</a-select-option>
<a-select-option value="EUR">欧元</a-select-option>

// After:
<a-select-option
  v-for="c in currencyOptions"
  :key="c.currency_code"
  :value="c.currency_code"
>
  {{ c.currency_name }} ({{ c.currency_symbol }})
</a-select-option>
```

**涉及文件**：
- `src/components/SalesOrderForm.vue`
- `src/components/PurchaseOrderForm.vue`
- `src/components/WarehousingOrderForm.vue`
- `src/components/DeliveryOrderForm.vue`
- `src/components/QuotationForm.vue`
- `src/components/CustomerForm.vue`
- `src/components/SupplierForm.vue`

### 4.2 汇率自动填充（只读，不可手动修改）

**改造方案**：当用户选择币种和日期后，系统自动调用 API 获取该周汇率并填入，汇率字段设为只读。

```typescript
// 在各订单表单中
const handleCurrencyOrDateChange = async () => {
  if (form.currency && form.currency !== 'CNY' && form.entry_date) {
    try {
      const res = await exchangeRatesApi.getLatest({
        sourceCurrency: form.currency,
        date: form.entry_date.format('YYYY-MM-DD'),
      })
      if (res.data) {
        form.exchange_rate = res.data.rate
      } else {
        // 该周未维护汇率时提示用户
        message.warning('该日期所属周尚未维护汇率，请先到汇率管理中维护')
        form.exchange_rate = null
      }
    } catch {
      message.warning('获取汇率失败，请检查汇率管理中是否已维护该周汇率')
      form.exchange_rate = null
    }
  } else if (form.currency === 'CNY') {
    form.exchange_rate = 1.0
  }
}
```

**模板中汇率字段设为只读**：
```html
<!-- Before: 可手动修改 -->
<a-input-number v-model:value="form.exchange_rate" :min="0" :precision="6" />

<!-- After: 只读，由系统自动填入 -->
<a-input-number v-model:value="form.exchange_rate" :min="0" :precision="6" disabled />
<a-typography-text v-if="form.currency !== 'CNY' && !form.exchange_rate" type="warning">
  请先维护该周的汇率
</a-typography-text>
```

**涉及文件**：
- `src/components/SalesOrderForm.vue`（已有 exchange_rate，改为只读）
- `src/components/PurchaseOrderForm.vue`（已有 exchange_rate，改为只读）
- `src/components/WarehousingOrderForm.vue`（已有 exchange_rate，改为只读）
- `src/components/DeliveryOrderForm.vue`（需新增 exchange_rate，只读）
- `src/components/QuotationForm.vue`（需新增 exchange_rate，只读）

### 4.3 毛利表增加币种/汇率列

**现状**：毛利表没有币种和汇率信息，无法进行多币种毛利计算。

**改造方案**：

1. 毛利表增加列：`币种`、`汇率`
2. 金额计算时可选择是否按本位币（CNY）统一换算
3. 在毛利表的列设置中可控制这些列的显隐
4. 汇率列数据来源于订单中系统自动填入的值（只读展示）

### 4.4 出库单增加汇率字段

**现状**：出库单（delivery_orders）表有 `currency` 字段但没有 `exchange_rate` 字段。

**改造方案**：
1. 数据库 `delivery_orders` 表增加 `exchange_rate` 字段
2. 出库单表单增加汇率展示字段（只读），选币种后由系统自动填入

---

## 五、数据库迁移计划

### 5.1 迁移文件清单

```
server/migrations/
├── 20260902_create_currencies_table.js           # 创建币种表
├── 20260902_create_exchange_rates_table.js        # 创建汇率表
├── 20260902_seed_default_currencies.js            # 预置币种数据
├── 20260902_seed_default_exchange_rates.js        # 预置示例汇率
└── 20260902_add_exchange_rate_to_delivery_orders.js  # 出库单增加汇率字段
```

### 5.2 迁移详情

#### 5.2.1 创建 currencies 表

```sql
CREATE TABLE IF NOT EXISTS currencies (
  currency_id VARCHAR(36) PRIMARY KEY,
  currency_code VARCHAR(10) NOT NULL UNIQUE,
  currency_name VARCHAR(50) NOT NULL,
  currency_symbol VARCHAR(10) NOT NULL,
  decimal_places INT DEFAULT 2,
  is_base_currency TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 5.2.2 创建 exchange_rates 表

```sql
CREATE TABLE IF NOT EXISTS exchange_rates (
  exchange_rate_id VARCHAR(36) PRIMARY KEY,
  source_currency VARCHAR(10) NOT NULL,
  target_currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
  rate DECIMAL(12,6) NOT NULL,
  effective_week DATE NOT NULL COMMENT '生效周（存储该周的周一日期）',
  remarks VARCHAR(255) DEFAULT NULL,
  created_by VARCHAR(50) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_currency_week (source_currency, target_currency, effective_week),
  INDEX idx_effective_week (effective_week),
  INDEX idx_source_currency (source_currency)
);
```

#### 5.2.3 出库单增加汇率字段

```sql
ALTER TABLE delivery_orders ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT NULL COMMENT '汇率';
```

---

## 六、文件结构规划

### 6.1 新增文件

```
src/
├── api/
│   ├── currencies.ts              # 币种 API
│   └── exchangeRates.ts           # 汇率 API
├── views/
│   └── settings/                  # 系统设置目录（新增）
│       ├── Currencies.vue         # 币种管理页面
│       └── ExchangeRates.vue      # 汇率管理页面
├── types/
│   └── index.ts                   # 增加 Currency、ExchangeRate 类型
└── locales/
    └── index.ts                   # 增加币种/汇率相关多语言

server/
├── models/
│   ├── Currency.js               # 币种模型
│   └── ExchangeRate.js           # 汇率模型
├── controllers/
│   ├── currencyController.js     # 币种控制器
│   └── exchangeRateController.js # 汇率控制器
├── routes/
│   └── index.js                  # 增加币种和汇率路由
└── migrations/
    ├── 20260902_create_currencies_table.js
    ├── 20260902_create_exchange_rates_table.js
    ├── 20260902_seed_default_currencies.js
    ├── 20260902_seed_default_exchange_rates.js
    └── 20260902_add_exchange_rate_to_delivery_orders.js
```

### 6.2 修改文件

```
src/
├── components/
│   ├── SalesOrderForm.vue        # 币种下拉改为动态 + 汇率自动填入（只读）
│   ├── PurchaseOrderForm.vue     # 币种下拉改为动态 + 汇率自动填入（只读）
│   ├── WarehousingOrderForm.vue  # 币种下拉改为动态 + 汇率自动填入（只读）
│   ├── DeliveryOrderForm.vue     # 币种下拉改为动态 + 新增汇率字段（只读）
│   ├── QuotationForm.vue         # 币种下拉改为动态 + 新增汇率字段（只读）
│   ├── CustomerForm.vue          # 币种下拉改为动态（增加 HKD）
│   └── SupplierForm.vue          # 币种下拉改为动态（增加 HKD）
├── views/
│   ├── reports/ProfitReport.vue  # 增加币种/汇率列
│   └── settings/                 # 新增设置目录
└── router/
    └── index.ts                  # 增加设置页面路由

server/
└── routes/
    └── index.js                  # 增加币种和汇率路由
```

---

## 七、菜单/路由规划

### 7.1 菜单结构

```
系统设置（新增一级菜单）
├── 币种管理      /settings/currencies
└── 汇率管理      /settings/exchange-rates
```

### 7.2 路由配置

```typescript
{
  path: '/settings',
  name: 'Settings',
  meta: { title: '系统设置', icon: 'SettingOutlined' },
  children: [
    {
      path: 'currencies',
      name: 'Currencies',
      component: () => import('@/views/settings/Currencies.vue'),
      meta: { title: '币种管理' },
    },
    {
      path: 'exchange-rates',
      name: 'ExchangeRates',
      component: () => import('@/views/settings/ExchangeRates.vue'),
      meta: { title: '汇率管理' },
    },
  ],
}
```

---

## 八、实施步骤

### 阶段一：基础数据（币种管理）

1. 创建 `currencies` 表和迁移文件
2. 创建币种 Model、Controller、API 路由
3. 创建币种管理前端页面（列表 + 新增/编辑表单）
4. 预置 CNY/HKD/USD/EUR 数据
5. 创建前端 `currencies.ts` API 模块
6. 将所有表单中的硬编码币种替换为动态加载

### 阶段二：汇率管理

1. 创建 `exchange_rates` 表和迁移文件
2. 创建汇率 Model、Controller、API 路由
3. 创建汇率管理前端页面（列表 + 新增/编辑 + 批量维护）
4. 创建前端 `exchangeRates.ts` API 模块
5. 出库单增加 `exchange_rate` 数据库字段

### 阶段三：各模块集成

1. 改造销售订单表单：币种动态 + 汇率自动填入（只读）
2. 改造采购订单表单：币种动态 + 汇率自动填入（只读）
3. 改造入库单表单：币种动态 + 汇率自动填入（只读）
4. 改造出库单表单：币种动态 + 新增汇率字段（只读）
5. 改造报价单表单：币种动态 + 新增汇率字段（只读）
6. 改造客户/供应商表单：币种动态（增加 HKD）

### 阶段四：报表优化

1. 毛利表增加币种/汇率列
2. 毛利表支持按本位币换算汇总
3. 各报表导出时包含币种/汇率信息

---

## 九、注意事项

1. **向下兼容**：现有订单中的 `currency` 和 `exchange_rate` 字段保持不变，仅新增功能
2. **默认值处理**：币种未选择时默认 CNY，汇率默认 1.0
3. **精度要求**：汇率存储精度为6位小数（DECIMAL(12,6)），金额显示精度为4位小数
4. **并发处理**：同一币种同一周的汇率使用唯一约束，避免重复
5. **缓存策略**：币种列表变化少，可适当缓存；汇率变化频繁，不缓存
6. **删除限制**：已被订单引用的汇率不可删除，只能修改
7. **周对齐规则**：`effective_week` 始终存储该周的周一日期，用户选择任意日期后系统自动对齐到周一
8. **汇率只读**：订单中的汇率字段为系统自动填入，用户不可手动修改，确保全系统汇率一致性
9. **未维护汇率处理**：当订单日期所属周未维护汇率时，系统给出提示，阻止提交（需先到汇率管理中维护）
10. **CNY 特殊处理**：当币种为 CNY（本位币）时，汇率固定为 1.0，无需查询汇率表
