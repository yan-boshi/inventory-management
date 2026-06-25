-- 将 sales_orders 表中的 delivery_date 列改名为 entry_date
ALTER TABLE sales_orders CHANGE COLUMN delivery_date entry_date DATE DEFAULT NULL COMMENT '录入日期';

-- 在 purchase_orders 表中新增 entry_date 列
ALTER TABLE purchase_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期';

ALTER TABLE warehousing_orders ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期';

-- 删除 purchase_orders 表中的 delivery_date 和 arrival_date 列
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS delivery_date;
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS arrival_date;

-- 在 quotations 表中新增 entry_date 列
ALTER TABLE quotations ADD COLUMN entry_date DATE DEFAULT NULL COMMENT '录入日期';
