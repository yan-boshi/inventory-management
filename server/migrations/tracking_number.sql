-- 为入库表添加快递单号列
ALTER TABLE warehousing_orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL COMMENT '快递单号' AFTER entry_date;

-- 为出库表添加快递单号列
ALTER TABLE delivery_orders ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL COMMENT '快递单号' AFTER expenses;
inventory_20260626_020001.sql