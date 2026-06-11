# 采购订单数据库迁移说明

## 概述

本目录包含采购订单功能改造的数据库迁移脚本。

## 迁移脚本

### 1. 主迁移脚本 - `20260509_purchase_orders_refactor.js`

**执行命令：**
```bash
node server/migrations/20260509_purchase_orders_refactor.js
```

**执行内容：**
- 添加 `purchase_items` JSON 字段
- 添加 `status` 字段（1: 采购中, 2: 已到货）
- 将现有单商品数据转换为数组格式
- 备份旧字段（添加 `_old` 后缀）

### 2. 清理备份脚本 - `20260509_purchase_orders_cleanup.js`

**执行命令：**
```bash
node server/migrations/20260509_purchase_orders_cleanup.js
```

**执行条件：** 确认主迁移成功且应用运行正常后执行

**执行内容：**
- 删除所有备份的 `_old` 字段

### 3. 回滚脚本 - `20260509_purchase_orders_rollback.js`

**执行命令：**
```bash
node server/migrations/20260509_purchase_orders_rollback.js
```

**执行条件：** 当主迁移出现问题需要恢复时执行

**执行内容：**
- 删除新增字段
- 恢复备份字段（移除 `_old` 后缀）

## 执行步骤

1. **停止应用服务**
2. **备份数据库**（重要！）
3. **执行主迁移脚本**
4. **启动应用并测试**
5. **确认无误后执行清理脚本**（可选）

## 字段变更

### 新增字段
- `purchase_items` - JSON 类型，存储采购商品数组
- `status` - TINYINT 类型，订单状态（1: 采购中, 2: 已到货）

### 备份字段（添加 _old 后缀）
- `payment_method_old`
- `business_category_old`
- `product_name_old`
- `model_old`
- `description_old`
- `product_code_old`
- `unit_old`
- `quantity_old`
- `tax_rate_old`
- `tax_included_price_old`
- `tax_excluded_price_old`
- `tax_included_amount_old`
- `tax_excluded_amount_old`
- `tax_amount_old`
- `is_returned_old`

## 注意事项

1. 执行迁移前请务必备份数据库
2. 迁移过程会创建事务，出错时会自动回滚
3. 备份字段在确认无误前不要删除
4. 如遇到问题可使用回滚脚本恢复

## 数据结构

### purchase_items JSON 结构
```json
[
  {
    "no": 1,
    "business_category": "分类名称",
    "product_name": "产品名称",
    "product_code": "产品代码",
    "model": "规格型号",
    "description": "规格描述",
    "unit": "单位",
    "quantity": 10,
    "tax_rate": 13,
    "tax_included_price": 100.00,
    "tax_excluded_price": 88.50,
    "tax_included_amount": 1000.00,
    "tax_excluded_amount": 885.00,
    "tax_amount": 115.00,
    "status": 1,
    "remarks": "备注",
    "total_price": 1000.00
  }
]
```
