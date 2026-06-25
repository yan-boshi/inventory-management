-- 将入库表的 purchase_order_number 列名改为 contract_number
ALTER TABLE warehousing_orders CHANGE COLUMN purchase_order_number contract_number VARCHAR(100) DEFAULT NULL COMMENT '采购合同编号';

-- 将出库表的 sales_order_number 列名改为 contract_number
ALTER TABLE delivery_orders CHANGE COLUMN sales_order_number contract_number VARCHAR(100) DEFAULT NULL COMMENT '销售合同编号';
