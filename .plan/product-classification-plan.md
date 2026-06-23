# 产品分类功能实现规划

## 功能概述

实现产品分类的三级树形结构管理，支持一级分类、二级分类、三级分类的增删改查操作。每条产品分类记录存储一个完整的分类树（JSON格式）。

## 数据结构示例

```json
{
  "电子产品": {
    "手机": {
      "智能手机": "智能手机",
      "功能手机": "功能手机"
    },
    "电脑": {
      "笔记本": "笔记本",
      "台式机": "台式机"
    }
  },
  "办公用品": {
    "文具": {
      "笔": "笔",
      "纸张": "纸张"
    }
  }
}
```

---

## 一、数据库层

### 新增表：product_classifications

```sql
CREATE TABLE product_classifications (
  product_classification_id VARCHAR(36) PRIMARY KEY,
  classification_name VARCHAR(100) NOT NULL COMMENT '分类方案名称',
  classification_data TEXT NOT NULL COMMENT '分类数据（JSON字符串）',
  description VARCHAR(500) DEFAULT NULL COMMENT '分类描述',
  creator VARCHAR(50) DEFAULT NULL COMMENT '创建人',
  remarks TEXT DEFAULT NULL COMMENT '备注',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_classification_name (classification_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='产品分类表';
```

**字段说明：**
- `product_classification_id`：UUID主键
- `classification_name`：分类方案名称（如"标准产品分类"、"按行业分类"等），用于区分不同的分类方案
- `classification_data`：三级分类树的JSON字符串
- `description`：对整个分类方案的描述
- `creator`：创建人
- `remarks`：备注信息

**修改文件：** `server/init.sql` — 在 `business_categories` 表之后新增建表语句

---

## 二、后端层

### 2.1 Model：`server/models/ProductClassification.js`（新增）

- 继承 `BaseModel`，表名 `product_classifications`，主键 `product_classification_id`
- `create()` 方法生成UUID，设置默认值
- `update()` 方法中，若 `classification_data` 为对象则自动 `JSON.stringify()`

### 2.2 Controller：`server/controllers/productClassificationController.js`（新增）

**接口列表：**

| 接口 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 获取分类列表（分页） | GET | `/api/product-classifications` | 支持按classification_name搜索 |
| 获取所有分类（下拉） | GET | `/api/product-classifications/list` | 轻量级，用于下拉选择 |
| 获取单个分类详情 | GET | `/api/product-classifications/:id` | 包含完整的classification_data |
| 创建分类 | POST | `/api/product-classifications` | 创建新的分类方案 |
| 更新分类 | PUT | `/api/product-classifications/:id` | 更新整个分类方案（包括树结构） |
| 删除分类 | DELETE | `/api/product-classifications/:id` | 删除整个分类方案 |
| 新增一级分类 | POST | `/api/product-classifications/:id/level1` | 在已有记录中新增一级分类 |
| 编辑一级分类 | PUT | `/api/product-classifications/:id/level1/:oldName` | 修改一级分类名称 |
| 删除一级分类 | DELETE | `/api/product-classifications/:id/level1/:name` | 删除一级分类及其下所有子分类 |
| 新增二级分类 | POST | `/api/product-classifications/:id/level1/:level1Name/level2` | 在指定一级分类下新增二级分类 |
| 编辑二级分类 | PUT | `/api/product-classifications/:id/level1/:level1Name/level2/:oldName` | 修改二级分类名称 |
| 删除二级分类 | DELETE | `/api/product-classifications/:id/level1/:level1Name/level2/:name` | 删除二级分类及其下所有三级分类 |
| 新增三级分类 | POST | `/api/product-classifications/:id/level1/:level1Name/level2/:level2Name/level3` | 在指定二级分类下新增三级分类 |
| 编辑三级分类 | PUT | `/api/product-classifications/:id/level1/:level1Name/level2/:level2Name/level3/:oldName` | 修改三级分类名称 |
| 删除三级分类 | DELETE | `/api/product-classifications/:id/level1/:level1Name/level2/:level2Name/level3/:name` | 删除三级分类 |

**业务逻辑：**
- 创建/更新时验证 `classification_data` 的JSON格式合法性
- 各级分类名称不能为空，同级下不能重名
- 删除上级分类时，自动删除所有下级分类
- URL中的中文名称需要进行 `encodeURIComponent` 编码/解码

### 2.3 Routes：`server/routes/productClassificationRoutes.js`（新增）

- 基础CRUD路由：`authMiddleware + advancedOrAdmin`
- 树节点操作路由：`authMiddleware + advancedOrAdmin`
- 下拉列表路由：`authMiddleware`（所有登录用户可用）

### 2.4 注册路由：`server/index.js`（修改）

```js
import productClassificationRoutes from './routes/productClassificationRoutes.js'
// ... 在现有路由之后添加
app.use('/api/product-classifications', productClassificationRoutes)
```

---

## 三、前端层

### 3.1 Types：`src/types/index.ts`（修改）

新增以下类型定义：

```typescript
// 分类树节点类型
export interface ClassificationTree {
  [level1Name: string]: {
    [level2Name: string]: {
      [level3Name: string]: string
    }
  }
}

// 产品分类实体
export interface ProductClassification {
  product_classification_id: string
  classification_name: string
  classification_data: ClassificationTree
  description?: string
  creator?: string
  remarks?: string
  created_at: string
  updated_at: string
}

// 创建请求
export interface CreateProductClassificationRequest {
  classification_name: string
  classification_data?: ClassificationTree
  description?: string
  remarks?: string
}

// 更新请求
export interface UpdateProductClassificationRequest {
  classification_name?: string
  classification_data?: ClassificationTree
  description?: string
  remarks?: string
}

// 查询参数
export interface ProductClassificationQueryParams {
  page?: number
  pageSize?: number
  name?: string
}

// 下拉选项
export interface ProductClassificationOption {
  product_classification_id: string
  classification_name: string
}
```

### 3.2 API：`src/api/productClassification.ts`（新增）

```typescript
export const productClassificationApi = {
  // 基础CRUD
  getAll: (params) => instance.get('/product-classifications', { params }),
  getAllList: () => instance.get('/product-classifications/list'),
  getById: (id) => instance.get(`/product-classifications/${id}`),
  create: (data) => instance.post('/product-classifications', data),
  update: (id, data) => instance.put(`/product-classifications/${id}`, data),
  delete: (id) => instance.delete(`/product-classifications/${id}`),

  // 一级分类操作
  addLevel1: (id, data) => instance.post(`/product-classifications/${id}/level1`, data),
  updateLevel1: (id, oldName, newName) => instance.put(`/product-classifications/${id}/level1/${encodeURIComponent(oldName)}`, { new_name: newName }),
  deleteLevel1: (id, name) => instance.delete(`/product-classifications/${id}/level1/${encodeURIComponent(name)}`),

  // 二级分类操作
  addLevel2: (id, level1Name, data) => instance.post(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2`, data),
  updateLevel2: (id, level1Name, oldName, newName) => instance.put(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(oldName)}`, { new_name: newName }),
  deleteLevel2: (id, level1Name, name) => instance.delete(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(name)}`),

  // 三级分类操作
  addLevel3: (id, level1Name, level2Name, data) => instance.post(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(level2Name)}/level3`, data),
  updateLevel3: (id, level1Name, level2Name, oldName, newName) => instance.put(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(level2Name)}/level3/${encodeURIComponent(oldName)}`, { new_name: newName }),
  deleteLevel3: (id, level1Name, level2Name, name) => instance.delete(`/product-classifications/${id}/level1/${encodeURIComponent(level1Name)}/level2/${encodeURIComponent(level2Name)}/level3/${encodeURIComponent(name)}`),
}
```

### 3.3 View：`src/views/products/ProductClassifications.vue`（新增）

**页面布局：**
- 顶部：标题"产品分类管理" + "新增产品分类"按钮
- 搜索栏：按分类方案名称搜索
- 表格列：分类方案名称、描述、创建人、创建时间、操作（编辑/删除/管理分类）

**交互：**
- 点击"管理分类"跳转到分类详情页（或打开详情弹窗）
- 新增/编辑产品分类方案使用弹窗表单（含分类名称、描述、备注）

### 3.4 Detail Component：`src/components/ProductClassificationDetail.vue`（新增）

**布局设计（树形展示）：**

```
┌─────────────────────────────────────────────────────────┐
│  分类方案名称：XXX                    [返回] [搜索框]     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │ ▼ 一级分类1                    [+二级] [编辑] [删除]  ││
│  │   ▼ 二级分类1                  [+三级] [编辑] [删除]  ││
│  │     ├ 三级分类1                [编辑] [删除]          ││
│  │     └ 三级分类2                [编辑] [删除]          ││
│  │   ▼ 二级分类2                  [+三级] [编辑] [删除]  ││
│  │     └ 三级分类3                [编辑] [删除]          ││
│  │ ▼ 一级分类2                    [+二级] [编辑] [删除]  ││
│  │   └ 二级分类3                  [+三级] [编辑] [删除]  ││
│  │     └ 三级分类4                [编辑] [删除]          ││
│  └─────────────────────────────────────────────────────┘│
│  [+ 新增一级分类]                                          │
└─────────────────────────────────────────────────────────┘
```

**技术实现：**
- 使用 `a-collapse`（折叠面板）实现三级树形展示
- 一级分类作为折叠面板的 header，可展开/折叠
- 二级分类作为嵌套的折叠面板
- 三级分类以列表形式展示
- 每个节点右侧有操作按钮（编辑/删除/添加子分类）
- 搜索功能：前端本地遍历树结构匹配关键词，高亮并自动展开匹配节点

**新增/编辑弹窗：**
- 使用 `a-modal` + `a-input` 实现
- 编辑时回填当前名称
- 新增时验证同级下不能重名

### 3.5 Router：`src/router/index.ts`（修改）

```typescript
{
  path: 'product-classifications',
  name: 'ProductClassifications',
  component: () => import('@/views/products/ProductClassifications.vue'),
  meta: { roles: ['advanced', 'admin'] as UserRole[] }
}
```

### 3.6 Sidebar：`src/layouts/DefaultLayout.vue`（修改）

在"产品管理"菜单项之后新增"产品分类"菜单项：

```vue
<a-menu-item key="ProductClassifications" @click="navigateTo('/product-classifications')" v-if="userStore.isAdvanced">
  <template #icon>
    <AppstoreAddOutlined />
  </template>
  <span>产品分类</span>
</a-menu-item>
```

---

## 四、性能优化考虑

### 4.1 数据量评估
- 产品分类数据量通常较小（几十到几百个分类方案）
- 每个分类方案的JSON数据量有限（通常几KB）
- 不需要复杂的分页优化

### 4.2 缓存策略
- 前端可缓存分类树数据，减少重复请求
- 下拉列表数据可使用 Pinia store 缓存

### 4.3 JSON处理
- 后端存储时使用 `JSON.stringify()`，读取时使用 `JSON.parse()`
- 前端接收后直接使用对象，无需重复解析
- 更新节点时，前端修改对象后整体提交

### 4.4 搜索优化
- 前端实现本地搜索（遍历树结构匹配关键词）
- 避免每次搜索都请求后端

---

## 五、实现步骤

### 第一阶段：基础CRUD
1. 创建数据库表 `product_classifications`（修改 init.sql）
2. 实现后端 Model（ProductClassification.js）
3. 实现后端 Controller（productClassificationController.js）
4. 实现后端 Routes（productClassificationRoutes.js）
5. 注册路由（server/index.js）
6. 实现前端 Types（types/index.ts）
7. 实现前端 API（api/productClassification.ts）
8. 实现产品分类列表页面（ProductClassifications.vue）

### 第二阶段：树形管理
9. 实现分类详情组件（ProductClassificationDetail.vue）— 树形展示
10. 实现各级分类的增删改操作
11. 实现搜索功能（前端本地搜索）

### 第三阶段：集成
12. 新增路由（router/index.ts）
13. 新增侧边栏菜单项（DefaultLayout.vue）
14. 构建验证

---

## 六、新增/修改文件清单

| 文件路径 | 操作 | 说明 |
|----------|------|------|
| `server/init.sql` | 修改 | 新增 product_classifications 建表语句 |
| `server/models/ProductClassification.js` | 新增 | 产品分类 Model |
| `server/controllers/productClassificationController.js` | 新增 | 产品分类 Controller |
| `server/routes/productClassificationRoutes.js` | 新增 | 产品分类 Routes |
| `server/index.js` | 修改 | 注册路由 |
| `src/types/index.ts` | 修改 | 新增类型定义 |
| `src/api/productClassification.ts` | 新增 | API 客户端 |
| `src/views/products/ProductClassifications.vue` | 新增 | 产品分类列表页 |
| `src/components/ProductClassificationDetail.vue` | 新增 | 分类详情/树形管理组件 |
| `src/router/index.ts` | 修改 | 新增路由 |
| `src/layouts/DefaultLayout.vue` | 修改 | 新增菜单项 |
