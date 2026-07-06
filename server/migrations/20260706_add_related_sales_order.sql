-- 采购订单表新增关联销售订单ID列
ALTER TABLE purchase_orders
ADD COLUMN related_sales_order_id VARCHAR(36) DEFAULT NULL
COMMENT '关联销售订单ID';

-- 添加索引
ALTER TABLE purchase_orders
ADD INDEX idx_related_sales_order_id (related_sales_order_id);
