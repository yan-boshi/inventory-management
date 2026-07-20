# 应收账款表
## 数据库表结构（receivable）
 - receivable_id：主键，自增
 - customer_id：客户ID，外键，关联客户表
 - source_bill_type：来源单据类型，1 = 出库单，2 = 销售退货单
 - source_bill_id：来源单据的合同编号，外键，关联销售出库单的销售合同编号或销售退货单的销售退货合同编号（暂无退货单业务）
 - amount：应收金额
 - received_amount：已收金额
 - balance_amount：未收余额
 - due_date：结算日期
 - status：状态，枚举值，可选值为0未核销 1部分核销 2已核销
 - create_time：创建时间，默认当前时间
 - update_time：更新时间，默认当前时间
- 
# 应付账款表
## 数据库表结构（payable）
 - payable_id：主键，自增
 - supplier_id：供应商ID，外键，关联供应商表
 - source_bill_type：来源单据类型，1 = 入库单，2 = 采购退货单
 - source_bill_id：来源单据的合同编号，外键，关联入库单的入库合同编号或采购退货单的采购退货合同编号（暂无退货单业务）
 - amount：应收金额
 - received_amount：已收金额
 - balance_amount：未收余额
 - due_date：结算日期
 - status：状态，枚举值，可选值为0未核销 1部分核销 2已核销
 - create_time：创建时间，默认当前时间
 - update_time：更新时间，默认当前时间