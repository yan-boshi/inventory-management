-- 在 warehousing_orders 表中新增 exchange_rate 列
ALTER TABLE warehousing_orders ADD COLUMN exchange_rate DECIMAL(10,4) DEFAULT NULL COMMENT '汇率';
