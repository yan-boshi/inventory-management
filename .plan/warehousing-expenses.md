# 入库单费用登记功能实现规划

## 需求概述
为入库单增加四种费用登记功能：快递费、运杂费、报关费、其他

## 数据库更新
1. 修改 `init.sql` 文件，在 `warehousing_orders` 表添加 `expenses` 字段
```sql
ALTER TABLE warehousing_orders
ADD COLUMN expenses TEXT COMMENT '入库费用登记JSON字符串';
```

## 后端实现
1. 更新 `WarehousingOrder` 模型，支持 expenses 字段
2. 更新创建和更新接口，处理 expenses 数据

## 前端实现
### 1. WarehousingOrderForm.vue
- 在入库时间下面添加四个费用输入框，水平排列
- 每个费用输入框支持数字输入
- 在计算总计时，可将费用计入

### 2. WarehousingOrderDetail.vue
- 在备注前面显示费用信息
- 以标签形式展示四种费用

### 3. WarehousingOrderPrint.vue
- 在打印模板中添加费用信息展示

## 实现步骤
1. 数据库表结构更新
2. 后端接口支持
3. 前端表单修改
4. 前端详情页修改
5. 打印模板修改
6. 测试验证

## 注意事项
- expenses 字段格式：JSON 字符串，包含四种费用类型
- 费用为可选字段，默认为 0
- 需要输入验证，确保输入为数字