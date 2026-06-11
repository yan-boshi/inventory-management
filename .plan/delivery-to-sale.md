# 出库单转销售订单功能实现计划

## 需求概述

在出库单详情页添加"转销售订单"功能，允许用户将出库单快速转换为销售订单，自动填充相关数据，减少重复录入。

## 现状分析

### 已有基础
1. `DeliveryOrderDetail.vue` 已有"转销售订单"按钮（第74-82行）
2. `handleConvertToSales` 函数已定义但未实现（第208-210行）
3. `SalesOrderForm.vue` 已支持从报价单转换数据的逻辑（第813-823行）

### 数据结构对比

| 出库单字段 | 销售订单字段 | 映射说明 |
|-----------|-------------|---------|
| order_number | - | 出库单编号，可作为备注参考 |
| sales_order_number | - | 关联的销售订单编号（如有） |
| customer_name | customer_name | 直接映射 |
| - | customer_code | 需要通过客户名称查询 |
| delivery_items | sales_items | 需要转换结构 |
| currency | currency | 直接映射 |
| delivery_date | delivery_date | 直接映射 |
| total_amount | tax_included_amount | 直接映射 |
| remarks | remarks | 直接映射 |

### delivery_items -> sales_items 字段映射

| delivery_items 字段 | sales_items 字段 | 转换逻辑 |
|-------------------|-----------------|---------|
| product_code | product_code | 直接映射 |
| product_name | product_name | 直接映射 |
| specification | description | 映射到规格描述 |
| - | model | 需要从产品表查询 |
| unit | unit | 直接映射 |
| quantity | quantity | 直接映射 |
| price | tax_included_price | 映射为含税单价 |
| - | tax_rate | 默认为0，用户可手动调整 |
| - | business_category | 需要用户手动选择 |
| remarks | remarks | 直接映射 |

## 实现方案

### 方案设计

采用**弹窗内嵌销售订单表单**的方式，在出库单详情页点击"转销售订单"后，打开销售订单创建弹窗并预填充数据。

### 优点
1. 复用现有的 `SalesOrderForm` 组件
2. 用户可以在转换前进行必要的调整
3. 保持一致的用户体验
4. 代码改动量小

## 功能拆解

### 阶段1：基础功能实现

#### 任务1.1：在 DeliveryOrderDetail 中引入 SalesOrderForm
- 文件：`src/components/DeliveryOrderDetail.vue`
- 修改内容：
  1. 导入 `SalesOrderForm` 组件
  2. 添加 `salesFormVisible`、`salesOrderData` 状态变量
  3. 在模板中添加 `<SalesOrderForm>` 组件

#### 任务1.2：实现 handleConvertToSales 函数
- 文件：`src/components/DeliveryOrderDetail.vue`
- 修改内容：
  1. 实现数据转换逻辑
  2. 处理客户信息查询
  3. 处理商品信息转换
  4. 打开销售订单表单

#### 任务1.3：修改 SalesOrderForm 支持出库单数据
- 文件：`src/components/SalesOrderForm.vue`
- 修改内容：
  1. 在 watch 中添加对出库单数据的处理
  2. 识别 `deliveryOrderNumber` 标识
  3. 预填充表单数据

### 阶段2：数据完善

#### 任务2.1：客户代码查询
- 在转换时根据客户名称查询客户代码
- 使用 `customersApi.getAll({ name: customerName })`

#### 任务2.2：产品型号查询
- 在转换时根据产品名称查询产品型号
- 使用 `productsApi.getAll({ name: productName })`

#### 任务2.3：业务分类处理
- 默认业务分类为空，提示用户手动选择
- 或根据产品信息自动填充默认分类

### 阶段3：用户体验优化

#### 任务3.1：添加转换确认弹窗
- 在转换前显示确认弹窗
- 提示用户将创建新的销售订单

#### 任务3.2：添加加载状态
- 在数据查询和转换过程中显示加载状态
- 防止重复点击

#### 任务3.3：错误处理
- 处理客户查询失败的情况
- 处理产品查询失败的情况
- 显示友好的错误提示

## 详细实现步骤

### 步骤1：修改 DeliveryOrderDetail.vue

```vue
<!-- 添加导入 -->
<script setup lang="ts">
import SalesOrderForm from './SalesOrderForm.vue'
import { customersApi } from '@/api/customers'
import { productsApi } from '@/api/products'

// 添加状态
const salesFormVisible = ref(false)
const salesOrderData = ref<any>(undefined)

// 实现转换函数
const handleConvertToSales = async () => {
  if (!props.order) return

  Modal.confirm({
    title: '确认转换',
    content: `确定要将出库单 ${props.order.order_number} 转换为销售订单吗？`,
    okText: '确认',
    cancelText: '取消',
    onOk: async () => {
      try {
        // 1. 查询客户信息
        let customerCode = ''
        if (props.order.customer_name) {
          const customers = await customersApi.getAll({ name: props.order.customer_name })
          if (customers.data && customers.data.length > 0) {
            customerCode = customers.data[0].customer_code || ''
          }
        }

        // 2. 转换商品数据
        let deliveryItems = []
        try {
          deliveryItems = JSON.parse(props.order.delivery_items || '[]')
        } catch {
          deliveryItems = []
        }

        // 查询产品信息获取型号
        const salesItems = await Promise.all(
          deliveryItems.map(async (item: any, index: number) => {
            let model = ''
            if (item.product_name) {
              const products = await productsApi.getAll({ name: item.product_name })
              if (products.data && products.data.length > 0) {
                model = products.data[0].model || ''
              }
            }

            return {
              no: index + 1,
              business_category: '',
              product_name: item.product_name || '',
              product_code: item.product_code || '',
              model: model,
              description: item.specification || '',
              unit: item.unit || '',
              quantity: item.quantity || 1,
              outbound_quantity: 0,
              tax_rate: 0,
              tax_included_price: item.price || 0,
              tax_excluded_price: item.price || 0,
              tax_included_amount: (item.quantity || 1) * (item.price || 0),
              tax_excluded_amount: (item.quantity || 1) * (item.price || 0),
              tax_amount: 0,
              status: 1,
              remarks: item.remarks || '',
            }
          })
        )

        // 3. 设置销售订单数据
        salesOrderData.value = {
          deliveryOrderNumber: props.order.order_number,
          customer_name: props.order.customer_name,
          customer_code: customerCode,
          currency: props.order.currency || 'CNY',
          delivery_date: props.order.delivery_date,
          tax_included_amount: props.order.total_amount,
          remarks: props.order.remarks || '',
          sales_items: salesItems,
        }

        // 4. 打开销售订单表单
        salesFormVisible.value = true
      } catch (error) {
        console.error('转换失败:', error)
        message.error('转换失败，请重试')
      }
    },
  })
}
</script>

<!-- 添加模板 -->
<template>
  <!-- 现有内容 -->

  <!-- 销售订单表单弹窗 -->
  <SalesOrderForm
    v-model:visible="salesFormVisible"
    :isEdit="false"
    :salesOrderData="salesOrderData"
    @success="handleSalesSuccess"
  />
</template>
```

### 步骤2：修改 SalesOrderForm.vue

在 watch 中添加对出库单数据的处理：

```typescript
watch(
  () => props.visible,
  visible => {
    if (visible) {
      if (!props.isEdit) {
        // 从报价单转换的情况
        if (props.salesOrderData?.quotation_number) {
          // 现有逻辑...
        }
        // 从出库单转换的情况
        else if (props.salesOrderData?.deliveryOrderNumber) {
          getNewSalesOrderNumber()
          form.customer_name = props.salesOrderData.customer_name
          form.customer_code = props.salesOrderData.customer_code
          form.currency = props.salesOrderData.currency || 'CNY'
          form.payment_method = ''
          form.remarks = `来自出库单: ${props.salesOrderData.deliveryOrderNumber}`
          form.sales_items = props.salesOrderData.sales_items || []
        }
        else {
          getNewSalesOrderNumber()
          resetForm()
        }
      }
      // 现有编辑逻辑...
    }
  }
)
```

### 步骤3：添加成功回调

```typescript
const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
  print: [data: any]
  convertSuccess: [] // 新增
}>()

const handleSalesSuccess = () => {
  emit('convertSuccess')
  // 可选：关闭详情弹窗
  emit('update:visible', false)
}
```

## 性能优化

### 1. 批量查询优化
- 使用 `Promise.all` 并行查询产品信息
- 避免逐个查询导致的性能问题

### 2. 数据缓存
- 考虑缓存客户和产品查询结果
- 减少重复查询

### 3. 错误处理
- 单个产品查询失败不应阻止整个转换流程
- 使用默认值填充失败的字段

## 测试场景

### 场景1：正常转换
1. 打开出库单详情
2. 点击"转销售订单"
3. 确认转换
4. 验证销售订单表单数据正确填充
5. 保存销售订单
6. 验证销售订单创建成功

### 场景2：带关联销售订单的出库单
1. 打开已关联销售订单的出库单详情
2. 验证"转销售订单"按钮不显示（或显示提示）

### 场景3：数据缺失处理
1. 出库单缺少客户名称
2. 出库单商品缺少产品名称
3. 验证系统能正确处理并提示

### 场景4：用户取消转换
1. 点击"转销售订单"
2. 在确认弹窗中点击"取消"
3. 验证无任何变化

## 相关文件

| 文件 | 修改类型 | 说明 |
|------|---------|------|
| `src/components/DeliveryOrderDetail.vue` | 修改 | 添加转换逻辑和表单引用 |
| `src/components/SalesOrderForm.vue` | 修改 | 支持出库单数据预填充 |
| `src/types/index.ts` | 可能修改 | 如需添加新的类型定义 |

## 注意事项

1. **数据一致性**：确保转换后的数据类型与销售订单表单期望的类型一致
2. **空值处理**：所有字段都需要处理 null 或 undefined 的情况
3. **用户提示**：在转换过程中提供清晰的提示信息
4. **业务规则**：如果出库单已关联销售订单，应提示用户而非允许重复创建
5. **日志记录**：在关键步骤添加 console.log 便于调试

## 后续扩展（可选）

1. **反向关联**：在销售订单中记录来源出库单编号
2. **批量转换**：支持选择多个出库单批量转换
3. **模板功能**：保存常用的转换配置为模板
4. **历史记录**：记录转换操作的历史日志
